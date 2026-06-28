# Soul Interface — Plans / Next Session Reference

### Origin Scene — Next Steps
*Updated June 28, 2026*

**Context**: `Aion/Frontend/Code/origin.html` is the active build — a continuous void → nebula → collapse scene. The transition approach is now solid: a single morphing particle system rather than cross-fading two separate systems.

**Current State (working):**
- Void (T=0-12s): quantum foam, camera drifts in
- Nebula formation (T=12-56s): cloud-first, arms condense via `formT` radial reveal
- Morph to collapse (T=56-90s): `collapseT` uniform 0→1 drives same particles from nebula drift → inward spiral collapse math in-shader. No second particle system.
- Core glow builds as `coreVisibility = cCurve²`

**Potential next steps:**
1. **Sun ignition** — after collapseT=1, trigger a bright flash moment using `bigFlash = sin(t*0.28)^8 * 1.4` pattern from collapse-prototype. Solar wind / shockwave ring expansion.
2. **Jets** — add jetTopMat / jetBotMat back in after collapse is fully established (T>90s) as a bonus layer on top of morphed particles
3. **Integration** — connect origin.html as the entry point before the solar system scene

**Key file**: `Aion/Frontend/Code/origin.html`
**References**: `nebula-prototype.html`, `collapse-prototype.html` (both untouched, reference only)
