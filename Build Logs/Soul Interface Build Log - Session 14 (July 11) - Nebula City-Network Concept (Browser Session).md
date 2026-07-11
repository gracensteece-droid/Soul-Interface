# Soul Interface Build Log — Session 14 (July 11)
## Topic: Nebula "City/Network" Concept — Scaling the Spiral Prototype (Separate Browser Session)

---

### What We Did

This was a **different Claude session entirely** — a browser-based session working directly against the live `nebula-prototype.html` tab (`localhost:8791`, from Session 12's worktree work), not this background job. Ricky asked to have its progress logged here too, so this is a reconstruction from the pasted transcript, not something this session built or verified directly.

---

### Part 1 — Reference Comparison

Ricky compared his `nebula-prototype.html` tab against a YouTube Short, "Realistic 3D Nebula Animation in Blender" by @nakobaev, and asked whether he could build something at that scale in Blender. The video reportedly failed to actually play/render in that browser session, so the comparison leaned on the video's title and general Blender-nebula conventions (volumetric density via layered Noise/Musgrave textures, Geometry Nodes filament networks, blackbody emission gradients) rather than frame-by-frame analysis.

Ricky clarified he wants this **in Three.js**, not Blender — matching what he's already built.

---

### Part 2 — Code Analysis of the Existing Spiral Prototype

The other session inspected the live `nebula-prototype.html` page directly and correctly identified its structure: Three.js r128, custom spherical-coordinate orbit camera, and three additive-blended `THREE.Points` particle populations (14,000 fine dust / 2,800 cloud / 9,000 spark — matching [[project_nebula_prototype_comparison]]) distributed along spiral arms via polar math, with a GLSL hue-remap for the cyan-to-violet palette and a separate haze shell faking volumetric glow. Correctly noted it's a particle illusion, not real volumetric rendering — which is exactly why it scales cheaply.

---

### Part 3 — The "City/Network" Design

Proposed treating the existing spiral generator as a reusable function rather than a one-off scene:

- **`spawnCluster(center, scale, ...)`** — a "building": a smaller instance of the same spiral-arm particle logic, positioned at an arbitrary hub location.
- **`connectHubs(a, b, ...)`** — a "street": particles sampled along a `THREE.CatmullRomCurve3` between two hub centers, tinted with the same hue-remap so filaments visually match the clusters they connect.
- **`generateHubs(count, minDist, bounds, ...)`** — simple randomized hub placement with minimum spacing (a "city plan").
- Everything concatenated into **one merged `BufferGeometry`/`Points` object** — the key performance decision, since a real "city" of dozens of clusters plus filaments could reach millions of vertices, and merging keeps it to a single GPU draw call regardless of hub count.

Flagged as open follow-ups (not yet built): level-of-detail (full particle density only for hubs near the camera, coarser for distant ones), and upgrading the camera rig from single-target orbit to free-fly/pan-zoom (`FlyControls`/`OrbitControls`) so a viewer can actually travel through the network instead of orbiting one fixed point.

---

### Part 4 — Live Demo (Ephemeral — Not Saved Anywhere)

The other session spun up a working demo of six hub clusters connected by curved filament streets, injected as an **overlay directly into a live browser tab** — not written to any file. Ricky confirmed it looked right (six nebula "buildings" with spiral structure, connected by glowing streets, auto-rotating).

**This code does not exist anywhere on disk.** It only lived in that browser tab's live DOM/JS state and in the chat transcript pasted into this session. The other session explicitly flagged this: the overlay disappears on refresh or navigation, and camera drag/zoom was never wired up (auto-rotate only). This is the same failure mode as Session 13's `sun-texture-test.html` scratchpad — real, working code that will be lost the moment the tab closes unless it's deliberately saved into the repo.

---

### Current State

Nothing from this session has been committed — this log entry is a **record of a design concept and working code that currently only exists in a chat transcript and a live browser tab**, not a description of repo changes. The actual code snippets (`hueRemap`, `spawnCluster`, `connectHubs`, `generateHubs`, and the assembly block) are preserved in the source conversation Ricky pasted, but not yet extracted into a real `.html` file in `Aion/Frontend/Code/`.

### Next Session

- **Recover this before it's lost**, same as the sun-texture-test situation: build a real `nebula-network-prototype.html` (or similar name) in `Aion/Frontend/Code/`, reusing the existing `nebula-prototype.html` camera rig and hue-remap shader, with the pasted `spawnCluster`/`connectHubs`/`generateHubs` code wired in and actual drag/zoom controls (not just auto-rotate).
- LOD (distance-based particle density) and a free-fly/pan-zoom camera are both still open design questions, not yet implemented anywhere.
- Worth deciding whether "the whole network is one merged Points object" stays the long-term approach as hub count grows, or whether it'll need chunking/culling later.
