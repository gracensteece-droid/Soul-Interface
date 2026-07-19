# Soul Interface Build Log — Session 16 (July 18)
## Topic: Jupiter Camera/Animation Iteration, and a Per-Element Font Size & Position Editor for Planet Pages

---

### What We Did

Two threads this session, both on `planet.html` (the main checkout, `C:\Users\...\soul-interface\planet.html` — not this worktree, since the Earth/Jupiter render code only exists there). First, camera and surface-animation iteration on the Jupiter view; second, a font-size/position editing feature for planet page text that went through three rounds of feedback before landing on real per-element control, and surfaced three genuine layout bugs along the way.

---

### Part 1 — Jupiter Camera and Surface Animation

Ricky asked for the camera to center Jupiter better in frame, then for full move-around/zoom-in-out/free-fly navigation instead of a fixed close-up — implemented and confirmed working.

Then iterated on making the surface feel alive: a landscape-sliding animation, then a curl-warp distortion, then a vortex-distort attempt, aimed at getting the Great Red Spot and cloud bands to swirl. Each attempt visibly warped the texture and cut off at the sphere's seam line, which Ricky called out directly from screenshots each time. Tried an atmospheric overlay to hide the seam — still didn't read as "forming" the way Ricky wanted from reference images. Ricky then asked to stop altering the existing photo and instead rebuild Jupiter's surface as real procedural/manual features (so it could be animated on its own terms) — that rebuild was attempted, then Ricky compared it to the real texture and said it "looks like ass," asking to go back to the actual photo.

At that point Ricky stepped back and asked directly whether the animation was worth the cost, given the goal is to ship: **"Lets just go back to what we had, is this really that important... we are already upgrading it, and the goal is to ship this thing."** Jupiter was reverted to a simple real-texture sphere render with no surface animation — confirmed as the right call. [[project_jupiter_animation_abandoned]]

---

### Part 2 — Font Size & Position Editor

Ricky asked for a way to adjust font size and reposition text on planet pages, directly on the page rather than in code. This went through three rounds of tightening scope:

1. **First ask**: one global font-size slider + drag capability for five coarse UI blocks (back button, title, tabs, description panel, stats panel).
2. **Second ask** (with screenshots showing the control panel overlapping the title): each text element needed **independent** size control, **independent** dragging, and the control panel itself had to be draggable out of the way — not one global slider.
3. **Third ask** (screenshot of the "IN THE CHART" stat specifically): the four stat rows (Rulership, Orbital Period, In the Chart, Shadow), which had been one grouped block, each needed their own separate control.

Landed on: a `blocks` array of 12 independently controllable elements (back button, title, tabs, description label/body, reading label, reading-result label, all 4 stat rows individually, nav), each with its own `-`/`+` size badge and drag handling, persisted per-planet to `localStorage`. The control panel itself has a grip handle, is draggable, and its own position persists separately. A "RESET" button clears the current planet's saved layout.

---

### Part 3 — Three Real Bugs, Not Tuning

After the third round shipped, Ricky reported it clearly: **"it's all fucked up... when I try and move those ones around... they just collapse and then the other text gets way huge and in another format."** All three turned out to be real bugs, confirmed and fixed one at a time via Playwright (not guessed at from reading the code):

