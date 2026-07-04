# Soul Interface — Plans / Next Session Reference

### Origin Scene — Next Steps
*Updated July 4, 2026 (Session 8)*

**Context**: `Aion/Frontend/origin/main.js` now has a full custom keyframe sequencer built into its Controls popout — per-group time+value graphs, easing curves with adjustable strength, per-group loop/play/pause/reset/defaults, all persisted to localStorage. Theatre.js is still wired up alongside it, untouched. See Session 8's build log for the full feature list and the three-bug hunt behind the "can't drag keyframes" issue (root cause: a popped-out window is a separate `Window` object — mouse-tracking listeners must attach to `canvas.ownerDocument`, not the page's original `window`).

**Not yet committed** — everything from Session 8 (origin scene bug fixes + the entire sequencer feature) is only on disk right now, not in git.

**Loose ends carried over from Session 7** (still open, untouched this session):
1. **Bipolar jets** — geometry/shaders exist (`jetTopMat`/`jetBotMat`) but are never animated or made visible. Need a `time` increment + `gAlpha` ramp.
2. **Dormant `drainMat`/`cvortMat` layers** — `gAlpha` permanently 0; decide whether to activate or delete.
3. **`hazeRed`/`hazeBlue`/`hazeGold`** are stub objects, not real meshes — no visual effect.
4. **Real integration** — origin's ignition/galaxy end-state still isn't connected into the actual solar-system scene as a transition; it's a standalone loop.

**New from Session 8:**
5. **Theatre.js retirement** — Ricky's explicit call was to keep it alongside for now, not delete it. Worth revisiting once the custom sequencer has been used enough to be trusted, since running both means every control has two possible write-paths into `tVals` — the source of a couple of Session 7/8's bugs.
6. **Sun scene has no sequencer** — `Aion/Frontend/sun/` is untouched, still Theatre.js only. Only `origin/` got the custom sequencer built this session.

**Key files**: `Aion/Frontend/origin/src/main.js` (active, has the sequencer), `Aion/Frontend/sun/src/main.js` (unchanged since Session 6, Theatre.js only)
**References**: `Aion/Frontend/Code/origin.html`, `nebula-prototype.html`, `collapse-prototype.html`, `sun-prototype.html` — all untouched, reference only
