# Soul Interface Build Log — Session 10 (July 7)
## Topic: Chrome/Edge State Confusion, and a New Sun.dissolve Particle Effect

---

### What We Did

Short session. Started by re-locating last session's work (the origin scene, `Aion/Frontend/origin/src/main.js`, dev server on `localhost:5176`), then spent time untangling what looked like a Chrome-vs-Edge desync before landing on one real feature: a new control that dissolves the sun into particles at the end of the sequence.

---

### Part 1 — The "Chrome Shows an Older Version" Non-Bug

Ricky reported Chrome was showing an older, less-edited version of the scene than Edge, even after clearing all Chrome history/cache and reopening. Screenshots from both browsers were compared directly: every CollapseCloud panel value (`turbulence`, `hotHue`, `spinSpeed`, `ballForm`, etc.) was byte-for-byte identical between the two — same file, same edits, same defaults. The only difference was the playback timestamp (70.6s vs 68.6s), about 2 seconds apart. Since this sequence is turbulence-driven, two screenshots taken ~2s apart during the chaotic collapse/ignition window naturally look like different "versions" even in the exact same browser. Not a caching bug, not a sync bug — just comparing two different random-looking instants and reading the difference as a version mismatch. Worth remembering for future "browser X looks different from browser Y" reports on this scene: check the on-screen timestamp before assuming it's a code/cache issue.

---

### Part 2 — `Sun.dissolve`

Ricky wanted an effect where, in the last ~10 seconds of the sequence, the sun breaks apart into particles and blends into the surrounding galaxy cloud rather than just sitting there or shrinking away.

Added a new keyframeable **`dissolve`** property (0–1) to the existing **Sun** control group (window 74–90s, same group as `hueMode`/`coronaGlow`/`spinSpeed`/`size`/`ripple`):

- **Sun mesh erosion**: `sunMat`'s fragment shader gained a `dissolve` uniform. Above `dissolve > 0.001`, a noise sample (`fbm`, already used elsewhere in that shader) is compared against `dissolve` and fragments below the threshold are discarded — the surface visibly erodes in irregular patches as the value rises, fully gone by `dissolve ≈ 1` (noise tops out just under 1).
- **New particle system**: `sunDustMat`, ~4000 points sampled evenly across the unit sphere (Fibonacci sphere distribution), idle/invisible at `dissolve = 0`. As `dissolve` rises, particles drift outward from the sun's surface (radius scaled to the sun's *current* natural size, before any dissolve-driven shrink) with per-particle jitter and speed, fading in then back out as they spread — colored via the same hot-palette function as the sun itself, driven by the live `hueMode`, so the sparks always match whatever color the sun is currently cycling through.
- **Supporting fades**: corona glow/flare strength and the core point light now multiply by `(1 − dissolve)`, and the sun mesh's own scale shrinks by the same factor — so the whole post-ignition light source recedes together instead of the corona/light hanging around after the core is gone.
- **State hygiene**: explicit `dissolve = 0` resets added both to `resetScene()` and the scrub-back/loop-reset block in `tick()`, following the same pattern used for every other one-shot uniform in this file — otherwise a mid-dissolve loop restart would leave stray sparks frozen in place during the next nebula/collapse replay.

Usage: same two-keyframe pattern as the rest of the sequencer — e.g. `0` at ~80s, `1` at ~90s, dropped directly on the Sun group's timeline strip.

Not yet visually confirmed by Ricky in-browser at time of writing (session ended right after implementation).

---

### Current State

All changes are in `Aion/Frontend/origin/src/main.js` only. Committed locally as `ad7fca0` — **not yet pushed**.

### Dev Server
```
cd Aion/Frontend/origin
npm run dev
```

---

### Next Session

- Confirm the dissolve effect actually reads the way Ricky wants once he keyframes it in — this was implemented but not yet watched end-to-end together.
- Note: `Vision & Architecture/Seers/Maren/01 - The Twelve Houses as Landscapes.md` has unrelated uncommitted edits sitting in the working tree (not from this session, not touched) — still pending whenever Ricky wants that committed separately.
- Carried over from Session 9: frozen-value-across-phase-boundary architecture decision, possible dedicated post-ignition cloud-color control, Theatre.js retirement decision, Sun scene (`Aion/Frontend/sun/`) still has no custom sequencer.