1. **Sibling collapse.** Dragging one stat row pulled it out of normal document flow (`position:fixed`), but its still-in-flow siblings closed the gap it left behind — looked like the layout collapsing. Fixed by locking *every* controllable element to `position:fixed` up front, in a two-pass measure-then-apply sequence, so no element ever depends on a sibling still being in flow.
2. **Text "exploding" in size/format.** `position:fixed` with no explicit width falls back to shrink-to-fit sizing, so text that used to wrap at ~200px suddenly rendered as one long unwrapped line — reading as if the font had grown. Fixed in the same pass by capturing and explicitly re-applying each element's natural width.
3. **A subtler bug found only after the first two were fixed and re-tested**: stat rows were still rendering at wildly wrong positions (e.g. `left: 2080px` in a 1280px-wide viewport). Traced through the ancestor chain to `#stats-panel`, which fades in via a CSS `animation: fadeUp ... forwards`. Per the CSS spec, **any** non-`none` transform on an ancestor — even a settled, identity one — creates a new containing block for `position:fixed` descendants, rebasing them off that ancestor's box instead of the viewport. Overriding just the computed `transform` value wasn't enough either: a CSS animation that is still *running* forces a containing block regardless of what its current value has been overridden to, so the animation itself had to be killed (`animation: none !important`). That in turn broke tab switching — a first pass blanket-applied `opacity: 1 !important` to every block's ancestor, which permanently forced both tab panels visible at once, since one of them (`.content-panel`) manages its own visibility via a class + opacity transition, not an animation. Fixed by gating the animation-kill/opacity-pin logic to only ancestors that actually have a running CSS animation, and hardcoding the restored opacity to `1` (not "whatever the current computed value is") — since `applyAll()` runs at page load, before `fadeUp`'s own delay (0.6–1.6s) has elapsed, so "current" opacity at that instant is still the pre-animation base value of `0`, which would otherwise get permanently pinned and leave the element invisible forever.

