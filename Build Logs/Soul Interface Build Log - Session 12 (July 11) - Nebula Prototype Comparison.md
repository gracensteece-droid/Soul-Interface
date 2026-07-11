# Soul Interface Build Log — Session 12 (July 11)
## Topic: Nebula Prototype Comparison — Procedural, Real Photo, and 3D Sculpt

---

### What We Did

Ricky asked to see the existing procedural nebula prototype running, then wanted to know if it was built from real reference imagery the way earth/sun are (it wasn't). That led to building two new comparison prototypes and attempting — then critiquing — a true 3D particle-sculpt approach.

---

### Part 1 — Running the Existing Procedural Nebula

Spun up `nebula-prototype.html` (`Aion/Frontend/Code/`) on a local static server, screenshotted via headless Chromium (Playwright) to confirm it renders. It's a 3-layer particle system — fine spiral arms, FBM-textured cloud puffs, ejection sparks — entirely generated from shader math. No real imagery anywhere in it.

Confirmed this is a different pipeline than the planets: `download_textures.py` pulls real NASA photos (`tex_earth.jpg`, `tex_sun.jpg`, etc.) from Solar System Scope and wraps them on spheres. The nebula prototype does none of that.

---

### Part 2 — Real Photo Prototype

Downloaded the actual Hubble/JWST-processed "Pillars of Creation" (Eagle Nebula, 2014 WFC3-UVIS, NASA/ESA, public domain) from Wikimedia Commons into `Aion/Frontend/Code/textures/tex_nebula_pillars.jpg`. Built `nebula-photo-prototype.html` — same orbit-camera rig as the procedural one, but the real photo mapped onto a flat plane. Nebulae aren't photographed from all sides the way planets are (no spacecraft orbits them), so there's no way to UV-wrap one onto a sphere like `tex_earth.jpg`.

---

### Part 3 — 3D Particle Sculpt (Rougher Result, Ultimately Rejected)

Ricky then asked for a true 3D, orbitable version shaped like the real photo, rather than either the flat plane or the (unrelated-looking) procedural spiral. Built `nebula-3d-prototype.html`: three tapered, leaning particle columns with frayed fingertips, meant to read as rim-lit dust pillars. Took three debugging passes to get even legible:

- **v1** — the background gas layer completely washed out the pillar shapes; additive blending stacked too aggressively across overlapping soft puffs.
- **v2** — fixed the wash-out, but colors came out neon green. Root cause: interpolating hue *angle* directly from rust (0.06) to cyan (0.58) sweeps straight through yellow/green on the color wheel. Fixed by blending the two target RGB colors instead of the raw hue value.
- **v3** — fixed the core/rim balance so the body reads mostly dusty rust with a thin cyan rim, closer to the photo's silhouette-against-glow read.

**Ricky's verdict: still not good enough** — reads as a blob of dots, not a real dust structure. Assessment on reflection: this isn't a skill ceiling, it's a technique mismatch. Point-sprite particles are good at soft diffuse gas (why the procedural spiral works), but bad at holding a specific, recognizable structured silhouette. A convincing 3D pillar would need raymarched volumetric density (3D noise field + lighting evaluated per-pixel in a fragment shader) or a displaced/sculpted mesh — not scattered points. Not pursued further this session; open decision for next time.

---

### Current State

All three nebula prototypes exist **only** in an isolated worktree + a pushed branch — **not in the main checkout**:

- Worktree: `.claude/worktrees/quizzical-waddling-harp` (temporary — may get cleaned up)
- Branch: `worktree-quizzical-waddling-harp`, pushed to `origin`
- Compare link: https://github.com/gracensteece-droid/Soul-Interface/pull/new/worktree-quizzical-waddling-harp

Commits this session:
```
3bc5226  Add 3D-sculpted nebula prototype referencing Pillars of Creation
87330e2  Add photo-based nebula prototype using real Hubble imagery
```

Files added (all under `Aion/Frontend/Code/`): `nebula-photo-prototype.html`, `nebula-3d-prototype.html`, `textures/tex_nebula_pillars.jpg`.

### Dev Servers (from `Aion/Frontend/Code/`)
```
py -m http.server 8792
```
Then open `nebula-prototype.html`, `nebula-photo-prototype.html`, or `nebula-3d-prototype.html`.

---

### Note: Sun/Earth Work Is Not From This Session

Ricky asked about a "new sun prototype" and "earth configured into the index" — checked the main checkout directly, and neither is from this conversation:

- `Aion/Frontend/Code/sun-prototype.html` was last modified **July 5**, before this session.
- `index.html` / `planet.html` have uncommitted local edits (59 / 85 lines respectively) already sitting in the main checkout on `master` — untouched by this session.
- `Aion/Frontend/sun/` (a full Vite/Theatre.js scene, parallel to `Aion/Frontend/origin/`) is already committed to `master` at `ad46ed0`.

None of that needs special "access" — it's already sitting in the normal working directory. Flagging this because it suggests a possible cross-session mix-up worth double-checking (this session only touched nebula files).

---

### Next Session

- Get the nebula branch (`worktree-quizzical-waddling-harp`) merged into `master` or pulled into the main checkout — right now it only exists on the isolated worktree + pushed branch, so it won't show up in Ricky's normal working directory until then.
- Decide whether to pursue the raymarched-volumetric approach for a real 3D nebula, or drop the 3D-sculpt idea and stick with the procedural spiral as the strong version.
- The uncommitted `index.html` / `planet.html` / `download_textures.py` / `textures/` changes in the main checkout are still sitting there, unrelated to this session's work — worth committing or reviewing whenever that thread gets picked back up.
