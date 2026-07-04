# Soul Interface Build Log — Session 7 (July 3)
## Topic: Origin Scene Migrated to Vite + Theatre.js ("Origin Scene v3")

---

### What We Did

Migrated `Aion/Frontend/Code/origin.html` (the June 28 void→nebula→collapse build) into its own Vite project at `Aion/Frontend/origin/`, following the same pattern used for the sun scene in `Aion/Frontend/sun/`. This picks up two items directly off the Session 4 `Plans.md` wishlist (sun ignition flash, jets) and adds full Theatre.js control.

This session's work was done directly in the editor without a running log — this entry reconstructs it from the code as of the last save (July 3, 7:45pm).

---

### Vite + Theatre.js Setup (`Aion/Frontend/origin/`)

- Scaffolded the same way as `Aion/Frontend/sun/`: `three@0.128.0`, `@theatre/core@0.6`, `@theatre/studio@0.6`, Vite dev/build scripts
- Project: `'Origin Scene v3'`, sheet: `'Timeline'`
- Scene's internal clock (`T`, 0–90s) drives everything; it's pushed into `sheet.sequence.position` (scaled to Theatre's 10-unit-wide timeline) each frame so the Theatre playhead stays in sync with the actual animation instead of being the driver itself

### Theatre.js Objects Wired Up

Five sheet objects, all with live `onValuesChange` bindings applied at the end of the render loop (Theatre overrides always win, same convention as the sun scene):

- **Playback** — `speed` (0–4×)
- **Nebula** — `brightMult`, `warmBias`, `formLock` (locks the nebula formation stage for tuning a single frame instead of scrubbing)
- **Collapse** — `brightMult`, `warmBias`, `collapseLock` (same lock idea for the collapse stage)
- **Ignition** — `duration`, `flashIntensity`, `distortAmt`, `emergenceStart` (when the sun texture fades in relative to the flash), `coreGlow`
- **Sun** — `hueMode`, `coronaGlow`

### New On-Screen Controls

- Draggable clock HUD (bottom-center, can be dragged anywhere) showing elapsed time, current phase name (Void / Nebula / Collapse / Ignition / Galaxy), and % complete
- Space = pause/resume, **R = full scene reset**, arrow keys = scrub ±1s
- Orbit camera via mouse-drag + wheel-zoom (spherical coordinates, same approach as the sun scene)

### New Scene Content Since the June 28 `origin.html`

- **Ignition sequence** is now fully built out: collapse reaching `collapseT = 1.0` triggers sun emergence — scale bounce-in, procedural sun surface shader (same noise/hue-band approach as the sun scene's), a white-hot flash sphere, and a core-glow light burst (`bigFlash = sin(t·0.28)⁸ × 1.4`) exactly per the Plans.md note
- **Corona** fades in once ignition passes 80%, using the same 5-layer additive-plane technique as the sun scene, with its own `CORONA_HUES` palette cycle post-ignition
- **Solar emission loops** (10 Bezier flare arcs orbiting the sun) added, colored from a 7-color `FLARE_COLORS` palette, re-seeding randomly over time
- **Galaxy disc** (28,000 points, spiral-arm distribution) fades in after ignition completes and the fine-spiral particles morph (`galaxyT` uniform) from sun-orbiting particles into galaxy-disc particles — this is the "Integration" step from Plans.md, insofar as it closes the loop from origin → ignited sun → galaxy, all in one continuous scene
- **Bipolar jets** (`jetTopMat` / `jetBotMat`) exist in the code — geometry, shaders, and color pairs are built — but nothing in the render loop ever advances their `time` uniform or raises `gAlpha` above its default 0, so they're present but **currently invisible**. This is the one Plans.md item that's scaffolded but not actually wired up yet.

---

### Known Loose Ends / Left Out

- **Jets are dead code as of now** — need a `time` increment and a `gAlpha` ramp added to `tick()` to actually appear (see previous section)
- **`drainMat` / `cvortMat`** (a second, separate spiral-drain + cloud-vortex layer built earlier in the file) are also added to the scene but never given a nonzero `gAlpha` anywhere — only multiplied by `tVals.collapseBright`, which does nothing to a value that's already 0. Likely superseded by the collapse math baked directly into `fineMat`/`cloudMat`, but not removed — worth a decision next session on whether to activate or delete them.
- **`hazeRed` / `hazeBlue` / `hazeGold`** are plain stub objects (`{ material: { opacity: 0 } }`), not real Three.js meshes, even though `timeline()` sets their opacity every frame. No visual effect currently — either leftover placeholders from an earlier version or an unfinished haze-mesh feature.
- No standalone build log was written during the session itself — worth re-establishing the habit of jotting quick notes as you go, since reconstructing intent from shader code after the fact is slower than it needs to be.

---

### Current File State

| File | Status |
|---|---|
| `Aion/Frontend/origin/src/main.js` | Vite + Three.js + Theatre.js, full void→nebula→collapse→ignition→galaxy sequence, ~1400 lines |
| `Aion/Frontend/origin/index.html` | Clean shell, canvas only, same pattern as sun/ |
| `Aion/Frontend/Code/origin.html` | Untouched, June 28 version — reference only now that origin/ is the active build |
| `Aion/Frontend/sun/` | Unchanged since Session 6 — Theatre.js working, custom-slider decision still pending |

### Dev Server
```
cd Aion/Frontend/origin
npm run dev
```
Same Vite pattern as the sun project — Space to play/pause, R to reset, arrows to scrub, drag to orbit, scroll to zoom.

---

### Next Session Options

1. Wire up the jets (`time` uniform + `gAlpha` ramp) so they actually render
2. Decide fate of the dormant `drainMat`/`cvortMat` layers — activate or remove
3. Add the custom on-page sliders (still pending from Session 6, applies to both sun/ and origin/ now)
4. Start tying origin.html's ignition end-state into the actual solar-system scene as a real scene transition, not just a standalone loop
