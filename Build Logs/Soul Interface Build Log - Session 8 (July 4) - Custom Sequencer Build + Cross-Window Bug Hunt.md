# Soul Interface Build Log — Session 8 (July 4)
## Topic: Custom Keyframe Sequencer + Origin Scene Bug Fixes

---

### What We Did

Started by fixing three real, concrete bugs in the origin scene (not just "tuning"), then went on to build an entire custom keyframe-sequencing system inside the Controls panel — effectively a lightweight, purpose-built stand-in for Theatre.js, scoped to fit the scene's actual shape instead of one shared global timeline.

---

### Part 1 — Origin Scene Bug Fixes

Ricky reported the nebula "starting out fast" and the wrong color at formation. Traced to three real, independent bugs (not randomness, though a seed change made them more visible):

1. **Speed** — particle drift amplitude had no ramp tied to formation progress; fixed with a `smoothstep`-based envelope on `formT` (and `gAlpha` for the cloud-puff layer) so motion starts at zero and ramps in.
2. **Color** — the nebula hue blend mixed a red-band radial color with a blue-ish per-particle noise color at a flat 36% weight from frame one. Linear blending between red and blue passes straight through green as an artifact. Fixed by ramping that blend weight in with formation progress too, so the start is governed by the pure radial bands.
3. **Rotation** — the actual root cause of "too fast": `rotA = time * rotSpeed` (current speed × total elapsed time) instead of properly accumulating `speed × dt` every frame. This overstates rotation whenever speed is still ramping up — exactly the formation window. Replaced with real per-frame accumulation (`rotAngleFine/Cloud/Spark`) for all three particle layers.

Also seeded the previously-unseeded `Math.random()` calls in particle geometry generation (`mulberry32`, fixed seed) so reloading the page reproduces an identical layout every time instead of a new random one — this was the root of "it keeps changing on its own" frustration earlier in the session.

Two shader compile bugs were introduced and caught mid-session (undeclared `gAlpha` and `rotAngle` in a vertex shader stage) — both found via the dev server's error log before being reported as "still broken."

---

### Part 2 — Custom Keyframe Sequencer

Ricky said he didn't like Theatre.js's own UI but wanted to keep the *idea* — keyframes, timelines, playback. Decision: build a custom sequencer inside the existing Controls popout, one per control group (Nebula, Collapse, CollapseCloud, Ignition, ExplosionBall, Sun, Playback), each scoped to that group's own real time window instead of Theatre's single global 0–90s timeline. Theatre.js itself stays wired up alongside, untouched, per Ricky's explicit call not to rip it out yet.

**What got built, roughly in order:**
- Per-property keyframe strips: a canvas per slider, with a **time+value graph** (horizontal = time within that group's window, vertical = value scaled to that slider's own min/max) — not just a flat timeline.
- Click empty space to drop a keyframe at that exact time/value; drag a diamond to move it in both axes; right-click to delete.
- A ruler across the top of each strip with adaptive major/minor tick spacing (real scene-seconds, subdivided to tenths) plus a live hover/drag readout showing exact `t` and `v`.
- **Easing curves** — linear / ease-in / ease-out / ease-in-out per keyframe segment (shift+click a diamond to cycle), plus a **strength** parameter (scroll wheel over a diamond) controlling how sharp the curve bends. Both default to values that exactly match old behavior, so nothing already placed changed appearance.
- **Per-group loop** — a 🔁 button that bounces the master clock within just that group's window, for previewing one stage repeatedly without replaying the whole scene.
- **Play/Pause and Reset** — in the panel header, per-group, and on-canvas (so none of it requires the popup window to be open or focused).
- **Per-group defaults** — ⟲ resets a group's sliders to a stored default; 💾 saves the current values as the new default. The main scene Reset now also resets every slider to its default (previously it only rewound playback — a real gap once someone expected "Reset" to mean "back to normal state").
- **Collapse/expand** — per group, plus a panel-wide Collapse All / Expand All.
- Keyframes and defaults persist to `localStorage`, surviving reloads.
- Visual polish: resolution-aware canvas rendering (fixes blur from a fixed low-res buffer stretched via CSS) plus pixel-snapped hairlines (thin canvas lines drawn at fractional coordinates anti-alias into a soft smudge regardless of resolution — the actual remaining source of "still blurry" after the first fix).

---

### Part 3 — The "Can't Drag" Bug Hunt

