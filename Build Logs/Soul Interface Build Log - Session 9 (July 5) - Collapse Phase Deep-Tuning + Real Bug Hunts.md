# Soul Interface Build Log — Session 9 (July 5)
## Topic: Collapse-Phase Controls, Corona/Flash Exposure, and Several Real Bug Hunts

---

### What We Did

Continued directly from Session 8's custom sequencer. This session was almost entirely about the collapse→ignition window (T≈56–78s): making existing controls actually work as expected, exposing hardcoded visual parameters Ricky needed to finish tuning that sequence, and — repeatedly — finding that a control "not working" was a real, specific bug rather than a tuning issue.

---

### Part 1 — `spinSpeed` Actually Doing Nothing

Ricky reported the newly-added `spinSpeed` control had no visible effect. Root cause: the collapse-phase rotation formula multiplied `spinSpeed` across the *entire* speed expression, including its baseline — so at the moment collapse begins (T=56), speed should continue smoothly from wherever the nebula phase left off, but at `spinSpeed != 1` it now snapped instantly to a different rate. Fixed by only scaling the ramp-*above* baseline, leaving the baseline itself untouched so the transition into collapse stays continuous regardless of `spinSpeed`.

Also widened `spinSpeed`'s range (0.2–4 → 0.2–25) since the underlying rotation was quite subtle even at old-max.

Follow-up: Ricky felt the speed-up still wasn't "fluid." Turned out to be the *ramp shape* (a hardcoded cubic curve that stays slow then rushes near the end), not a bug. Exposed it as its own control: **`spinRampShape`** (1 = linear ramp, 3 = old cubic default, higher = more backloaded), decoupled from the particle-convergence math so it only affects rotation pacing.

---

### Part 2 — Export Current Values

Ricky asked if a "perfect" look that had just happened could be recovered. It couldn't — there's no logging of live slider state, and (worse) the very act of editing the file to add a recovery feature triggers Vite's auto-reload, which resets all untouched sliders back to defaults. Added a **📋 Export Values** button (panel header) that dumps the full current `tVals` as JSON into a visible textarea, so a good state can be captured *before* anything else touches the file — this doesn't persist anything itself, saving via 💾 per-group still does that.

---

### Part 3 — Corona / Flash / Background Controls Exposed

From screenshots of the ignition sequence Ricky liked, we inventoried what was tunable vs. hardcoded. Exposed four previously-fixed pieces:

- **`Sun.coronaHueShift`** — rotates the corona's whole color cycle
- **`Sun.coronaFlareStrength`** / **`Sun.coronaSpread`** — flare-ray brightness and falloff, as multipliers over each layer's original per-layer constant
- **`ExplosionBall.flashHue`** / **`flashTint`** — tints the flash sphere away from its hardcoded near-white
- **`ExplosionBall.bgTintAmount`** — multiplies the background's warm shift during ignition

**Real bug found in the process**: `Sun.coronaGlow` was implemented as `baseGlowStrength.value *= tVals.coronaGlow` — run every frame, this compounds indefinitely for any value other than exactly 1 (doubling/halving every frame, blowing out within seconds). Nobody had hit it yet since it hadn't been pushed off 1.0. Fixed by capturing each corona layer's original base values once at creation (`CORONA_BASE_GLOW/FLARE/RADIAL/FLAREFALLOFF/COLORS`) and always scaling *from* that fixed base rather than compounding onto the current value — same pattern used for the new flare/spread controls.

---

### Part 4 — `ballForm` (Collapse Into a Ball Before Exploding)

Ricky wanted the collapsing cloud to visibly round into a ball right before ignition, instead of flattening to a point (the cloud starts nearly flat, so radius→0 while height barely changes just means "shrink to a thin spike," not a ball). Added **`ballForm`** (CollapseCloud, 0–3, default 0 = old behavior exactly): pushes particles outward vertically as they converge inward, scaled per-particle so the cloud rounds out instead of collapsing flat.

**Bug, caught from Ricky's report that it "didn't do what I wanted"**: the first version scaled the vertical push by each particle's *original* distance from center (`initR`), not its *current* shrinking radius (`rc`) — so outer particles kept getting a huge, uncorrelated vertical shove all the way to the end, instead of the puff shrinking down together with the radius. Fixed by keying off `rc`/`rCC` (current radius) instead.

