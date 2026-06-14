# Soul Interface — Plans / Next Session Reference

### Cosmogenesis Sequence — Standalone Build
*Planned June 14, 2026*

**Context**: The cosmogenesis sequence (8 phases, narrated by Aion) currently shares space in `index.html` with the interactive solar system, and per the progress doc its early phases still show "hints of solar system" — it needs a distinct visual identity before the solar system is revealed at the end.

**Plan**:
1. Generate additional reference images to round out `Aion/Frontend/Build Log/Cosmogenesis photo references/` (currently covers Phases 2–8).
2. Build the cosmogenesis sequence as its **own standalone file** (e.g. `cosmogenesis.html` in `Aion/Frontend/`) rather than editing `index.html` directly — avoids risking the existing working solar system while prototyping.
3. Prototype each phase **in isolation** using the reference images as visual targets for the Three.js/particle work. Get each phase looking right on its own before stitching into a timeline.
4. Once phases are built, wire them into a timeline/sequence controller (durations per phase are documented in `Aion/Frontend/Build Log/soul_interface_progress.md`, e.g. Phase 1 — THE VOID ~22s).
5. **Integration step** (later): hand off from the new cosmogenesis scene into `index.html`'s solar system at the end of Phase 8 — shared camera/renderer state, smooth transition.

**Next session starting point**: Review the current cosmogenesis-related code in `index.html` (the "hints of solar system" issue) to identify what can be extracted/reused (e.g. existing particle system code) vs. built fresh in the new standalone file.
