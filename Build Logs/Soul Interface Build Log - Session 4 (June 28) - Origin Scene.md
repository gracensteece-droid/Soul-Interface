# Soul Interface Build Log — Session 4 (June 28)
## Topic: Origin Scene — Void → Nebula → Collapse

---

### Context / Direction Shift

Started the session with planned work on `cosmogenesis.html`. After several visual improvements (sun warp shader, ignition vortex particles, shockwave rings), Ricky made a hard pivot:

> "The whole cosmogenesis scene is now just for reference. I don't want to build in there anymore. We're building a new cosmogenesis scene."

**New direction:** Build a standalone `origin.html` using `nebula-prototype.html` as the visual reference/source — not modifying it, just using its particle system code as the foundation. Sequence: void → nebula → collapse (continuous, no buttons, purely cinematic).

---

### Files

| File | Role |
|---|---|
| `Aion/Frontend/Code/origin.html` | New build — the Origin scene (sole active file this session) |
| `Aion/Frontend/Code/nebula-prototype.html` | Reference only — untouched |
| `Aion/Frontend/Code/collapse-prototype.html` | Reference only — collapse visual/shader source |
| `Aion/Frontend/Code/cosmogenesis.html` | Reference only — abandoned for active dev |

---

### What Was Built

#### origin.html — Three-Act Particle Scene

A single continuous HTML file with no buttons, no phase breaks, fully timeline-driven.

**ACT 1 — Void (T=0-12s)**
- Pure darkness opening; quantum foam field (3,200 blue-violet specks in a sphere, drifting slowly)
- Star field starts at opacity 0, breathes in during void
- Camera starts at r=380, drifts to r=320 over the void phase
- Background: near-black with hint of violet

**ACT 2 — Nebula Formation (T=12-56s)**
- Three GPU particle layers copied from nebula-prototype, all starting at gAlpha=0:
  - **Fine spirals** (14,000 pts) — 3 logarithmic arms, hue remap crimson/teal/violet/gold
  - **Cloud puffs** (2,800 pts) — large FBM-shaped volumetric blobs
  - **Ejection sparks** (9,000 pts) — tangential burst ejection per arm
- Cloud puffs arrive FIRST immediately after void (`easeOut`) — they are the primordial formless cloud
- Fine particles enter 2s later but with `cloudScatter` offset: each particle displaced up to ±88 units in 3D (slowly seething), making them part of the same cloud mass
- As `formT` rises 0→1 over 32 seconds:
  - `cloudScatter` shrinks (`cloudiness = 1 - smoothstep(0.18, 0.92, formT)`)
  - Reveal front `formT*1.30 - normR` expands outward — core coalesces first, arms crystallize outward
  - Global `gAlpha` uses `slowForm = t^2.4` so opacity rises very slowly (ghostly for a long time)
- Sparks activate last (T=28-56s)
- All three nebula layers have `rotSpeed` and `brightMult` uniforms for spin-up control

**ACT 3 — Collapse Transition (T=56+)**
- **Dissolution phase**: `formT` driven back toward 0, arms scatter back to formless cloud
- Rotation speed builds uniformly from nebula rate toward collapse cloud vortex rate (0.32 rad/t)
- `warmBias` uniform shifts nebula hue palette from crimson/blue/violet toward warm amber/gold
- Fine particles fade and scatter, cloud puffs remain as bridge
- Collapse layers (drain, cloud vortex, jets, core glow) fade in
- `coreVisibility` builds from T=56 as pre-glow before collapse visible

**Collapse elements added (from collapse-prototype):**
- `drainMat` — 20,000 spiral-inflow particles with `cycleSpeed`-based looping
- `cvortMat` — 1,600 large FBM cloud blobs with 4.5-rotation vortex
- `jetTopMat` / `jetBotMat` — bipolar jets (white→amber top, blue→deep blue bottom)
- Core glow: 4 nested sphere meshes (white r=1.2, amber r=2.8, orange r=5.5, dark r=8.0) + PointLight
- Core animation: `bigFlash = sin(t*0.28)^8 * 1.4` — slow dramatic pulse every ~22s

---

### Key Technical Decisions

**Cloud-first formation** — Cloud puffs lead with `easeOut` (arrive fast, prominent) while fine particles use `slowForm t^2.4` (appear very slowly). The `cloudScatter` offset in fine particle vertex shader creates a seething 3D cloud that the arms condense out of. No immediate arm structure visible — it forms from chaos.

