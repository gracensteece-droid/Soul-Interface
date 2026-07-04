# Soul Interface — Plans / Next Session Reference

### Origin Scene — Next Steps
*Updated July 3, 2026 (Session 7)*

**Context**: The active build is now `Aion/Frontend/origin/` — a Vite + Theatre.js project (`main.js`), migrated from the standalone `Aion/Frontend/Code/origin.html` (June 28, now reference-only). Theatre.js drives five control sheets (Playback, Nebula, Collapse, Ignition, Sun) the same way the sun scene does in `Aion/Frontend/sun/`.

**Current State (working):**
- Void → Nebula → Collapse → **Ignition** → **Galaxy** — the full sequence now plays in one continuous scene, not just void→nebula→collapse
- Ignition (sun emergence, flash, core-glow burst) and galaxy-disc formation are both built and active — these were the two "potential next steps" from the previous plan and are now done
- Draggable clock HUD with phase name + %, Space/R/arrow-key transport, orbit camera

**Loose ends carried over from Session 7** (see that build log for detail):
1. **Bipolar jets** — geometry/shaders exist (`jetTopMat`/`jetBotMat`) but are never animated or made visible in the render loop. Need a `time` increment + `gAlpha` ramp to actually appear.
2. **Dormant `drainMat`/`cvortMat` layers** — a second spiral-drain/cloud-vortex system sits in the scene with `gAlpha` permanently at 0. Decide whether to activate or delete; the collapse look currently comes entirely from `fineMat`/`cloudMat`'s built-in `collapseT` math instead.
3. **`hazeRed`/`hazeBlue`/`hazeGold`** are stub objects, not real meshes — `timeline()` updates their fake opacity with no visual effect.
4. **Custom on-page sliders** (from Session 6, sun scene) — still not built. Would apply to both `sun/` and `origin/` now.
5. **Real integration** — origin's ignition/galaxy end-state still isn't connected into the actual solar-system scene as a transition; it's a standalone loop.

**Key files**: `Aion/Frontend/origin/src/main.js` (active), `Aion/Frontend/sun/src/main.js` (sun scene, unchanged since Session 6)
**References**: `Aion/Frontend/Code/origin.html`, `nebula-prototype.html`, `collapse-prototype.html`, `sun-prototype.html` — all untouched, reference only
