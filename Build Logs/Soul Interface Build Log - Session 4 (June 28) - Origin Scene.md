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

---

### Sun Ignition — Added This Session

After the morph completes (`collapseT=1`), the scene bursts into the sun. All still in `origin.html`.

#### Sun elements added
- **`sunMat`** — SphereGeometry(2.4, 64, 64) with FBM lava shader. Uniforms: `time`, `hueMode`, `emergence`, `distort`.
- **`coronaGroup`** — 5 billboard PlaneGeometry planes (18, 34, 56, 85, 28 units) with additive blending, `globalAlpha` uniform fades them in. SDO palette color cycling post-ignition.
- **`flashMesh`** — large SphereGeometry(55) BackSide additive sphere for the initial white burst.
- **Solar prominence loops** — 10 bezier arc emission loops (`loopMat`), `bezP()` helper, world-space radius aware.

#### Key shader features

**Vertex ripple** — sphere geometry physically undulates:
```glsl
float ripple = (r1*0.5 + r2*0.35 + r3*0.15) * distort * 0.09;
vec3 displaced = position + normalize(position) * ripple;
```
Three overlapping sin/cos waves at different frequencies and speeds. Amplitude tuned to 0.09 (was 0.22 — dialed back so it flows rather than shatters).

**Fragment domain warp** — FBM domain distorted with low-frequency waves (amplitude 0.65) when `distort > 0`. Combined with vertex ripple this creates a full melting/flowing look at max distort.

**`emergence` uniform** — blends between pure white-hot (`vec3(1.8,1.5,1.0)`) and the full FBM palette. At 0 the sun looks like part of the flash. At 1 it has full surface detail.

#### Ignition trigger fix
The original `bigFlash > 0.80` trigger fired only at narrow peaks every ~22s and was timing-dependent — sun never appeared reliably. Replaced with immediate trigger: fires as soon as `collapseT >= 1.0`. The flash moment itself creates the visual peak.

#### Continuous ignition sequence (IGNITE_DUR = 4s)

Replaced 5-phase if/else (which had value discontinuities at boundaries causing cartoonish feel) with a single `pct` variable driving continuous mathematical curves:

| What | Curve |
|---|---|
| Sun scale | `1.0 + 21.0 * exp(-pct * 5.2)` — exponential decay from 22→1 |
| Distort | `max(0, sin(π * min(1, pct/0.78)))^0.75` — bell curve, peaks at pct=0.39 |
| Emergence | `smoothstep(0.68, 1.0, pct)` — late fast ramp |
| Flash | Arc function peaking at pct=0.14, gone by 0.50 |
| Particle dissolve | `max(0, 1 - pct*7)` — soft fade (not pop) |
| Corona/loops | Rise from pct=0.80 via `easeOut((pct-0.80)/0.20)` |

**Cloud-scale start**: when ignition fires, `sunMesh.scale.setScalar(22.0)` — the sun appears at the same apparent size as the departing nebula clouds. The sequence is the cloud *becoming* the sun (shrinking into itself), not a small sun appearing from nowhere.

#### Glitchiness polish
- **Vertex ripple amplitude**: `distort * 0.22` → `distort * 0.09` — surface flows, doesn't spike
- **Fragment warp amplitude**: `distort * 1.4` → `distort * 0.65` — texture shifts, doesn't shatter
- **Particle dissolve**: `pct * 11` → `pct * 7` — particles melt into the flash over ~0.57s instead of popping at 0.36s

#### Other fixes this session
- **Ring silhouettes removed** — `hazeRed`, `hazeBlue`, `hazeGold` were sphere meshes rendering as filled dark discs. Replaced with JS stub objects `{ material:{ opacity:0 } }`. Same property shape so timeline writes don't error, nothing renders.
- **Green collapse particles fixed** — `collapseHue` at low `heat` was bleeding green. Added warm bias: `collapseHueBiased = mix(collapseHue, 0.07+s*0.06, (1.0-heat)*warmBias)` in the fine particle vertex shader.
- **Camera pull-in reduced** — collapse phase now goes 320→135 (was 320→75). Ignition phases stay around 95–135.
- **Morph window tightened** — `T_COLL_END` reduced 90→74. Faster pacing to ignition.

---

### Galaxy Spiral — Added This Session

After ignition completes, particles fly outward from the sun and self-organise into a two-arm logarithmic spiral galaxy over `GALAXY_DUR = 12` seconds. All in `origin.html`.

#### Galaxy particle system (`galaxyT` uniform)

The existing 14,000 fine particles morph from their collapse-inward positions into galaxy star positions via `galaxyT` (0→1 easeIn, 12 seconds):

