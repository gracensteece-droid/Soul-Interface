# Soul Interface Build Log — Session 5 (June 29)
## Topic: Sun Prototype Polish + Theatre.js Setup

---

### What We Worked On

Continued work on `Aion/Frontend/Code/sun-prototype.html`, then migrated it into a Vite project for Theatre.js integration.

---

### Sun Prototype Changes (`sun-prototype.html`)

#### Shockwave Ring (restored)
- The ripple/warp effect that used to fire at the burst moment had gone missing — got it back
- Implemented as a billboard `ShaderMaterial` plane (100×100) that fires at the start of the settle phase (after the white flash dies down)
- Two concentric rings: a bright leading edge + a trailing second ring offset by 0.15 progress
- Soft inner disk wash fills behind the leading ring
- Duration: 5 seconds, fades white → orange-red as it expands

#### Corona Glitch Fix
- The corona billboard planes were showing during the flash burst, causing a massive yellow oval blob
- Fixed: corona hidden during flash phase, fades in smoothly starting at sub=0.28 into the settle phase
- `baseGlowStrength` and `flareStrength` now lerp from 0 during fade-in instead of snapping visible
- Flash opacity ramp changed from `sin(sub*π)` (which returned to 0 at end of phase, causing a pop) to `sin(sub*π*0.5)` (monotone ramp that the settle phase picks up cleanly at 0.90)

#### Surface Ripples
- Attempted multiple approaches to get visible ripple rings on the sun surface
- Final working approach: procedural shader-only, no JS array uniforms
- 5 ripple wave sources hardcoded in the vertex shader with evenly-spaced phase offsets, driven by `time * 0.17`
- Vertex displacement: `position + normal * sin(ang*20 - p*26) * envelope * uRippleStr * 0.38`
- Fragment shader adds crest glow on wave peaks (bright × 5.0 × uRippleStr)
- Single `uRippleStr` float uniform controls overall strength (0 = off, 1 = full)
- At burst: ramps to 1.0 over 0.4s, holds 4s, fades to 0.25 ambient
- Note: ripples are present in the code and working but may be subtle — further tuning needed next session

---

### Vite + Theatre.js Setup (`Aion/Frontend/sun/`)

#### Why
- Theatre.js doesn't ship CDN/UMD bundles — only ESM/CJS. Can't use it from a plain HTML `<script>` tag. Needs a bundler.

#### What was set up
- Vite vanilla project scaffolded at `Aion/Frontend/sun/`
- Dependencies installed: `three@0.128.0`, `@theatre/core@0.6`, `@theatre/studio@0.6`
- Three.js pinned to 0.128.0 to match the r128 CDN version used in the prototype (newer versions break the GLSL shaders)
- All sun scene code migrated into `src/main.js` as ES module imports

#### Theatre.js wired up
- Project: `'Sun Scene'`, sheet: `'Ignition'`
- Object: `'Sun'` with two properties:
  - `rippleStrength` — range 0–1, controls surface wave intensity
  - `hueMode` — range 0–5, cycles SDO wavelength palettes (amber → red → teal → blue → violet)
- Values applied at the **end** of the render loop so Theatre always overrides the auto-animation logic

#### Known issue: `studio.initialize is not a function`
- Fixed by calling `studio.default.initialize()` instead of `studio.initialize()`
- The `@theatre/studio` package wraps its default export differently than expected under Vite's ESM resolution

#### To run
```
cd Aion/Frontend/sun
npm run dev
```
Opens at `localhost:5173` (or 5174 if port taken).

---

### Current State

| File | Status |
|---|---|
| `Aion/Frontend/Code/sun-prototype.html` | Working standalone — shockwave + ripples in code |
| `Aion/Frontend/sun/` | Vite project running, Theatre.js installed and wired up |
| `Aion/Frontend/sun/src/main.js` | Full sun scene as ES module, Theatre.js controlling rippleStrength + hueMode |

---

### Next Session

- Actually use the Theatre.js timeline — drag `hueMode` and `rippleStrength` sliders to confirm they're working
- Keyframe the ignition sequence on the Theatre timeline so the full animation is scrubable
- Tune ripple visibility (may need to increase `uRippleStr` multiplier or displacement amount)
- Consider adding more Theatre properties: camera distance, corona intensity, shockwave progress
