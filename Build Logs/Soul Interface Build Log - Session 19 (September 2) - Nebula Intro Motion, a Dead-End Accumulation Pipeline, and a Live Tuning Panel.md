# Soul Interface Build Log — Session 19 (September 2)
## Topic: Chasing Nebula-Intro Polish Blind, a Reverted Temporal-Accumulation Detour, a Sandboxed-Server Red Herring, and a Live Tuning Panel

---

### What We Did

Started from `Aion/Frontend/Code/nebula-intro-prototype.html` (the nebula formation flythrough that hands off into `cosmogenesis.html`, added Session 17). Ricky watched the sequence and flagged two things as not polished enough to ship: the camera-move-in-the-beginning looked blurry, and the cloud motion looked "like really old graphics" — sliding rather than swirling.

What followed was a long, mostly-blind iteration loop, because the Chrome browser tool was never connected this session. Several rounds of real code changes came back reported as "no visible difference at all," which turned out to have a genuine root cause (Part 3) rather than the changes actually doing nothing. Once that was found and worked around, the real fixes (curl-noise motion, more raymarch steps, slower/longer formation) landed, plus a live on-page tuning panel so further dialing-in doesn't need another round-trip through me.

---

### Part 1 — Diagnosis, and a Detour That Got Reverted

Diagnosed three real, separate issues: no bloom/glow pass at all (never built this session — still open, see Next Session); the cloud "drift" was one rigid `vec3 * uTime` vector added to every sample point, i.e. the whole noise field sliding like a scrolling background rather than gas moving; and a step-budget/LOD interaction that deliberately cut raymarch steps to 45% during formation, landing exactly on the widest, most exposed shot.

Ricky asked to tackle the step-budget item first framed as "why is this noisy and jumbling," which read as a temporal-noise/banding problem, so Session built a real spatiotemporal-blue-noise-style dithered raymarch start offset, a depth-proxy pass (opaque bounding boxes, depth-only) per group, and a full reprojected + neighborhood-clamped temporal accumulation buffer (ping-ponged history render targets, premultiplied-alpha compositing to survive the extra pass). This is a legitimate, real technique family (same class as current volumetric-fog/cloud resolves), but it roughly doubled draw calls per frame on top of raising the step budget — and Ricky confirmed afterward it made the whole page choppy ("stop motion animation"). **Reverted entirely** — all render targets, the resolve/composite shaders, the depth prepass, and the dither uniform were removed; back to the original single-pass `renderer.render(scene, camera)`. The lesson: it never even showed a confirmed visual improvement before the perf cost became the dominant problem, so it wasn't worth keeping around to keep tuning.

---

### Part 2 — The Real Root Cause of "Nothing Changed"

Across several rounds — including after the curl-noise motion rewrite, which fundamentally changes *how* the cloud moves, not a subtle tuning knob — Ricky kept reporting the scene looked byte-for-byte identical to before any of this conversation's edits. That pattern (zero visible difference even after a change that couldn't plausibly be invisible) was the tell.

Root cause: the local static file server (`python -m http.server 8000`) was started via the Bash tool, which runs in a sandboxed environment separate from the real Windows desktop — confirmed by an earlier, unrelated `tasklist` check that failed to see Chrome even while it was visibly open on screen. If that sandbox also isolates networking (the same mechanism usually isolates both), then `localhost:8000` from the server's point of view and `localhost:8000` typed into Ricky's actual Chrome were never the same destination. Every `curl` check from within the session only ever confirmed the file to itself — never proved the real browser could reach it. A bright-magenta `renderer.setClearColor()` diagnostic marker confirmed it: not visible over the server URL, confirmed visible once Ricky opened the file directly via a `file:///C:/Users/...` URL instead, bypassing the server (and the sandbox) entirely.

**Every prior round in this session was invisible to Ricky the whole time** — not because the changes didn't work, but because he was never looking at the edited file at all.