All three fixes were re-verified with Playwright after the last change: dragging one stat row moves only that row (siblings' positions unchanged to the pixel), width and font-size stay constant, rendered positions match their inline values exactly (no more impossible off-screen numbers), and switching between "The Body" / "Your Reading" tabs shows only the active panel with no overlap.

---

### Part 4 — Extending to Every Font Style, Including "Your Reading"

Ricky reframed the ask more precisely: **"every font that's a different style I need to be able to edit the size of it and also on the your reading view as well."** The 12-block list covered the stat rows and the two tab-panel headline labels, but left several distinct text styles on the "Your Reading" form and result screens with no control at all: the intro paragraph, the birth-date/time/place field labels, the input text itself, the "Enter the Moment" button, and — on the result screen — the birth-line, the reading body text, and the "Change birth data" button.

Added as individually draggable + sizable blocks (same pattern as the existing 12): `birth-intro`, `birth-submit`, `reading-birth-line`, `reading-body`, `change-birth`.

The three birth-data field labels and the three input fields are each genuinely the same font style repeated, not three separate styles — so rather than three redundant per-instance controls each, added a second, lighter mechanism: `styleGroups`, one shared size-only control (amber badge, no drag, since dragging a shared style across three physically separate elements wouldn't mean anything coherent) per CSS class, applied via `querySelectorAll` to every matching element at once.

**Caught a real bug in the process, before it ever shipped**: `reading-label` (already a block from Part 2) and the three new result-screen blocks all live inside `#reading-display`, which is `display:none` until someone actually submits their birth data. `applyAll()` measures every block's natural size via `getBoundingClientRect()`, which returns an all-zero rect for anything inside a `display:none` ancestor — so on first page load, before anyone had ever submitted a reading, these elements would have been permanently pinned to 0-width at (0,0), forever, since once an element is forced to `position:fixed` there's no way to correctly re-measure its natural flow size again. This had already been silently true for `reading-label` since Part 2 and was never caught because no test had actually driven the submit flow.

Fixed two ways together: (1) `applyAll()` now skips any block that is both uncustomized *and* currently not rendered (`getClientRects().length === 0`), leaving it in normal flow until it's actually visible; (2) `showReading()` (the function that flips `#reading-display` to `display:block`) now calls `applyAll()` again afterward, at which point those same blocks are genuinely measurable and get sized correctly for the first time. Verified by calling `showReading()` directly in a Playwright page context (bypassing the real Claude API call `fetchReading()` makes) with sample text — confirmed `reading-label`, `reading-birth-line`, `reading-body`, and `change-birth` all render at their real natural sizes (e.g. `reading-body` at 358×110px with correct wrapped paragraph text), not 0×0. Also verified the field-label group badge scales all three field labels identically in one click.

---

### Part 5 — Two Real Bugs From Part 4, Caught From Screenshots

Ricky sent two screenshots back. First: on "Your Reading," "Aion — Your Reading" was visually overlapping "Date of Birth," badges were stacked unusably on top of each other, and nothing could be dragged. Second: "RULERSHIP" (Cinzel small-caps) and "Sagittarius · Pisces (traditional)" (Cormorant italic) — visibly two different font styles — still shared one size control, plus the broader point: **"that goes for all the parts in the page just like this that you still haven't separated."**

Two separate root causes:

1. **The overlap was a reintroduction of the Part 3 sibling-collapse bug.** The `styleGroups` mechanism added in Part 4 applied a shared `scale` to field labels/inputs but deliberately left them in normal document flow (only individually-drag-and-droppable `blocks` got pulled to `position:fixed`). Once `birth-label`/`birth-intro`/`birth-submit` — genuine flow siblings of the field-group container — got pulled out to `position:fixed`, the field labels and inputs left behind in flow shifted up to fill the vacated space, landing on top of the now-fixed elements above them. Fixed by giving every style-group *instance* its own individually-captured natural position via the same two-pass measure-then-lock approach used for `blocks` — each of the 3 field labels still shares one scale value, but each now has its own explicit `position:fixed` placement, so removing a sibling from flow can't collapse them anymore.
2. **The stat rows, and the planet header, were still bundling multiple distinct font styles into one block.** `stat-row-rulership` etc. controlled `.stat-label` ("RULERSHIP," Cinzel) and `.stat-value` ("Sagittarius · Pisces...," Cormorant italic) as a single scalable unit — exactly the case Ricky pointed at directly. Same issue existed in `#planet-header`, which bundled `.planet-symbol` (the glyph), `.planet-name-display` ("JUPITER"), and `.planet-archetype` (the subtitle) — three distinct styles — into one block. Split both: added `id`s to the previously-anonymous `.stat-label` spans, replaced the 4 `stat-row-*` blocks with 8 (one label + one value per stat), and replaced the single `planet-header` block with its 3 already-id'd children (`planet-symbol`, `planet-name`, `planet-archetype`) directly. The now-childless container elements (`#planet-header`, each `.stat-row`) stay in the DOM and keep their base CSS positioning as harmless empty wrappers — `clearAncestorTransforms()` (from Part 3) already handles them correctly as ancestors without needing to be blocks themselves.

Verified via Playwright: scaling `stat-label-rulership` up (1.0 → 1.15) leaves `stat-rules` (the value) untouched at 1.0; the "Your Reading" form now stacks in correct top-to-bottom order (`birth-label` at y=185, `birth-intro` at y=209, field labels starting at y=310) with no overlap; `planet-symbol`/`planet-name`/`planet-archetype` each render at distinct, sensible positions. No JS errors.

---

### Part 6 — Same Jupiter Texture in `index.html`, Then a Real Click Bug

Ricky asked for the small orbiting Jupiter in `index.html`'s solar-system overview to use the same real photographic texture as the close-up `planet.html` render, rather than the procedural `jupiterTex()` canvas texture every other outer planet still uses. Added a hot-swap block for Jupiter (`window._planetMaterials[4]`) right after Earth's existing one, loading the same `textures/tex_jupiter.jpg` used by `renderJupiter3D()` — verified via direct material inspection (`map`/`bumpMap` both correctly pointing at the real file, not just the procedural fallback).

Ricky then reported clicking Jupiter in that view didn't navigate to its detail page. Root-caused through direct diagnosis (not guesswork) — temporarily exposed `planets`/`camera` to `window` for a diagnostic session (removed once done), then:

1. Confirmed Jupiter's mesh really is on-screen and its material/geometry are intact.
2. Found the actual mechanism: `index.html`'s solar system keeps every planet orbiting continuously in real time forever, even after the intro sequence ends (`animate()`'s `p.angle += p.spd * ...` has no phase gate). The existing click handler re-ran raycasting fresh at the exact instant of the click event — meaning any real delay between "user decides to click" and "click event fires" (mouse movement time, reaction time, even just normal event-loop/round-trip latency) let Jupiter drift off the pixel being clicked, causing a miss. A synthetic click computed and dispatched with zero delay worked every time; a click 300ms+ later at the same coordinates reliably failed — this reproduced the bug on demand.
3. A second, compounding bug in the same area: the hover *label* ("JUPITER," shown on mouseover) has its on-screen position frozen the moment it first becomes visible and is never updated again post-intro, while the raycaster hit-test correctly keeps tracking the live, moving mesh. The two silently disagree more and more the longer the page has been sitting idle — so the visible text a user aims for isn't even where the actually-clickable planet is anymore.

Fixed three ways together: (1) the previously-frozen post-intro label position now updates every frame for whichever planet is currently hovered, so it never drifts from the real mesh; (2) added a large, fully invisible hit-test sphere (`pd.r * 9`, `opacity:0`) as a child of every planet mesh, since raycasting skips truly invisible (`visible:false`) objects but not merely transparent ones — this makes the actually-clickable area far bigger than the visible dot without changing anything visually; (3) the click handler now trusts `_hoveredPlanetIdx` — continuously updated by the mousemove handler, which already correctly re-resolves against the live mesh position on every move — instead of re-deriving the target fresh from scratch at the moment the click fires, eliminating the moving-target race entirely for the normal hover-then-click flow.

Verified with a fully black-box Playwright test (no internal hooks): scanned the live scene by moving the mouse until the real "JUPITER" label organically appeared, paused 600ms to simulate a human noticing it before clicking (the exact scenario that used to fail), clicked, and confirmed navigation actually landed on `planet.html?p=jupiter`.

---

### Part 7 — "Nothing Changed": Two Real Copies of These Files

Ricky reported none of this session's changes were showing up, with a screenshot whose URL bar read `127.0.0.1:5500/Aion/Frontend/Code/planet.html?p=jupiter` — a completely different file from the repo-root `planet.html` every fix in this log was made to. **The repo has two independent, non-symlinked copies of both `planet.html` and `index.html`**: repo root, and `Aion/Frontend/Code/`. Ricky's actual day-to-day test setup (Live Server, port 5500) serves from the `Aion/Frontend/Code/` copy. That copy's last edit was 2026-07-11 (the original Earth-texture session) — it predates every fix in this entire log, including the original Jupiter real-texture work, and doesn't even contain `renderJupiter3D()`.

Diffed both file pairs before touching anything: every line unique to the `Aion/Frontend/Code/` copies was confirmed to be the old, pre-edit version of something already fixed in root (the old ungrouped stat rows, the old frozen-position label code, etc.) — nothing there was unique work worth preserving. Copied root's `planet.html` and `index.html` over the `Aion/Frontend/Code/` versions, and also copied `textures/tex_jupiter.jpg` into `Aion/Frontend/Code/textures/` (a separate textures folder from root's, needed since the real-texture Jupiter work references it by relative path). Verified by serving the exact same `Aion/Frontend/Code/planet.html?p=jupiter` path structure from Ricky's screenshot and screenshotting the result directly — matches everything described in Parts 4-6.

