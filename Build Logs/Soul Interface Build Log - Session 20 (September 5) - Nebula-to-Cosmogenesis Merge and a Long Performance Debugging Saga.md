# Soul Interface Build Log — Session 20 (September 5)
## Topic: Merging the Nebula Intro Into Cosmogenesis as One Continuous Scene, Then a Long, Mostly-Successful Performance Fight

---

### What We Did

Started from Session 19's `nebula-intro-prototype.html` (the standalone camera-flythrough nebula). Ricky wanted to step back from the scripted camera dolly and instead build toward the actual goal: the nebula floating/forming, leading directly into `cosmogenesis.html`. That went through several stages this session:

1. A new standalone test file (`nebula-cosmogenesis-handoff-test.html`) — base 19-piece nebula (no custom-added clouds; those were never persisted anywhere and are gone), drag/scroll camera, a formation reveal, then a crossfade into `cosmogenesis.html` via a page navigation (`?startT=`/`?startR=` params added to `cosmogenesis.html` for this).
2. Ricky asked to make it one whole scene — no page navigation at all. Built `cosmogenesis-with-nebula-intro.html`: a full copy of `cosmogenesis.html` with the 19-piece nebula added as a foreground layer that fades away to reveal cosmogenesis's own real nebula (not a duplicate) already naturally forming underneath, camera easing in, all in one continuous render loop.
3. Per explicit request, **Theatre.js was removed entirely** from that file — imports, the `@theatre/core`/`@theatre/studio` importmap entries, `studio.initialize()`, all 8 `sheet.object()` bindings, the `sheet.sequence.position` sync line. Ricky's own custom keyframe/curve-editor system and pop-out controls window (`tVals`-driven) were already independent of Theatre and are untouched — confirmed by tracing every reference before deleting anything.
4. A long performance debugging pass (see Part 2) that started from "everything feels laggy" and ended with a confirmed, meaningfully-better result Ricky called "better than anything we have done."
5. Added: click-to-select any individual cloud (raycast against the piece, works per-blob even after the shader-grouping change below), X/Y/Z reposition sliders, a Hue slider (rotates rim+deep together, preserving contrast), an FPS counter, and a "Hide UI" toggle (useful for viewing at mobile screen sizes, where the desktop-width panels used to overlap and cover the scene).

---

### Part 1 — The Browser-Extension Detour (Again)

