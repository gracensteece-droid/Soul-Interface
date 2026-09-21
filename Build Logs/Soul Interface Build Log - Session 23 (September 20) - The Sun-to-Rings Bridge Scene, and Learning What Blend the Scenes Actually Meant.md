# Soul Interface Build Log — Session 23 (September 20, 2026)
## The Sun-to-Rings Bridge Scene, and Learning What "Blend the Scenes" Actually Meant

### Goal going in

Connect `cosmogenesis-with-nebula-intro.html` (nebula → sun ignition → spiral galaxy disc) to `planet-formation-prototype.html` (the already-built, already-tuned Jupiter→Pluto beam/accretion sequence) so the two feel like one continuous experience: the spiral forms into rings, then a beam bursts out and planets form.

### The new file

`Aion/Frontend/Code/sun-galaxy-to-planet-formation.html` — a copy of `cosmogenesis-with-nebula-intro.html`, extended with a ring-formation "bridge" phase, and (as of this session) a Jupiter-only beam/accretion sequence at the end of it. Both source files (`cosmogenesis-with-nebula-intro.html`, `planet-formation-prototype.html`) remain completely untouched references throughout.

### The real architectural lesson (cost the most time this session)

This file is **one of three separate scenes meant to feel continuous**, not a container for the other files' content. Its actual job is: morph the spiral into rings that visually match `planet-formation-prototype.html`'s own dimensions exactly (sun look, ring radii, camera framing), so a viewer never perceives a seam.

This got badly over-scoped, three separate times, from ambiguous language like "it needs to blend into the planets formation scene" and "become the same scene." Each time, the actual planet-accretion mechanic (9 planets, precursor clusters, orbit-guide ring meshes, pulse system) got ported wholesale from `planet-formation-prototype.html` into this file, and each time it caused real, specific problems:

1. **First attempt**: full 9-planet port, triggered once rings fully settled. Added a duplicate orbit-guide ring system (`ringMeshes`/`TorusGeometry`) layered on top of the dust rings that had already correctly formed from the spiral morph — read as "planet formation just placed on top of this scene." Reverted.
2. **Second attempt**: same content, plus a page-navigation handoff to a disposable copy (`planet-formation-handoff.html`, since deleted) with a fade-to-black mask. Worked mechanically, but explicitly rejected: "they need to become the same scene not just cut into each other."
3. **Third attempt**: merged into one file for real, still all 9 planets, still no orbit-guide rings. Got closer, but was still the wrong scope — the user's actual, final, explicit words: *"all you have to do is have a spiral galaxy form into a ring galaxy, that's it, in one scene, that's all you need."*

The file was stripped back to just the spiral→rings bridge (twice, via full revert-forks) before landing on the right, much narrower final scope: **spiral forms into rings, then — as an explicit, separate, later ask — a beam forms just the first planet (Jupiter), and stops there.** No orbit-guide rings, ever. No full 9-planet sequence in this file (that stays in `planet-formation-prototype.html` itself). Saved as two memory entries (`project_three_scene_handoff_architecture`, `feedback_scope_creep_accretion`) specifically so this mistake doesn't get made a fourth time in a future session.

### Real bugs found and fixed in the bridge/sun logic

