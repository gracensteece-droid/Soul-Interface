# Soul Interface Build Log — Session 22 (September 6–7)
## Topic: Saturn & Uranus Join the Formation Sequence, a Unified Sun-Synced Pulse System, and a Long Debugging Chain on "The Skip"

---

### What Happened

Working file: `Aion/Frontend/Code/planet-formation-prototype.html`, alongside three isolated single-planet test pages (`jupiter-formation-loop.html`, `saturn-formation-loop.html`, `uranus-formation-loop.html`) and a new tuning-only page built specifically for this session's timing problems (`sun-pulse-sync-test.html`).

Started from a working Jupiter-only formation prototype and built it out into the full Jupiter → Saturn → Uranus sequence (real astrophysical formation order), then spent the back half of the session chasing a recurring "it skips" complaint through several genuinely distinct bugs.

**Build-out (first half of session):**
- Fixed baseline Jupiter issues (texture not loading over `file://`, grid-vs-solid-mesh size mismatch, missing surface texture) — required serving via `python -m http.server 8000` from `Aion/Frontend/Code/` (killed a stray server that was pointed at the wrong root directory).
- Added a materialize "dissolve" reveal (replacing a flat opacity fade) and a "living texture" moving-cloud-band effect on the solid planet surface. Both needed real bug fixes: `jfbm` noise exceeding the revealable range (clamped via `dn = min(jfbm(...), 0.9)`), a pole-pinch/seam artifact in the UV-drift (fixed with `poleDamp = cos(lat*π)` and switching to a bounded oscillation instead of unbounded linear drift), and a `vUv`-never-declared silent shader failure (fixed by giving the material a 1×1 `DataTexture` placeholder from first compile, before the real texture loads async).
- Added a hue-shift control.
- Built Saturn (`saturn-formation-loop.html`) with real ring geometry/texture and correct axial tilt, then merged it into the main prototype alongside Jupiter. Hit and fixed a frustum-culling bug where the small pre-texture-load Saturn mesh was being culled before its shader ever compiled (`frustumCulled = false`).
- Tried making ring-dust particles form Saturn's rings instead of a solid ring mesh — reverted immediately, didn't look good.
- Replaced the plain flat "beam" orbit ring with `index.html`'s actual dual-torus flicker+halo shimmer shader (per-planet colors, same as the real scene), since a flat ring didn't match and the request was specifically "they flicker and have different colors."
- Built Uranus (`uranus-formation-loop.html`, no rings, 98° tilt, pale cyan atmosphere) and merged it in.
- Built a strict one-planet-at-a-time sequencer (`seqStep` state machine: 0=Jupiter, 1=Saturn, 2=Uranus, 3=complete) so formations can't overlap.
- Added a sparkle-particle field to the dissolve reveal so planets look like they're accreting into place rather than just fading in from a shadow.
- Per a reference screenshot, added more filler nebula between inner and outer orbit rings and made the sun-to-planet pulses fire faster/more frequently.
- Ported `cosmogenesis-with-nebula-intro.html`'s real rippling-sun shader (`rippleWave`/`crestGlow`, 5 staggered crest sources) into this scene's sun, replacing a flatter version, per a direct screenshot comparison ("that's how the sun needs to be").
- Iterated the traveling pulse from a separate weak "heartbeat" alongside occasional big bursts into **one unified system**: every single pulse repeat is now a full-strength wave that physically shakes the particles of whichever planet is currently forming.

**The debugging chain (second half of session):**

The user kept reporting some version of "it skips," across several different actual causes:

1. **First pass** — traveling pulse ring, sun-flash ring, and the dust-disc shockwave-shake all started their cycle at `r≈0`, which is *inside* the sun's own radius (`SUN_R=5.5`), and rendered at full strength immediately — so each one "popped" into visibility/effect the instant it cleared the sun's silhouette. Fixed all three with a `fadeIn = smoothstep((r - SUN_R) / 8.0)` gate. The disc shockwave-shake case was the most serious of the three: it had **no envelope gating at all**, meaning dust particles near the sun got a full-strength physical jolt on every single cycle reset — a real particle glitch, not just a rendering artifact.

2. **Still happening** — audited the sun's own ripple shader math directly (5 evenly-staggered crest sources, each firing every `stagger/rate` seconds) and confirmed it has no inherent beat/aliasing artifact on its own. The actual bug: `PULSE_REPEAT_PERIOD` was hardcoded to `2.6s` while the sun's real ripple period is `0.2/0.17 ≈ 1.176s` — `2.6/1.176 ≈ 2.21`, not an integer multiple. Every pulse launch therefore landed on a different phase of the sun's own rhythm — sometimes on a crest (looked synced), sometimes mid-ripple (looked late/skipped). Fixed by deriving the pulse period instead of hardcoding it: `PULSE_REPEAT_PERIOD = 2 * (0.2/0.17) ≈ 2.353s`, exactly locked to 2× the ripple beat. Applied to both `planet-formation-prototype.html` and `sun-pulse-sync-test.html` (including that page's default slider value, which had the same mismatch).