Saved a memory note ([[project_dual_planet_html_locations]]) so future sessions check which copy is actually being served before assuming an edit is visible, rather than rediscovering this the same way.

---

### Current State

Nothing from this session is committed yet — `planet.html` and `index.html` sit with these changes uncommitted in the main checkout. The layout-editor feature (per-style-not-per-container size/position control, shared-style group controls with individually-locked positions, draggable control panel, per-planet localStorage persistence) is built and verified working end-to-end via Playwright, including all six bugs found across Parts 3-5. `index.html`'s Jupiter now uses the same real texture as `planet.html`, and clicking any orbiting planet post-intro reliably navigates to its detail page even after the page has been sitting idle — verified via a genuine black-box interaction test, not just internals inspection.

Also still open from Session 15: this worktree (`quizzical-waddling-harp`) and the main checkout have diverged — the worktree has Session 15's nebula work but not Sessions 13/14; the main checkout has 13/14 but not 15. This session's planet.html work adds a third divergent thread (main checkout only). Not reconciled this session.

### Next Session

- Commit the font-size/position editor work in the main checkout.
- Reconcile the worktree vs. main-checkout divergence (Sessions 13, 14, 15, and this session's planet.html work are each only in one location).
- Have Ricky confirm the editor feels right in a live browser pass, not just Playwright verification — particularly dragging stat rows into close proximity, since the earlier screenshot check showed overlapping text is visually possible if two rows are dragged on top of each other (expected behavior, not a bug, but worth a sanity check).