Dragging a keyframe simply didn't work, and it took several real, distinct bugs — each one legitimately fixed, but not the actual root cause — before landing on it:

1. Canvas elements can have native browser drag-and-drop behavior that intercepts a mousedown+move gesture before custom JS sees it. Disabled (`draggable=false`, blocked native drag/text-select, `preventDefault()` on mousedown). Real, but not the root cause.
2. The code checked `e.shiftKey` and bailed out of arming a drag before doing anything else — if shift was latched "on" (e.g. Windows Sticky Keys, easy to trigger by accident while testing shift+click), every click would take that branch and never drag. Reworked so a click always arms the drag, and shift-behavior is decided afterward based on whether the point actually moved. Real, but still not it.
3. **The actual root cause**: the Controls panel can live in a popped-out browser window (`window.open()`) — a genuinely separate `Window` object with its own independent mouse events. The drag-tracking code was listening on `window` (this script's original global), which never receives mouse events happening over the popup's own canvas. Fixed by attaching drag-tracking dynamically to `canvas.ownerDocument` (whichever document currently owns the canvas) at drag-start, and tearing the listener down at drag-end. The same bug existed for the slider's "am I being dragged" flag, just with a quieter symptom (would get stuck permanently after one drag in the popup) — fixed the same way.

Confirmed working after that fix.

---

### Decisions

- **Theatre.js stays** wired up alongside the custom sequencer for now — not deleted. Both write into the same `tVals`; whichever touches a value last wins, same as today.
- Ricky is intentionally not chasing full Theatre.js parity (no cubic-bezier curve-handle editor) — the strength-parameter approach was chosen as a smaller, sufficient middle ground for a personal project rather than a shipped design tool.

---

### Current State

| File | Status |
|---|---|
| `Aion/Frontend/origin/src/main.js` | Custom sequencer fully built into the Controls popout; origin scene speed/color/rotation bugs fixed; seeded RNG for reproducible layouts |
| Theatre.js | Still wired up, untouched, running alongside |
| Controls panel | Popup window with inline-panel fallback if the popup approach fails in-browser |

### Dev Server
```
cd Aion/Frontend/origin
npm run dev
```

---

### Next Session

- Open question from earlier: eventually retire Theatre.js once the custom sequencer is trusted, rather than keeping both indefinitely (flagged as a real risk — two systems touching the same state is what caused several of tonight's more confusing bugs).
- Sun scene (`Aion/Frontend/sun/`) untouched this session — still just Theatre.js, no custom sequencer there yet if that's ever wanted.

---

### Addendum — Later the Same Session

**One more real determinism bug, deeper than the seeded-RNG fix.** Ricky kept noticing color and particle intensity varying between plays even after the seed fix. Root cause: several shader `time` uniforms (`fineMat`, `cloudMat`, `sparkMat`, `sunMat`, `coronaMats`, `flashMat`, `galaxyDiscMat`) were accumulated independently frame-by-frame (`time.value += dt`) instead of being derived from the scene clock `T`. Two consequences: (1) touching the `Playback.speed` slider permanently desyncs shader-time from `T`, since `T` scales by speed but these didn't; (2) looping a section snaps `T` back but these kept climbing, so a second pass through a loop sampled a completely different point in the noise functions than the first pass. Fixed by setting each one directly `= T` (or a T-derived offset, e.g. `T - T_COLL_END` for ignition-relative ones) every frame instead of accumulating — the whole scene is now a pure function of `T` alone.

**Custom loop-range control** — added alongside the existing per-group 🔁 buttons: two number inputs + a toggle in the Controls panel header let you loop *any* arbitrary start/end in seconds, independent of group boundaries (e.g. a transition that spans two groups). Mutually exclusive with the per-group loop (whichever was set most recently wins).

**Three new CollapseCloud controls**, directly on the collapse-phase particle materials:
- `spinSpeed` — multiplies the whole collapse rotation rate
- `cloudSize` — scales the collapse spiral's overall radius
- `coreLightHue` — rotates the core-glow shells (white/amber/orange/dark) + point light around the color wheel together, preserving their relative brightness spread

All three also added to the Theatre.js `CollapseCloud` sheet object for parity, per the "keep both in sync" convention established earlier.

**Committed this time** — everything from this session (origin scene bug fixes, the full sequencer build, the determinism fix, and the three new controls) is in git as of end of session.
