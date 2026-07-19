# Soul Interface Build Log — Session 15 (July 12)
## Topic: Volumetric Raymarched Nebula, a Real GPU Crash, and a Live Density Control Panel

---

### What We Did

Late-night session picking up from the nebula work in Sessions 12/14. Ricky watched a space documentary, liked the intricacy and scale of the real nebula footage, and wanted to push `nebula-prototype.html` (the procedural particle spiral) toward that level of visual depth using Three.js. This turned into building an entirely new technique — raymarched volumetric density fields — hitting a real GPU crash while scaling it up, diagnosing and fixing the actual cause, and ending with a live in-browser control panel for tuning and adding clouds without touching code.

New file: `Aion/Frontend/Code/nebula-volumetric-prototype.html` (not committed until this session's log entry — see Current State).

---

### Part 1 — Choosing the Technique

Reviewed several documentary screenshots (nebula close-ups, spiral galaxies, an asteroid field) with Ricky — the throughline across all of them was thread-like dust lanes threading through backlit, translucent gas, which point-sprite particles (the existing `nebula-prototype.html` / `nebula-3d-prototype.html` approach) fundamentally can't produce — that technique was already flagged as hitting its ceiling back in Session 12.

Ricky pointed to a reference repo, [beatsaway/three-volumetric-clouds](https://github.com/beatsaway/three-volumetric-clouds), which uses real raymarching (ray-box intersection, Beer's-law transmittance accumulation, pre-baked 3D Perlin-Worley noise textures) — the Nubis Evolved-style technique real volumetric cloud renderers use. Adapted the core idea for a **self-luminous nebula** instead of an externally-lit atmospheric cloud: no directional-light shadow marching needed, since the gas emits its own color based on how deep the ray has traveled through dense material. Noise is generated in-shader (hash-based 3D value noise + fbm) rather than pre-baked 3D textures, keeping it a dependency-free single file like the other prototypes.

---

### Part 2 — Scaling Up, and a Real GPU Crash

Built a single raymarched box first, verified it rendered correctly, then per Ricky's "treat this as one small puzzle piece, add more layers" direction, scaled up to a cluster of separate boxes (4 → 8 → 12 → 16), each with its own draw call, non-uniform size (for elongated "filament" shapes), and a shared warm gold→maroon palette (`warmPalette()`) so the pieces read as one entity instead of a rainbow of separate objects — an early attempt at scattered hues got explicit pushback ("doesn't seem like the same entity").

At 16 overlapping pieces, zooming in close made the browser **freeze and eventually crash the GPU process** (`GL Driver Message: GPU stall due to ReadPixels`, GPU process exit code 143). Diagnosed methodically rather than guessing:
- A single volume survives aggressive zoom/interaction stress-testing fine.
- Binary-searched the actual ceiling: **8 overlapping volumes survived, 10 crashed** — confirmed the cause was total overdraw from stacked full-screen raymarch draws, not camera distance or any single piece's cost.
- Attempted the "architecturally correct" fix — merging all pieces into one shared raymarch pass with a per-sample blob-distance-check loop — but the nested-loop shader was too expensive to even compile/run reliably, and was reverted.
- Landed on: separate draws (proven to work), but with noise octaves cut (4→3), step counts cut hard (up to 84→up to 50), and the minimum camera-zoom distance raised so the camera can't sink inside overlapping boxes. Re-verified against the same stress test that originally crashed it — passed clean.

**Caveat documented and repeated to Ricky throughout:** the sandbox this session runs in renders on a software CPU fallback (`--enable-unsafe-swiftshader`, visible in the Playwright launch flags), not a real GPU — even a single volume only hit ~4fps sustained there. That means the *relative* findings (piece-count ceiling, overdraw as root cause) are trustworthy, but absolute performance numbers aren't — Ricky's real hardware is the actual test, and he confirmed the trimmed 8-piece version felt smooth live.

---

### Part 3 — Rebuilding Density and Texture on the Safe Foundation

With the crash fixed, iterated back up per Ricky's requests, each time re-verifying render correctness:
- Restored the 8 pieces cut for safety (rose/violet reach, a thick bridge cluster, a distant backdrop layer) — back to 16, with density thresholds lowered ~0.03 across the board for "much more dense."
- Added a ridged-noise vein/dust-lane texture reusing the same erosion noise sample (no extra cost) — first attempt over-eroded the whole cloud (too thin), second attempt made veins imperceptibly thin; landed on a bold/thick middle ground plus a small base-density boost to compensate for the erosion.
- "No open space, bound together" ask: widened each piece's own falloff edge (free — no new draw calls) so neighbors blend at their seams, added 3 small cheap gap-filler pieces at the specific visible seams, and briefly added a big ambient haze layer — which Ricky said looked bad (washed out the color saturation) and asked to be cut entirely; removed it, kept the falloff widening + gap-fillers.
- Blur complaint: correctly diagnosed as the low step counts (from the crash fix) plus the widened falloff both softening things — bumped step counts specifically on the 6 "hero" pieces nearest camera, added a higher-frequency fine-grain noise octave, and pulled the falloff back in partway (still wider than original, less mushy than the gap-filling version).
- Round star sprites: `PointsMaterial` renders square sprites by default; added a small canvas-generated radial-gradient disc texture as the point `map` so stars read as soft circles instead of squares.

---

### Part 4 — Live Density Control Panel

Ricky asked for a way to control cloud density interactively to blend pieces together, rather than editing code and reloading each time. Required first converting `densityThreshold`/`erosionStrength` from values baked directly into the GLSL source at shader-compile time into real `uniform float`s that can be updated every frame with no recompile.

Built an in-page panel (top-right, collapsible):
- **Global density boost** slider — offsets every piece's threshold at once (the main "blend everything" control).
- **Global vein strength** slider — multiplies erosion strength across all pieces.
- **19 individual sliders**, one per named piece (Core, Filament, Wall, Top Pocket, Bridging Arm, Hot Knot, Far Streamer, Gap Filler, Rose Reach 1/2, Bridge A–D, Backdrop A/B, Seam Fill 1–3), each independently adjustable without touching the others.

Verified live: pushing the global slider to max visibly increased density and merged pieces together in a screenshot taken immediately after the simulated drag, no reload involved.

Then started building an **"+ ADD CLOUD"** feature — spawn a new volume with its own position (X/Y/Z), size, and density sliders plus a remove button, so new pieces can be placed and tuned entirely from the panel. Required refactoring each piece's mesh to a unit cube + `mesh.scale` (instead of baking size into the geometry) so position/size can change live. **This part is not yet verified working** — two attempts to test the add/move/remove flow both got interrupted before completing, and Ricky was told directly that it hasn't been confirmed end-to-end yet. A piece-count warning (past 20) was added to the panel given the crash history.

---

### Current State

**Nothing from this session is committed yet.** `nebula-volumetric-prototype.html` and this build log both sit uncommitted in this worktree (`.claude/worktrees/quizzical-waddling-harp`) — committing this log now; the code file should be committed alongside it or in a follow-up, whichever Ricky prefers given the add-cloud feature isn't fully verified.

Also worth flagging: this worktree's branch is currently even with `origin/master` at commit `2a342db` (Session 12's log) — it does **not** have Sessions 13 or 14, which exist only as local, unpushed commits in the main checkout (`C:\Users\...\soul-interface`, not this worktree). The two checkouts have diverged; nothing broken, just worth knowing before assuming one has everything the other does.

### Next Session

- Verify the "+ ADD CLOUD" flow actually works end-to-end (add, reposition via sliders, resize, remove) — untested as of this log.
- Commit `nebula-volumetric-prototype.html` once the add-cloud feature is confirmed working.
- Reconcile the worktree vs. main-checkout branch divergence at some point — Sessions 13/14 + the earth/sun texture work exist only as unpushed local commits in the main checkout.
- Open question from Ricky: whether to keep pushing density/population further now that there's a live panel for it, or move on to a different aspect of the nebula (camera controls, lighting, etc).
