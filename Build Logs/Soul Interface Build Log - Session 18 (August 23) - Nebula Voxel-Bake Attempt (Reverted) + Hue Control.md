# Soul Interface Build Log — Session 18 (August 23)
## Topic: A Voxel-Bake Rewrite of the Volumetric Nebula, Abandoned After It Couldn't Be Verified, Then a Per-Cloud Hue Control

---

### What We Did

Started by spinning up the cosmogenesis scene (static frontend server on port 3000 — no backend needed, since cosmogenesis' keyframes are localStorage-only, not server-backed). Ricky then asked for "the nebula server where I had it customized to add clouds" — that turned out to be `nebula-volumetric-prototype.html` from Session 15, which only existed on branch `worktree-quizzical-waddling-harp`, not in this main checkout. Copied it over (untracked at first).

Ricky asked why it slows down so much adding more clouds, and whether hundreds of clouds are possible. Diagnosed the real cause (below), proposed and implemented a full rewrite to fix it, but the rewrite could not be verified working — the Chrome browser tool was disconnected all session, so every check had to go through Ricky manually screenshotting the page. After several rounds of that turning up a real-looking visual regression that couldn't be pinned down, Ricky said the approach didn't have "enough power... to want to build what I need to" and asked to revert. The file was restored to its exact pre-session state from the worktree branch, and only a small, low-risk feature (a per-cloud hue slider) was added on top and committed.

---

### Part 1 — Diagnosing the Slowdown

Session 15's technique draws each cloud as its own transparent box with its own full raymarch shader. Overlapping boxes force the GPU to re-run the whole raymarch loop per overlapping piece per pixel — this was already known from Session 15's binary search (8 pieces safe, 10 crashed) but Ricky hadn't seen the mechanism spelled out. Explained: cost scales with (cloud count × screen overlap × steps × noise cost), not cloud count alone, and the file was already sitting at 19 pieces — right at the edge of survivable overdraw. Conclusion given directly: hundreds of clouds is **not possible** with this architecture no matter how much per-piece cost gets trimmed; it needs a different technique (a single baked 3D density field raymarched once) or a fallback to point-sprite particles (cheaper per-particle, but loses the structured-silhouette look the raymarch approach was built for).

Ricky chose to pursue the voxel-bake rewrite.

---

### Part 2 — The Voxel-Bake Rewrite (v2)

Planned via plan mode, then implemented as a full rewrite of `nebula-volumetric-prototype.html`:
- Merged all 19 clouds (same centers/sizes/seeds/thresholds/palettes carried over) plus any custom-added ones into a single CPU-baked 72³ `THREE.DataTexture3D` (RGB = blended tint, A = soft-union falloff envelope), rather than 19+ separate draw calls.
- Single box mesh, single `GLSL3` shader (needed for `sampler3D`), one raymarch pass per pixel — cost now decoupled from cloud count.
- Per-cloud threshold sliders bake into how strongly that cloud contributes to the merged envelope (rather than being sampled live, which would've needed a second texture channel).
- Real-time fine noise (macro/wisps/grain/veins — same math as v1) still evaluated live per step, once, for the "alive" animated look, layered on top of the baked macro shape.
- Added a "+ ADD N CLOUDS" bulk-add control (default 20) since one-at-a-time clicking can't practically reach "hundreds."
- Added localStorage persistence for the whole cloud list + global sliders (same pattern as cosmogenesis' keyframes) — this was a genuine gap in **both** v1 and v2: custom-added clouds only ever lived in page memory and were lost on every reload, which caused real confusion mid-session (see Part 3).

---

### Part 3 — Verification Breakdown

The Chrome-in-browser tool was disconnected all session (`tabs_context_mcp` failed with "extension not connected" on repeated attempts), so there was no way to drive or inspect the page directly. Verification had to go entirely through Ricky pasting screenshots, which produced a slow, confusing loop:
- First report ("way smaller") turned out to be Ricky's previously-added custom clouds simply being gone — expected, since neither version had ever persisted them (fixed by the localStorage work in Part 2, plus a real row-rendering bug it surfaced: restored custom clouds weren't getting their position/size/remove controls back).
- Second report, after confirming (via a debug readout added to the panel: `last bake: Xms for N clouds`) that Ricky really was on the new code with 120 clouds: the nebula visibly rendered smaller/truncated with what looked like a hard geometric edge, compared to the old 19-piece reference screenshot.
- Extensive code-level review of the bake loop and shader (coordinate math, box-intersect, texture indexing) found no obvious bug. Best remaining theory offered: the scene's pre-existing slow camera auto-rotate (`sphTarget.theta += 0.00038`/frame, unchanged from v1) had simply drifted the view since page load, swinging the off-center far structure (Rose Reach, Backdrop, Bridge chain) out of frame while the origin-centered core stayed put — untested before the session ended.

Ricky called it here rather than continuing to iterate blind. This is a legitimate outcome, not just impatience: **without the browser tool connected, this rewrite could not actually be verified**, and continuing to guess from screenshots was costing more than it was worth.

---

### Part 4 — Revert, Then a Small Real Feature

`Aion/Frontend/Code/nebula-volumetric-prototype.html` was restored verbatim from `worktree-quizzical-waddling-harp` (`git show <branch>:<path> > <path>`), discarding the entire voxel-bake rewrite and the localStorage work. Back to Session 15's known-working per-piece version, known ~20-cloud ceiling and all.

On top of that restored file, added one small, low-risk feature Ricky asked for: a **HUE slider** per cloud (both the original 19 and any custom-added ones), in the existing control panel. Rotates that cloud's rim *and* deep color together (preserving their original relative contrast) via `setHSL()` on the already-live `uRimColor`/`uDeepColor` uniforms — no shader recompile, no rebake, works exactly like the existing density slider. Captured each piece's original hue/sat/lum at creation time in `mat.userData` so the rotation has a stable reference point.

Committed **only** this file (`5571083`) — left the other pending changes already sitting in the working tree (cosmogenesis.html, sun-texture-test.html, the Maren doc, `.claude/worktrees/`, two screenshots, `videos/`) untouched, since those belong to other sessions and weren't part of this work.

---

### Current State

- `Aion/Frontend/Code/nebula-volumetric-prototype.html` is committed on `master` (`5571083`): Session 15's per-piece raymarch technique, unchanged, plus the new per-cloud hue slider. No voxel-bake code remains.
- The frontend static server (port 3000) was left running in the background from earlier in the session for testing.
- Still uncommitted in the working tree, untouched this session: `Aion/Frontend/Code/cosmogenesis.html`, `Aion/Frontend/Code/sun-texture-test.html`, `Vision & Architecture/Seers/Maren/01 - The Twelve Houses as Landscapes.md`, `.claude/worktrees/`, two texture screenshots, `videos/`.
- The Chrome browser tool was not connected at any point this session — worth checking at the start of next session before attempting anything that needs visual verification.

### Next Session

- If hundreds of clouds is still the actual goal, the voxel-bake technique is still the right direction conceptually — it just needs to be built and verified with the browser tool actually connected, not through a screenshot-relay loop.
- Otherwise: the particle-based `nebula-prototype.html` (procedural spiral, already liked per Session 12) remains the fallback if Ricky wants to drop the raymarch approach entirely for a "many clouds" scene.
- The auto-rotate-drift theory for the "looks smaller" symptom was never actually confirmed or denied — moot now that the rewrite was reverted, but worth remembering if a similar "looks different after I stepped away" report comes up again with this camera rig.
