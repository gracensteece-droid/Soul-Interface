# Soul Interface — Plans / Next Session Reference

### Sun/Galaxy-to-Planet-Formation Bridge — Next Steps
*Updated September 20, 2026 (Session 23)*

**Context**: `Aion/Frontend/Code/sun-galaxy-to-planet-formation.html` connects `cosmogenesis-with-nebula-intro.html` to `planet-formation-prototype.html` — spiral disc morphs into rings matching that file's exact dimensions, then a beam forms Jupiter (Jupiter only, deliberately not Saturn-Pluto yet). See Session 23's build log for the full saga — three failed full-9-planet merge attempts before landing on this scope, plus a long list of real bugs found and fixed along the way (sun cold-start whiteout, stray giant-ring artifacts, intro-nebula real-time overlay, camera-fighting-user-control, a `T`-clamp that froze the entire Jupiter sequence).

**Open, not resolved**: user reported something rendering very close to the camera once the beam/Jupiter sequence starts. Exhaustive diff against the reference file found no code divergence. Leading theory (unconfirmed): `userCameraControl` permanently disables scripted camera movement after any manual drag/scroll, so if the camera was manually zoomed in during earlier testing in the same page load, it'd still be sitting there when Jupiter forms. Asked Ricky to confirm whether he touched the canvas before the beam played — if he says no, this needs a fresh investigation, don't assume it's already explained.

**Not yet built**: Saturn through Pluto. The plan (per Ricky's own direction) is to extend the same pattern already working for Jupiter — one planet at a time, reviewed before moving to the next — rather than porting the full remaining 8-planet sequence in one pass, given how the full-sequence approach went wrong three times already.

**Key files**: `Aion/Frontend/Code/sun-galaxy-to-planet-formation.html` (active), `cosmogenesis-with-nebula-intro.html` / `planet-formation-prototype.html` (untouched references — do not port their content wholesale into the bridge file; match visually, don't duplicate).

---

### Planet Formation Sequencer — Next Steps
*Updated September 7, 2026 (Session 22)*

**Context**: `Aion/Frontend/Code/planet-formation-prototype.html` now runs the full Jupiter→Saturn→Uranus formation sequence with a unified sun-synced pulse system. Session 22's build log has the full detail — five separate bugs surfaced under one recurring "it skips" complaint (fade-in-at-r=0 pops, pulse/ripple period never actually locked, sequencer handoffs cutting an in-flight pulse, collapse timed against the wrong duration, shake-taper/gather-collapse staging left over from the pre-fix timing).

**Not yet confirmed by Ricky**: the last fix of the session — setting `COLLAPSE_START = 0` for all three planets so angular gather and radial collapse run concurrently from the first beam-hit instead of two sequential motions. If he reports it's still not fully fluid, look at whether `GATHER_END`/`COLLAPSE_END` (currently both 45% of formT) need to come down further, or whether `SHAKE_INTENSITY` itself is too strong for how fast the collapse now happens.

**Open question, discussed but not decided**: Ricky asked "can every beam form a planet?" — i.e. instead of one beam triggering a scripted formation timeline, have every beam add its own increment of accretion progress. Tradeoff raised: more causally satisfying (every beam visibly matters) but growth would look stepped rather than the current smooth continuous arc, and duration becomes beam-count-dependent. Not built — revisit if he brings it back up.

**Key files**: `planet-formation-prototype.html` (active, full sequence), `jupiter-formation-loop.html`/`saturn-formation-loop.html`/`uranus-formation-loop.html` (isolated single-planet test pages, same tech propagated in lockstep), `sun-pulse-sync-test.html` (isolated pulse/ripple timing tuner — pulse period now defaults locked to 2× the ripple period, has a lock/drift HUD readout and 1×/2×/3× sync buttons).

---

### Origin Scene — Next Steps
*Updated July 5, 2026 (Session 9)*

**Context**: `Aion/Frontend/origin/src/main.js` collapse→ignition sequence (T≈56–78s) is now landing the way Ricky wants after a full session of exposing hardcoded controls and hunting real bugs — see Session 9's build log for the details (spinSpeed continuity fix, corona/flash/background exposure, the `coronaGlow` compounding bug, `ballForm`, and a three-round bug hunt behind "`cloudSize` won't go small enough" that ended in a logarithmic keyframe-graph scale and a fourth independent size source — the fixed-radius core-glow spheres, now controlled via `coreGlowSize`).

**Not yet committed** — check before assuming; commit as of Session 9 covers through `coreGlowSize`.

**Open architectural question, discussed but not decided**: control-group values freeze at their last keyframe once the scene clock moves past that group's time window, and since `fineMat`/`cloudMat` are shared across collapse/ignition/galaxy, a frozen value keeps influencing later phases silently. Ricky is steering around this manually (placing keyframes further along) for now. Revisit if that stops being sufficient — options discussed: reset-to-default on window exit, or properly scoping each property to code exclusive to its own window.

**Loose ends carried over from Session 7/8** (still open, untouched):
1. **Bipolar jets** — geometry/shaders exist (`jetTopMat`/`jetBotMat`) but are never animated or made visible. Need a `time` increment + `gAlpha` ramp.
2. **Dormant `drainMat`/`cvortMat` layers** — `gAlpha` permanently 0; decide whether to activate or delete.
3. **`hazeRed`/`hazeBlue`/`hazeGold`** are stub objects, not real meshes — no visual effect.
4. **Real integration** — origin's ignition/galaxy end-state still isn't connected into the actual solar-system scene as a transition; it's a standalone loop.
5. **Theatre.js retirement** — still kept alongside the custom sequencer per Ricky's explicit call. Worth revisiting now that the sequencer has had heavy real use this session.
6. **Sun scene has no sequencer** — `Aion/Frontend/sun/` is untouched, still Theatre.js only.

**New from Session 9:**
7. ~~Post-ignition cloud-color control~~ — done: added `GalaxyCloud` group (hue/satMult/warmBias/brightMult, window 74+igniteDuration→90s), takes over from CollapseCloud's frozen values once ignition completes.
8. **Galaxy-phase stutter — verify fix**: removed two continuous per-frame `THREE.Color` allocations (background clear-color, corona hue-cycling) that were real GC-pressure sources. Not yet confirmed by Ricky whether this fully resolves the stutter — if not, next step is browser dev-tools frame profiling to check for raw particle-count/shader-cost issues instead.
9. **Sun controls added**: `spinSpeed` (-15 to 15, own-axis rotation), `sizeMult` (log-scaled 0.01–6), `ripple` (ported from `sun-prototype.html`'s traveling crest-wave effect) — all on the Sun group, all keyframeable across 74–90s.
10. **Reference-look request, not yet implemented**: Ricky wants the post-ignition halo to look like a smooth warm-to-cool radial gradient/ring (reference image provided) rather than the current patchy particle cloud. Existing `GalaxyCloud` hue controls are uniform, not radial, so they can shift overall tone but not replicate a true center-to-edge gradient. Suggested leveraging the existing corona system (`coronaGlow`/`coronaSpread`, already a smooth additive-billboard ring) plus dialing back `GalaxyCloud.brightMult` instead — Ricky was going to try that manually before any new radial-gradient shader feature gets built.

**Key files**: `Aion/Frontend/origin/src/main.js` (active, has the sequencer), `Aion/Frontend/sun/src/main.js` (unchanged since Session 6, Theatre.js only)
**References**: `Aion/Frontend/Code/origin.html`, `nebula-prototype.html`, `collapse-prototype.html`, `sun-prototype.html` — all untouched, reference only