3. **"Repeats right after it does a pulse, every couple pulses"** — a different bug in the sequencer handoff. When a planet finished forming, `pulseLegStartT` was reset to the exact moment the post-formation hold timer (`SEQ_HOLD`) expired — an arbitrary point that usually landed mid-flight of the next leg's already-launched pulse. That yanked the in-flight ring (and the sun-flash) back to r=0 and instantly relaunched a new one, reading as a double-pulse. Only visible at the three handoff points per loop (Jupiter→Saturn, Saturn→Uranus, Uranus→restart), matching "every couple pulses." Fixed with a `pendingLegBoundary`: once the hold timer expires, compute the *next natural cycle-restart timestamp* on the current pulse period and only flip `seqStep`/`pulseLegStartT` once time actually reaches it — so the handoff always lands exactly where the old cycle would have restarted anyway, with no cut. Verified the boundary math in a standalone Node snippet.

4. **"Particles react, then react again and condense — want it on the first react"** — the radial collapse animation (`collapseT`) was ramping across the *entire* formation duration (4.9s), not a short window right after the trigger, so it was only ~35% converged by the time the second beam arrived — reading as if the second hit caused the condensing. Added `COLLAPSE_END` (and matching `GATHER_END` reduction) per planet, defaulting to 45% of formT (~2.2s), so the shape fully condenses just before the second beam typically arrives, with new HUD sliders (`Collapse end %`) for all three planets.

5. **"Triggers but doesn't condense fluidly"** — after (4), the shape condensed on time but then visibly jittered afterward: the shake-taper (`1 - formT`) was still scaled to the old full 4.9s duration, so at the new shorter collapse window (`formT≈0.45`) the shake was still ~55% strength. Fixed by tapering shake against `formT / COLLAPSE_END` instead of raw `formT`, so shake fully fades out exactly when the shape finishes condensing, for all three planets.

6. **"Contracts, then contracts again and condenses — need one motion on the first hit"** — the actual final piece: `COLLAPSE_START` was still `0.19`, meaning there was a genuine ~0.9s window where particles only moved *angularly* along the ring (gathering toward the formation point) before any *radial* collapse began — two sequential motions, not one. Fixed by setting `COLLAPSE_START = 0` for all three planets, so angular gather and radial collapse now run concurrently from the very first hit, producing one continuous contraction into the sphere.

Also fielded an exploratory question mid-session — "Can every beam form a planet?" — and explained the tradeoff (current: one beam triggers a scripted timeline; alternative: every beam adds its own increment of progress, more causally satisfying but visually stepped rather than smooth) without implementing either, since the user moved on to the condense-fluidity issue instead.

---

### Root Causes (Summary)

None of "the skip" was one bug — it was five independent issues surfacing under the same complaint, in order found:
1. Missing fade-in gating at effect-start-radius (visual pop, one location had a real physical glitch too).
2. Pulse repeat period never actually locked to the sun's own ripple rhythm (a genuine numeric oversight — a `2.6` placeholder that a comment even flagged as "slower than the sun's ripple" without checking it was a clean multiple).
3. Sequencer leg-handoffs cutting an in-flight pulse instead of waiting for its natural cycle boundary.
4. Collapse animation timed against the full formation duration instead of against how fast the pulse actually repeats.
5. Shake-taper and gather/collapse staging still using the old (pre-fix-4) timing assumptions after the collapse window was shortened.

Each fix was verified by reading the actual shader/timing math and, where possible, deterministic simulation (Node snippets, and earlier in the session, real-tick simulation bypassing Chrome's background-tab `requestAnimationFrame` throttling) rather than trusting screenshots alone — screenshots proved actively misleading at least once earlier in this arc.

### Current State

- `planet-formation-prototype.html`: full Jupiter→Saturn→Uranus sequence in place, unified full-strength repeating pulse synced 2:1 to the sun's ripple, seamless sequencer handoffs, and single-motion condense (gather+collapse concurrent, tapered shake) for all three planets.
- `sun-pulse-sync-test.html`: isolated tuning page, pulse period now defaults locked to the ripple rhythm; still has the lock/drift HUD readout and 1×/2×/3× sync buttons for further tuning.
- **Not yet confirmed live**: the most recent fix (item 6 above, `COLLAPSE_START=0`) was applied but the user had not yet reported back whether it fully resolved the "one fluid motion" request before this log was written — worth checking at the start of next session if it comes up again.
- The exploratory "can every beam form a planet" direction (per-beam incremental progress instead of one-shot scripted formation) was discussed but not decided on or built.
