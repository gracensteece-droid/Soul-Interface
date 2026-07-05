# Soul Interface — Plans / Next Session Reference

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
7. **Post-ignition cloud-color control** — matching the sun's color to the cloud's ("melt the sun into the cloud") currently relies on the frozen CollapseCloud `hotHue` carryover past 74s. No dedicated post-ignition control exists yet; add one if the carryover approach proves too limiting.

**Key files**: `Aion/Frontend/origin/src/main.js` (active, has the sequencer), `Aion/Frontend/sun/src/main.js` (unchanged since Session 6, Theatre.js only)
**References**: `Aion/Frontend/Code/origin.html`, `nebula-prototype.html`, `collapse-prototype.html`, `sun-prototype.html` — all untouched, reference only