- **`emergence` stuck at 0 on cold-start past ignition**: the sun shader does `mix(whiteHot, col, emergence)`; `emergence` only ever ramps 0→1 inside the live 74–78s ignition window. Any cold-start/loop landing past that point skips the ramp entirely, leaving the sun permanently white-hot. Fixed by forcing `emergence=1` unconditionally once ignition is done. This is a latent bug in the underlying sequencer pattern itself (see `project_sun_emergence_coldstart_bug` memory) — anything else built on this file family that adds a non-zero default start time should be audited for the same class of issue.
- **`drainMat`/`cvortMat` blob artifact**: dormant collapse-phase-only debris layers with point sizes tuned for a much more distant camera; leftover alpha blew up into giant blurry blobs once the camera moved closer during ring formation. Hard-zeroed for `T >= T_GALAXY_END`.
- **`fineMat`'s own internal fake-galaxy shape**: a completely separate position/color generator inside `fineMat`'s vertex shader (reaching radius ~255), blended in via a `galaxyT` uniform independent of `gAlpha` — caused a giant stray bright ring at the frame's edge. Forced `galaxyT=0` alongside the existing cloud-kill fix.
- **Intro-nebula overlay runs on real wall-clock time**: `introNebulaVolumes` and the `realNebulaGroup` "grow into place" scaffolding are driven by `performance.now()`, not by the scene's own `T`. Once the default start point moved to T=85 (skipping the natural intro), that system would still replay its own ~30-second real-time reveal from scratch on every load. Now force-disposed/snapped to its end state immediately whenever starting past its own window.
- **Manual camera control was being fought**: drag-to-orbit and scroll-to-zoom already existed, but scripted camera drift (both the post-ignition auto zoom-out and the ring-formation camera lerp) ran unconditionally every frame, silently overriding any manual adjustment on the very next frame. Added a `userCameraControl` flag, set true on first drag/wheel input, that permanently disables all scripted camera movement for the rest of that page load once triggered. Also widened the zoom-in limit (was 50, now 18).
- **Ring-formation disc morph**: settled on snapping the baked spiral's radius/angle to the nearest of a fixed set of 19 discrete bands (the 9 real orbit radii from `planet-formation-prototype.html`'s `RINGS` array, plus intermediate/outer bands out to 103.3, matching that file's real max disc extent). A more "authentic" version replicating that file's actual continuous 3-tier distribution formula was tried and reverted — it was more accurate but read as much thinner/more granular/smaller than the discrete-band version, which is what actually looked right.
- **Sun matched to the destination file's look**: `hueMode` forced to exactly 0 during the freeze (confirmed this makes cosmogenesis's own color functions produce identical RGB to `planet-formation-prototype.html`'s fixed palette), corona hidden entirely (that file's sun has none), scale left alone (explicitly NOT forced to match the smaller reference sun — rejected once already: "you made the sun smaller... do the opposite of what I wanted").
- **The big one — `T` clamp froze the entire Jupiter sequence**: after adding "settle instead of loop" behavior, `T` got clamped back to exactly `RING_FORM_END` every single frame once it passed that point. But the Jupiter beam/accretion clock (`AT = T - RING_FORM_END`) needs `T` to keep advancing past `RING_FORM_END` to do anything at all — the clamp froze `AT` at permanently 0, which explained ALL FOUR symptoms at once: no beam ever traveled, Jupiter appeared to "just pop in" instead of animating, no orbit-guide reveal, and no continued orbiting afterward. Fixed by removing the clamp for the default case — `T` now runs free past `RING_FORM_END`, matching how `planet-formation-prototype.html` itself has no such clamp either.

### Jupiter beam/accretion (scoped to first planet only)

Ported turbulence helpers, the pulse/beam shader+mesh, Jupiter's precursor cluster + solid mesh + atmosphere, and the required scene lighting (`sunLight`/`AmbientLight`/`rimA`/`rimB` — this file had none before, needed for `MeshStandardMaterial` planets to not render black) — Jupiter only, deliberately not Saturn through Pluto. Reuses the existing sun and disc, no duplicates. The pulse shader and its per-frame driving logic were verified via direct diff to be byte-for-byte/formula-for-formula identical to `planet-formation-prototype.html`'s own — any remaining visual difference is not a code discrepancy between the two files.

### Open item, not resolved this session

User reported something rendering very close to the camera once the beam/accretion phase begins. An exhaustive diff of all Jupiter-related code (geometry, shaders, tick-logic, orbit math) against the reference file found no divergence — everything matches exactly, and Jupiter's own position (26 units from origin, well inside the camera's 76-unit resting distance) isn't inherently close to the camera. Live inspection found that `userCameraControl` (see above) permanently disables scripted camera convergence once triggered by any manual drag/scroll — if the camera was manually moved close during earlier testing in the same page load, it would still be sitting there, unrelated to anything in Jupiter's own code. Asked the user to confirm whether they touched the canvas before the beam played; unconfirmed as of end of session. If it turns out NOT to be that, this needs a fresh investigation next session — don't assume it's already explained.

### A note on this session's own process

Several rounds of "test it myself in the browser" wasted real time chasing false negatives — a backgrounded automation tab throttles `requestAnimationFrame` to a near-stop, producing frozen/stale frames that look like real rendering bugs (a "dead" sun that was actually just one frozen pre-convergence frame). Reconfirmed: don't self-test this file's live behavior in the browser; report code changes and let Ricky check them in his own browser instead.

### Key files

`Aion/Frontend/Code/sun-galaxy-to-planet-formation.html` (active, the bridge + Jupiter beam), `cosmogenesis-with-nebula-intro.html` / `planet-formation-prototype.html` (untouched references throughout).

Also deleted `Aion/Frontend/Code/nebula-3d-prototype.html` this session (confirmed stale, Ricky's own call).