```glsl
// Logarithmic spiral arm math in fine particle vertex shader
float armIdx   = step(0.5, fract(s*3.71));
float armOff   = armIdx * 3.14159265;         // two arms 180° apart
float gR       = 25.0 + fract(s*7.31)*230.0; // radius 25–255 units
float gTheta   = armOff + (gR/75.0)*2.8 + (fract(s*5.19)-0.5)*0.55;
float gX       = gR*cos(gTheta) + spread*cos(gTheta+1.5708);
float gZ       = gR*sin(gTheta) + spread*sin(gTheta+1.5708);
vec3 galaxyPos = vec3(gX, gY, gZ);
pos = mix(pos, galaxyPos, galaxyT);
```

Star colors: warm gold/amber (`0.06-0.11` hue) or blue-white (`0.57-0.65`) mixed 78/22%.

#### Dense galaxy disc (`galaxyDiscMat`, 28,000 particles)

Separate system adds density independent of the morph:
- 12% core (tight clustering), 60% tight spiral arms, 28% halo
- **Differential rotation vertex shader**: `rotT = time * max(0.003, 0.014 - radius*0.000042)` — inner particles orbit faster than outer, simulating gravitational rotation
- Fades in via `gAlpha = min(1.0, gtCurve * 1.5)`

#### Post-ignition camera
- Camera pulls back from r=95 → r=305 over 12 seconds as galaxy expands outward
- After `gt >= 0.96` the timeline stops touching camera — full user scroll control
- Slow theta drift `+= 0.00042/frame` gives gentle rotation of the view

---

### Solar Flarage — Upgraded This Session

**Previous state:** 4 billboard corona planes (6.5, 10, 16, 26 units), simple single-layer noise, max flareStrength ≈ 2.4.

**Problems:** Planes too small (at sun scale=4.5 the smallest plane was inside the sphere), noise too uniform, flarage not visible at distance.

**New setup (5 layers):**

| Layer | Color | Size | Role |
|---|---|---|---|
| Inner white | `#fffde8` | 18 | Tight bright bloom, flareStr=5.5 |
| Gold rays | `#ffcc44` | 34 | Medium arms, flareStr=7.0 |
| Orange | `#ff7700` | 56 | Outer diffuse glow, flareStr=5.0 |
| Deep red halo | `#ff3300` | 85 | Wide soft halo, flareStr=3.0 |
| Spike layer | `#ff8822` | 28 | High-frequency spikes, flareStr=8.5 |

**Fragment shader upgrade:** Two noise layers at different frequencies (`38.0` and `52.0`) multiplied together — creates rich layered spike texture. Flares use linear falloff (`1.0 - dist*1.5`) instead of hard smoothstep cutoff, so spikes reach the edge of each plane rather than being masked out at mid-radius.

---

### Solar Prominence Loops — Upgraded This Session

**Problem:** Loops used fixed `SUN_R=2.4` for arc anchor positions. After ignition, sunMesh grows to scale=4.5 (world radius=10.8 units), but loops remained at radius 2.4 — completely inside the sphere, invisible.

**Fix — `updateLoops(t, worldR)`:**
```js
const R = worldR || SUN_R;       // e.g. SUN_R * sunMesh.scale.x
const hScale = R / SUN_R;        // heights scale proportionally
const h = lp.h * hScale;
const p0 = { x: R*cos(a1), z: R*sin(a1) };   // anchors on actual surface
const p1 = { x: ...(R + h)... };              // apex above surface
```

At sun scale=4.5: loop arcs from radius 10.8, heights of 13–38 units above the surface — dramatic solar flares that frame the sun.

**Other loop changes:**
- 10 loops (was 5), spread evenly around the sun from init
- Base heights: 3.0–8.5 units (was 1.8–5.3)
- Loops start during ignition at `pct > 0.80` (same as corona), not just post-ignition
- Point sprite size: `max(2.0, 6.0*90.0/-mv.z)` (was `max(1.5, 4.0*90.0/...`)
- Band alpha multiplier: 1.1 (was 0.9), spread factor: 12 (was 14) — wider, brighter traveling band

---

### Final State — End of Session 4

Full sequence plays continuously with no buttons:
1. **Void** (0–12s) — quantum foam, camera drifts from r=380→320
2. **Nebula** (12–56s) — cloud-first formation, arms condense, rotation builds 0.012→0.058
3. **Collapse** (56–74s) — single morphing particle system, easeIn acceleration, rotation → 0.32
4. **Ignition** (~4s) — continuous curves, cloud → sun flash → sun emerges with corona and loops
5. **Galaxy** (12s) — particles fly to spiral arms, dense disc rotates differentially, camera pulls back
6. **Living sun** — FBM lava surface, ripple, warp, 5-layer corona flarage, 10 prominence loops, SDO color cycling

### Next Session Starting Point

Potential next steps:
- **Integration** — connect origin.html as entry point before the solar system scene
- **Shockwave ring** — expanding ring after ignition (solar wind effect)
- **Jets** — add bipolar jets after collapseT=1 as a visual bonus layer