This is also the session's clearest example of the keyframe strips already fully supporting the request — "expand then condense right before it explodes" just needed two keyframes (high value early, low value near 74s) with an eased curve on the transition, no new sequencing feature required.

---

### Part 5 — The `cloudSize` Floor: Three Wrong Fixes, Then the Real One

Ricky wanted `cloudSize` keyframed down to "almost a particle" and reported it wouldn't go low enough, repeatedly, across several attempts:

1. First assumed it was just range — widened min from 0.3 → 0.02 → 0.0005. Didn't fix it.
2. Then found a real (but not-the-actual-complaint) bug: collapse turbulence displacement (`turb`/`driftCC`) was added to the collapse position *unscaled* by `cloudScale`, so the cloud could never visually shrink below the turbulence's own fixed scatter radius regardless of `cloudSize`. Fixed by scaling both by `cloudScale` too. Real bug, correctly fixed — but not what Ricky was actually hitting.
3. Ricky clarified: the problem was the **keyframe drag itself**, not the render. Root cause: the keyframe graph maps value→pixel *linearly*, and `cloudSize`'s range now spans 0.0005–3 (6000×) — anything under ~0.1 was being squeezed into ~3 pixels at the bottom of a 96px-tall canvas. Technically reachable, practically impossible to aim for with a mouse.

**Actual fix**: added an optional `log:true` flag to control-group properties; `cloudSize` (and the new `coreGlowSize`) now use a logarithmic value↔pixel mapping on their keyframe graph, so the low end of a huge range gets real, draggable pixel space. Also fixed the value readout, which was rounding tiny values to `0.00` via a flat `.toFixed(2)` — now shows more decimals under 0.1.

---

### Part 6 — `coreGlowSize`

Even with the above fixed, the collapse "ball" still had a size floor. Found a fourth, independent cause: four fixed-radius glow spheres (`coreWhite`/`coreAmber`/`coreOrange`/`coreDark`, radii 1.2–8 units) exist purely for the pre-ignition core glow, fade in via opacity as collapse completes, and were never scaled by `cloudSize` at all — a completely separate system from the particle cloud. Gave them their own control: **`coreGlowSize`** (CollapseCloud, log-scaled 0.01–3), scaling all four together.

---

### Decisions / Discussion (no code changes)

- **Why values "leak" across phase boundaries**: a control-group's keyframes only *drive* its properties while the scene clock is inside that group's own time window; once T moves past it, the value simply freezes at whatever the last keyframe left it at — and since `fineMat`/`cloudMat` are the same shared particle materials used continuously from collapse through galaxy formation, a frozen CollapseCloud value keeps quietly influencing later phases. The on-canvas "(inert now)" status label was clarified to mean "not currently being keyframe-driven," not "has zero effect" — a real gap between the label and reality worth remembering. Two possible fixes discussed (reset-to-default on window exit, vs. properly scoping each property to code exclusive to its own window) — not yet decided, Ricky is steering it manually for now by placing keyframes further along instead.
- **Sun/cloud hue matching** ("melt the sun into the cloud"): the sun's color (`Sun.hueMode`/`coronaHueShift`) and the cloud's color (`CollapseCloud.hotHue`/`warmBias`/`satMult`, frozen past 74s per the above) are fully independent today. No dedicated post-ignition cloud-color control exists yet — flagged as a possible future addition if matching via the frozen carryover value proves too limiting.

---

### Current State

Ricky confirmed the collapse→ignition sequence is finally landing the way he wants. All changes are in `Aion/Frontend/origin/src/main.js` only.

### Dev Server
```
cd Aion/Frontend/origin
npm run dev
```

---

### Next Session

- Revisit the frozen-value-across-phase-boundaries architecture if manual steering (placing keyframes further along) stops being sufficient.
- Possible dedicated post-ignition cloud-color control, if hue-matching the sun via the frozen CollapseCloud value proves too limiting.
- Carried over from Session 8 (still untouched): Theatre.js retirement decision, Sun scene (`Aion/Frontend/sun/`) has no custom sequencer, bipolar jets/dormant layers/haze stubs in origin scene, real integration into the solar-system scene.
