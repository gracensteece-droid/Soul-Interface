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

### Addendum — Later the Same Session: Galaxy-Phase Stutter

Ricky reported stuttering specifically during the galaxy phase, after saying he was otherwise happy with the sequence. Found two real, continuous sources of per-frame garbage allocation — a classic cause of GC-pause stutter in a Three.js render loop:

1. **Background color** (`lerpBg`) — allocated a brand-new `THREE.Color` every single frame (not just in the galaxy phase — the whole scene, the entire time) just to set the renderer's clear color. Fixed by reusing one scratch `Color` and calling `.setRGB()` on it instead of constructing a new one.
2. **Corona color-cycling** — allocated *ten* new `THREE.Color` objects every frame (two per corona layer × 5 layers), continuously, for as long as the post-ignition/galaxy phase runs, just to re-convert the same fixed hex palette (`CORONA_HUES`) over and over. Fixed by pre-converting the whole palette to `THREE.Color` objects once at startup (`CORONA_HUES_RGB`) and referencing those directly in the per-frame lerp — no allocation left in that path.

Also swept the rest of the file for other per-frame `new THREE.*` calls; everything else confirmed to be one-time setup at scene construction, not per-frame.

Not yet confirmed by Ricky whether this resolves the stutter fully — if it doesn't, the next step is browser dev-tools frame profiling to check whether remaining cost is raw particle-count/shader complexity rather than GC pauses.

---

### Addendum — Still Later the Same Session: GalaxyCloud, Sun Spin/Size/Ripple

Ricky moved on to the galaxy-phase sun/cloud relationship and wanted several more things directly controllable and keyframeable:

**`GalaxyCloud` control group (new)** — CollapseCloud's own `hotHue`/`warmBias`/`satMult`/`brightMult` only keyframe within 56–74s; past that they freeze and keep silently driving the same shared `fineMat`/`cloudMat` uniforms for the rest of the scene (the exact carryover issue discussed earlier this session). Added a new group, `GalaxyCloud` (window: `74+igniteDuration` → 90s, i.e. exactly the post-ignition tail), with its own `hue`/`satMult`/`warmBias`/`brightMult`. Once ignition completes, these take over driving those same four uniforms instead of the frozen collapse values — so the cloud's color/brightness can now be keyframed all the way through the galaxy phase, e.g. to gradually blend it toward the sun's own color instead of staying stuck wherever collapse left it. Defaults match CollapseCloud's own defaults (so nothing changes until touched), but a heads-up was flagged: if CollapseCloud's `hotHue` etc. have already been tuned away from default, there will now be a snap at the ignition-complete boundary until GalaxyCloud's first keyframe is set to match.

**Sun spin** — the sun mesh itself never rotated on its own axis before (only the camera orbited it). Added `Sun.spinSpeed`, properly integrated (`angle += speed*dt`, not a `time*speed` snapshot — same pattern as the collapse-cloud rotation fix earlier this session) so it stays correct regardless of playback speed/looping. Ricky asked for a wider range and direction control immediately after — widened to **-15 to 15** (negative reverses direction, which falls out for free from how the accumulator works, no extra code needed).

**Sun size** — `Sun.sizeMult` multiplies the sun's scale on top of its existing grow/shrink ignition/galaxy animation (both scale formulas), letting it shrink to a near-invisible particle or grow beyond its normal size. Log-scaled (0.01–6), same fix as `cloudSize`'s drag-precision issue from earlier.

**Sun ripple** — Ricky remembered a traveling surface-wave effect from `sun-prototype.html` (five crest sources sweeping across the sphere, displacing the surface and adding a bright glow trail) and wanted it ported in. Added `Sun.rippleStr` uniform and the exact same `rippleWave`/`crestGlow` functions from the prototype into origin's `sunMat` vertex + fragment shaders, exposed as `Sun.ripple` (default 0 = off, matches prototype's dormant state).

All four new properties live on the existing **Sun** group, so all are already keyframeable across its full 74–90s window with no extra sequencer work needed.

**Reference-look discussion (no code change)**: Ricky shared a reference image wanting the post-ignition cloud/halo to look more like a smooth warm-to-cool radial gradient/ring rather than the current patchy particle look. Diagnosed that the existing `GalaxyCloud` hue/sat controls apply uniformly (not a radial gradient), so they can shift the overall tone but not replicate a true center-to-edge gradient without new shader work. Redirected toward the existing **corona** system instead (`Sun.coronaGlow`/`coronaSpread`) since it's a smooth additive-billboard ring already, suggesting that combined with dialing back `GalaxyCloud.brightMult` — not yet implemented, Ricky was going to try it manually first.

**Stray file-corruption caught before commit**: `Aion/Frontend/Code/sun-prototype.html` (reference-only, untouched intentionally) showed a one-character diff (`1<!DOCTYPE html>`) almost certainly from an earlier malformed tool call while reading it for the ripple-porting reference. Caught during pre-commit review and reverted with `git restore` before committing — not part of this session's actual changes.

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