**Radial reveal (`formT`)** — `reveal = smoothstep(0.0, 0.22, formT*1.30 - normR)` in the vertex shader. Core particles (low normR) unlock first, outer arm particles last. Combined with cloudScatter collapse, creates "matter self-organising from center outward" look.

**rotSpeed uniform** — All three nebula materials have `uniform float rotSpeed` replacing the hardcoded `time*0.058`. The timeline drives this 1×→5.5× during spin-up, targeting exactly the collapse cloud vortex's native rate (`0.32/0.058 = 5.5×`) so there's no perceived speed gap at handoff.

**warmBias uniform** — fineMat and cloudMat both accept `uniform float warmBias` in vertex shader. During spin-up, shifts hue from crimson/blue/violet toward `0.08 + s*0.07` (warm gold/amber range), matching the collapse palette before it arrives so the color blend is within the same warm family.

**Camera fix** — Timeline only touches `sphTarget.r` during the void phase. After that, user controls r freely. Removed `sph.r = sphTarget.r` snap from wheel handler (smooth lerp at 0.04/frame instead). Prevents the timeline fighting user scroll.

**Core pre-glow** — `coreVisibility` starts building during the spin-up phase (`spinCurve * 0.20`) before any collapse particles appear. Provides a warm central glow that signals the approaching collapse without a jarring reveal.

---

### Final Transition Approach — Morphing Single Particle System

After iterating through several cross-fade and dissolution approaches (all of which produced a "two scenes blended on top of each other" feeling), the solution that worked was architectural: **one particle system that morphs in-shader** rather than two separate systems cross-fading.

**What was tried and rejected:**
- Spin-up + cross-fade: nebula fades out while drain particles fade in — always looked like two scenes
- Dissolution: `formT` reverses to scatter arms back to cloud first, then drain appears — better but still two systems overlapping
- Speed spikes and plateaus during ramp — perceived as stutters or stops

**What landed:**
Added `collapseT` uniform (0=nebula, 1=collapse) to both `fineMat` and `cloudMat`. Both vertex shaders now contain the collapse inward-spiral math (same as drain particles in collapse-prototype) alongside the nebula arm math. During T=56-90s, `collapseT` rises 0→1 via smoothstep, and the position, color, alpha, and point size all blend via `mix()`:

```glsl
// fineMat vertex shader (key section)
vec3 pos   = mix(nebulaPos,   collapsePos,   collapseT);
float hue  = mix(nebulaHue,   collapseHue,   collapseT);
float lum  = mix(nebulaLum,   collapseLum,   collapseT);
vColor     = hsl2rgb(hue, sat, lum) * brt;
vAlpha     = mix(nebulaAlpha, collapseAlpha, collapseT);
gl_PointSize = mix(nebulaPtSz, collapsePtSz, ct) / -mvPos.z;
```

**Why movement never stops:** both `nebulaPos` and `collapsePos` are continuously evolving every frame (nebula uses sin/cos drift, collapse uses `loopT = fract(time*cycleSpeed+s)`). The blend between two always-moving states is always moving — there is no moment where any particle is stationary.

**collapseT timeline (T=56-90s):**
- `collapseT = smoothstep(cSub)` — 34 second morph window
- `rotSpeed` ramps from base (0.058/0.026) to 0.32 alongside collapseT
- `warmBias` shifts hue palette toward amber/gold (easeOut)
- Sparks fade out quickly (`gAlpha = max(0, 1 - cSub*3)`)
- Core glow builds as `coreVisibility = cCurve²`
- Background and hazes shift warm

**Separate collapse particle systems (drainMat, cvortMat, jetTopMat, jetBotMat) are no longer needed for the core transition** — the same 14,000 fine particles and 2,800 cloud puffs that form the nebula become the collapse visually. The core sphere meshes and PointLight remain for the ignition glow.

---

### Next Session Starting Point

The morph transition is working well. Potential next steps:
- Sun ignition — the `bigFlash = sin(t*0.28)^8 * 1.4` core moment, build out the bright flash and solar wind after collapseT=1
- Extend sequence: after collapse completes, transition to the solar system scene
- Consider adding jets (jetTopMat / jetBotMat) back in after collapseT=1 as a bonus visual layer on top of the morphed particles