### Next-session reminder
If a local server is needed again, use `dangerouslyDisableSandbox: true` on the Bash call that launches it (with Ricky's awareness, since that flag is there for a reason) — or just default straight to a `file://` URL for anything that doesn't genuinely need a server (no CORS-restricted fetches in these prototype files, so most of them don't).

---

### Part 3 — The Fixes That Actually Landed

Once verification was real (via `file://` + hard reload), applied and confirmed-visible:

- **Curl-noise cloud motion**, replacing the rigid drift vector: `blobDensity()`'s `drift` is now derived from the curl of a slowly-time-evolving 2D potential field (horizontal x/z only — true curl; vertical motion is a simple bounded oscillation, cheaper than full 3D curl and most of what reads as "real gas motion" is horizontal anyway). Zero at `uTime=0` so formation's first frame still matches the already-tuned static shape. Speed/magnitude cut hard after Ricky's "slow it way down, shouldn't be obvious until you look closely" — then made live-adjustable (below) rather than re-guessed again.
- **Step budget floor raised twice**: 0.45 → 0.65 → 0.85 (`formBudget` in the per-frame LOD calc) — the thing directly cutting raymarch samples during formation, which is when the wide establishing shot is on screen. Headroom for this opened up once the reverted accumulation pipeline's extra draw calls were gone.
- **Formation duration lengthened**: `FORM_DURATION` 8 → 11 seconds (still finishes with ~2s to spare before `FADE_START` at 17) — the reveal was reading as a quick fade rather than clouds condensing.

### Part 4 — Live Tuning Panel

Rather than keep guessing swirl/formation numbers blind, added an on-page control panel (top-right, only in this file) with five live sliders — Speed, Swirl amount, Swirl scale, Formation duration, Formation stagger — wired directly to shader uniforms (`uSwirlSpeed`/`uSwirlMag`/`uSwirlFreq`) and to the (now `let`, not `const`) `FORM_DURATION`/`FORM_STAGGER_MAX`, updating the running scene instantly with no reload. Persists to this browser's `localStorage` (`nebulaIntroTuning` key — per-browser only, same caveat as the existing keyframe system elsewhere in this repo) with a Reset-to-defaults button. This is a tuning aid, not meant to ship in the final cold-open.

---

### Current State

- `Aion/Frontend/Code/nebula-intro-prototype.html`: curl-noise motion, raised step budget, longer formation, and the live tuning panel are all in place. Ricky was mid-session dialing in the sliders when this was logged — final chosen values aren't baked in as new defaults yet.
- `.gitignore` now excludes `.claude/worktrees/` (a live git worktree checkout, tool-internal state — was showing up as untracked every session; committing it would have dumped an entire separate branch checkout into this repo's history).
- Also committed this session (pre-existing uncommitted work from before this conversation, pushed at Ricky's explicit request): `Aion/Frontend/Code/cosmogenesis.html`, `Aion/Frontend/Code/sun-texture-test.html`, `Vision & Architecture/Seers/Maren/01 - The Twelve Houses as Landscapes.md`, Session 18's build log file, two texture screenshots, and `videos/` — none of these were touched or reviewed in detail this session; they belong to other work.
- The Chrome browser tool was not connected at any point this session — same as Session 18. Worth checking at the start of next session before attempting anything needing visual verification, so this whole detour doesn't repeat.

### Next Session

- Get the final slider values from Ricky and bake them in as the new shader/JS defaults; then decide whether to strip the tuning panel out of this file entirely or just hide it behind a `?tune=1` flag before this scene is considered ship-ready.
- Bloom/glow post-processing is still completely unbuilt — flagged Session start as the single biggest lever for "does this read as pro," and every round this session went toward motion/blur instead per where Ricky steered it. Worth revisiting directly.
- The seamless version (this camera/formation logic living inside `cosmogenesis.html`'s own scene, no page reload for the handoff) is still a separate, not-yet-started follow-up, same as noted when this file was first created.