Same issue as Session 18: the Chrome browser tool was disconnected the entire session (`tabs_context_mcp` failed every attempt). Also re-confirmed something learned the hard way in an earlier session: the Bash tool's own network is sandboxed separately from Ricky's real Windows desktop, so a `python -m http.server` launched from Bash is unreachable from his actual browser — `file://` direct-open is the reliable path for plain `<script src="...">` files. `cosmogenesis-with-nebula-intro.html` uses `<script type="module">` (ES modules, Theatre's importmap), which Chrome generally blocks from loading at all under `file://` — that file specifically needs a real local server, which Ricky ran himself in his own terminal (not through the sandboxed Bash tool).

### Part 2 — The Performance Saga

Ricky reported the whole scene as "incredibly glitchy" / laggy throughout, escalating to real frustration after several rounds of changes he reported as making it *worse* despite each one being individually incapable of doing so (lower pixel ratio, fewer particles — these can only reduce cost or do nothing). In order, what was tried and what was actually learned:

- **Diagnosis without data was the core problem.** Added a real on-screen FPS counter (rolling average, color-coded) — this is what eventually broke the guessing loop.
- Fixed a genuine bug: the intro nebula's fade-out (`uGlobalAlpha`) was checked only at the *end* of the raymarch shader, meaning a "faded out" piece still paid its full per-pixel cost the entire time. Moved the check to the top (real fix, but turned out not to be the dominant cost).
- Traced a specific T=56-59 stall to two dead-code particle systems (`drainMat`/`cvortMat`, 20,000 + 1,600 particles) whose `gAlpha` uniform is only ever set via `*= tVals.collapseBright` with nothing ever setting a base value first — they've been permanently invisible (and functionally free) this whole time, in the original file too. Cutting their particle counts wasn't wrong, but wasn't the actual fix either.
- Tried `renderer.compile()` (pre-compile all shaders at load, avoiding a mid-scene shader-compile stall) — reasonable technique, didn't resolve it.
- **The actual breakthrough: a `?nointro=1` A/B flag** that skips creating the intro nebula entirely. With it, the scene ran smoothly. This conclusively proved the base cosmogenesis scene (25,800+ particles) was never the problem — it was specifically the 19-piece foreground nebula's cost stacking on top of it.
- Rewrote the 19 separate raymarch draw calls into 6 shared grouped shaders (the exact technique already proven in `nebula-intro-prototype.html` — overlapping separate draws each pay full box-traversal cost on shared pixels; merging into one shared loop per cluster removes that duplication). This introduced a real regression (copied the reference file's 2-noise-octave density function instead of the original's 3-octave version, visibly shrinking the nebula) — caught and fixed by restoring 3 octaves.
- The grouped-shader change alone reportedly didn't move the FPS number. What actually worked, confirmed by Ricky ("looks better than anything we have done"): **cutting the per-group raymarch step budgets roughly in half** (34→16, 25→12, 25→12, 18→9, 13→6, 8→4) — i.e., the real lever was raw computation volume, not how the draw calls were organized.
- One remaining known issue, not yet fixed: FPS visibly dips during the ~4.5s formation window (a still-forming, semi-transparent group rarely triggers the raymarch loop's early-exit, so it pays full step budget) and "jolts" back up once solid. A fix (scaling the step budget down further during formation) was tried and explicitly reverted at Ricky's request ("that change sucked") — reason for the revert wasn't captured before he moved on, worth asking next time before re-attempting.
- A live "nebula quality" slider (drag-to-scale step budget in real time) was also tried and reverted ("you fucked it up") — again, the specific complaint wasn't captured.

**Takeaway worth remembering**: guessing performance fixes from code alone, without a number to check against, wasted a lot of time and trust here. The FPS counter and the `?nointro=1`-style isolation flag were what actually moved things forward — reach for real measurement/isolation immediately next time a performance complaint comes in, rather than several rounds of plausible-sounding tweaks first.

---

### Current State

- `Aion/Frontend/Code/cosmogenesis-with-nebula-intro.html` (new, uncommitted): one continuous scene, big nebula (6 grouped shaders, halved step budgets, 3-octave noise) fades in/out over cosmogenesis's own real nebula, which grows into place as the camera eases in. Theatre.js fully removed. Click-to-select + reposition + hue works per-cloud. FPS counter and Hide-UI toggle present. `?nointro=1` still works as an A/B flag. Ricky is pausing here, satisfied with where performance landed "for now," to continue next session.
- `Aion/Frontend/Code/nebula-cosmogenesis-handoff-test.html` (new, uncommitted): the standalone two-file version, superseded by the merged file above but left in place, untouched since the merge.
- `Aion/Frontend/Code/cosmogenesis.html` (modified, uncommitted): gained the `?startT=`/`?startR=` handoff-override params from Part 1 above; otherwise untouched — the original file, not the one being iterated on now.
- Chrome browser tool: disconnected all session, same as Session 18 — worth checking first thing next time before attempting anything needing visual verification.

### Next Session

- The formation-window FPS dip/jolt is still there — a fix was tried and reverted, but *why* it didn't work wasn't captured. Ask before re-attempting rather than guessing again.
- Ricky wants the big nebula's custom-added clouds back at some point — they were never persisted anywhere (confirmed again this session) and would need to be recreated by hand or from a still-open old browser tab if one exists.
- Bloom/glow post-processing is still completely unbuilt — flagged repeatedly since Session 17 as the single biggest lever for "does this read as pro," consistently deprioritized for motion/performance work instead.
