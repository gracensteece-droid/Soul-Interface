# Soul Interface Build Log — Session 3 (June 27)
## Topic: Solar System Visual Animation

---

### What Was Done

#### Orbit Ring Animation
- Replaced all 9 orbit ring `MeshBasicMaterial`s with `ShaderMaterial`
- Shader uses `vUv.x` (0→1 around the torus circumference) with two overlapping sine waves creating a moving bright/dim arc pattern
- Wave 1: 1 lobe sweeping around the full ring
- Wave 2: 3 lobes at 60% of wave 1's speed — creates organic moire interference
- Speed formula: `0.08 + pd.d * 0.0026` so outer rings shimmer faster than inner ones
- Opacity fades near-invisible at trough (`shimmer * 1.35`), returns to full color at peak
- `baseOp` uniform synced each frame from `material.opacity` so all existing cosmo fade-in/fade-out code works unchanged

#### Asteroid Belt Animation
- Replaced the main belt `PointsMaterial` (2500 pts) with a `ShaderMaterial`
- Spatially coherent two-wave brightness sweep around the ring (same technique as orbit shimmer) so a visible bright region moves around the belt rather than random independent flickers cancelling out
- Full HSL color system via inline `hsl2rgb()` in the vertex shader
- Hue remapped to skip yellow/green: lower half → reds/oranges (0.0–0.15), upper half → blue-violet/pink (0.55–0.90)
- Saturation 0.70, lightness 0.42 — cosmic/deep rather than neon candy
- Point size varies subtly with brightness wave (0.09→0.16) for added texture
- `baseOp` uniform synced from `material.opacity` each frame, cosmo fade-in preserved

---

### Key Technical Decisions
- Using world-space angle (`atan(position.z, position.x)`) as the spatial coordinate for the belt wave — this naturally maps to the ring's circumference regardless of point distribution
- Orbit shader reads `vUv.x` from `TorusGeometry` UVs which already go 0→1 around the major circumference — no extra attributes needed
- Both wave pairs have irrational speed ratios so the combined pattern never exactly repeats

#### UI & Camera
- Removed seer name cards (Maren, Aion, Arya) from bottom of `index.html` — solar system now fills the full screen
- Removed phi auto-drift that was pulling the camera back to the default top-down angle after every interaction
- Camera now stays exactly where the user leaves it — only the slow horizontal theta rotation persists to keep the system feeling alive
- Default starting phi changed from `0.40` → `0.65` for a more oblique, cinematic opening angle

---

### Three.js / Space Visual Resources (for next session)
- **GitHub topics**: `github.com/topics/threejs` — filter by stars/recent. Search `three.js space`, `three.js galaxy`, `three.js solar system`
- **Shadertoy** (`shadertoy.com`) — GLSL fragment shaders, translates directly to Three.js ShaderMaterial. Search `nebula`, `space`, `black hole`, `star field`. Best source for cinematic space visuals
- **Three.js official examples** (`threejs.org/examples`) — always current version, covers particles, shaders, post-processing
- **Bruno Simon / Three.js Journey** (`threejs-journey.com`) — galaxy generator chapter is the basis for the GalaxyThreeJS repo we referenced. Code ends up on GitHub
- **Codrops** (`tympanus.net/codrops`) — high quality art-forward Three.js experiments with full source
- **r/threejs** on Reddit — community demos with repos, posted regularly

---

### Architecture Note (Important)
The plan is NOT to keep building on `index.html`. Instead:
- Build cosmogenesis as its own standalone experience (already started in `Aion/` folder)
- Once cosmogenesis is complete, **rebuild `index.html` from that** — cosmogenesis becomes the entry point, seer selection flows out of it
- Today's visual work on `index.html` (orbit shimmer, asteroid belt, camera) serves as a **visual reference and prototype** for what the cosmogenesis build should feel like
- Don't let changes to `index.html` block or dictate the cosmogenesis standalone build

### Next Session Starting Points
- Pick up the cosmogenesis standalone build (`Aion/` folder) using today's visual language as the target aesthetic
- Reference Shadertoy for any specific effects (nebula, particle fields, etc.)
- Sun corona and comet/shooting-star effects are good candidates when ready to push further

---

### Longer-Term Architecture Thinking (House Environments + Generative Assets)

#### The Problem
When the build reaches the 12 house environments, each house needs to feel genuinely different *per user* based on birth data — not just different colors but different geometry, soundscape, and visual texture. Pure Three.js procedural generation probably can't carry that alone at the level of specificity this app needs.

#### The Proposed Shift
Move toward a **two-layer architecture**:
- **Three.js = structural/interactive skeleton** — solar system, cosmogenesis, camera, transitions, the frame that holds everything
- **ElevenLabs + Meshy = personalized generative layer** — assets created per user from birth data, composited into the Three.js skeleton

This is closer to "remixing environments" than traditional app development — each user's house visit generates a unique environment (3D mesh from Meshy, audio texture from ElevenLabs, video environment) that gets pulled in on top of the structural layer.

#### Why This Matters for the App's Identity
This makes it genuinely AI-native — not a chatbot with a pretty background, but something that feels built specifically for that person. The seer voices were always part of this, but the vision is expanding: the *whole environment* responds to who you are, not just the text output.

#### Key Technical Challenge: Latency + Caching
Generating Meshy assets and ElevenLabs audio per user per house visit in realtime will be slow. Likely solution:
- Run a generation pipeline when the user first inputs birth data
- Pre-generate and cache all 12 house environments before they ever enter one
- This shapes backend architecture early — worth thinking about before the house build begins

#### To Research Before That Phase
- What does Meshy's API actually support for programmatic/API-driven generation?
- ElevenLabs capabilities beyond voice — video, sound design, environmental audio
- How to structure the caching/generation pipeline (likely a background job queue)
- Whether Three.js + composited generative assets is the right stack or if something else fits better at that layer
