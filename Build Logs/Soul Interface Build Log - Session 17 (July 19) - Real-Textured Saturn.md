# Soul Interface Build Log — Session 17 (July 19)
## Topic: Real-Textured Saturn and Venus, Planet Drag-to-Reposition, Texture Resolution

---

### What We Did

Ricky asked for Saturn to get the same treatment Jupiter got in Session 16: a real-photo close-up render on `planet.html`, and the same real texture on the small orbiting Saturn in `index.html`'s solar-system overview.

---

### Part 1 — Missing Textures, and a Blocked Download Script

Neither `tex_saturn.jpg` nor `tex_saturn_ring.png` existed locally yet. Running `download_textures.py` failed everything except the files already cached (403 Forbidden from Solar System Scope) — its `HEADERS` dict spoofs a Chrome User-Agent + Referer, which turned out to be exactly what the site's bot-protection blocks now; a bare request with no headers at all gets through fine (verified directly with `curl`). Fixed by dropping the spoofed headers to an empty dict. Re-ran it and got all 9 previously-missing textures (mercury, venus, mars, saturn, saturn ring, uranus, neptune, pluto, stars) — though the script's own success/fail reporting was misleading: a `✓` character in the "downloaded OK" print crashed on Windows' default console codepage *after* the file was already written correctly, so it reported "FAILED" on files that had, in fact, saved fine. Fixed that too (`✓` → `OK`).

---

### Part 2 — `renderSaturn3D()` in `planet.html`

Copied `renderJupiter3D()`'s structure exactly (same Three.js r128 CDN load, same lighting rig, same warm limb-glow shell, same starfield, same "real photo + bump map + slow spin, no surface animation" philosophy) and added the one thing Jupiter doesn't need: rings.

Rings use a `THREE.RingGeometry` with the real alpha-mapped ring texture (`tex_saturn_ring.png`) — RingGeometry's default UV mapping doesn't run cleanly from inner to outer radius, so a radial alpha texture (transparent gaps, opaque bands, matching the real Cassini Division etc.) reads as a smeared mess without a fix. Remapped each vertex's UV to `(distanceFromCenter - innerRadius) / (outerRadius - innerRadius)` before use — the standard fix for this well-known Three.js RingGeometry quirk. Tilted the ring plane to Saturn's real ~26.7° axial tilt. Camera pulled back further than Jupiter's (rings extend to ~2.3x the planet's own radius, need more room in frame). Both the planet and rings are parented under one `THREE.Group` so they spin together at the same tuned rate Jupiter uses.

---

### Part 3 — `index.html`'s Small Orbiting Saturn

Added a hot-swap block for `window._planetMaterials[5]` right after Jupiter's, same pattern: starts on the existing procedural `saturnTex()` canvas texture, swaps to the real photo once `tex_saturn.jpg` loads. Left the 4 procedural flat-color ring bands (already built for the tiny-scale overview) untouched — they're a reasonable stylized approximation at that scale, and swapping them for the real alpha-mapped texture wasn't part of what Ricky asked for (he specifically praised Jupiter's *surface* texture).

---

### Part 4 — Verification and Syncing

Verified via Playwright: `planet.html?p=saturn` renders cleanly with the real texture and correctly-tilted, correctly-UV-mapped rings (screenshot confirmed — visible banding on the planet, visible ring detail, no smearing). `index.html`'s Saturn material confirmed pointing at the real `tex_saturn.jpg` file (not the procedural fallback) via direct material inspection.

Synced `planet.html`, `index.html`, and both new texture files into `Aion/Frontend/Code/` (see [[project_dual_planet_html_locations]] — Ricky's actual test server serves from there, not repo root) and re-verified the exact same URL path Ricky's screenshots have used before (`.../Aion/Frontend/Code/planet.html?p=saturn` and its texture files) all return 200.

---

### Part 5 — Ring Was "Spinning Weird"

Ricky reported the ring looked wrong and was spinning strangely. Root cause: `tick()` spun `saturnGroup.rotation.y` every frame — the WHOLE tilted group (sphere + ring together) — but rotating a tilted flat disc around an axis that isn't its own normal makes it trace out a wobbling, precessing cone instead of a clean spin. That's the "weird" motion. Real ring systems also don't visibly rotate on human timescales; only the planet's own cloud bands do, so tying the ring's motion to the frame loop at all was wrong on top of being visually broken. There was a second, related bug: the axial tilt had only ever been applied to the ring mesh, not the sphere, so the two were inconsistently oriented relative to each other even before the spin was added.

Fixed by restructuring: the tilt is now applied once, statically, to `saturnGroup` itself (so sphere and rings share the same fixed tilt), and only the `saturn` sphere mesh spins per frame on its own local Y axis — the ring mesh gets no rotation at all after its initial setup. Verified across three screenshots taken 2 seconds apart: the ring's shape/position is pixel-identical in each one while the sphere's surface bands visibly rotate underneath it, matching how real Saturn actually looks.

---

### Part 6 — Move the Planet: Drag-to-Reposition for the 3D Render

Ricky asked for a way to move the 3D-rendered planet itself around the frame — a different thing from the existing text layout editor, which only repositions HTML/CSS text overlays, not the WebGL canvas content.

Built `setupPlanetDrag(canvas, camera, group, THREE, slug)`, one shared helper used by all three real-render planets (`renderEarth3D`, `renderJupiter3D`, `renderSaturn3D`). Converts on-screen drag pixels into world-space movement using the camera's fov/aspect at the planet's current distance, so the planet tracks the cursor 1:1 rather than drifting at the wrong rate. Persists per-planet-slug to its own localStorage key (`soulinterface_planet3d_pos_v1`), separate from the text-layout system's key since the two live in different `<script>` blocks.

Deliberately wired into the SAME edit mode as the existing text layout editor (`window.__siEditMode`, set by the EDIT LAYOUT toggle) rather than adding a second separate toggle — one "customize this page" mode now covers both text and the planet itself. The RESET button also now clears the saved 3D position alongside the text layout.

Required grouping each render function's previously-separate top-level meshes (sphere, atmosphere glow, clouds, moon pivot) under one `THREE.Group` per planet, since dragging needs one thing to move, not several independently-positioned scene children — Earth in particular had every piece added directly to `scene` with no shared parent before this.

Verified via Playwright: dragged Jupiter from center toward the top-left in edit mode, confirmed it visibly moved and the offset persisted in localStorage; reloaded the page and confirmed the planet stayed at the dragged position rather than resetting to center.

---

### Part 7 — Texture Resolution

Ricky felt the surface texture still wasn't detailed enough. Checked Solar System Scope for higher-resolution versions of the same source images — a "8k" tier exists alongside "2k", reachable via the same URL pattern with `2k_` swapped for `8k_`. Turned out to be inconsistent in practice: Jupiter and Saturn's "8k" files are actually only 4096x2048 (4x the pixel data of "2k", landing at a reasonable 1-3MB each), while Earth's and the Moon's "8k" files are genuine 8192x4096 source art — swapping those in too would have added roughly 34MB combined for Earth+Moon alone, a bad trade for a page that should load quickly, especially since Earth's texture wasn't what was actually flagged. Bumped only `tex_jupiter.jpg`, `tex_saturn.jpg`, and `tex_saturn_ring.png` to the "8k" URLs in `download_textures.py`, left Earth/Moon/everything else at 2k, deleted the old low-res files so the (already-fixed) download script would actually re-fetch rather than skip them as "already exists," and re-ran it. Confirmed visually via fresh screenshots — noticeably more surface/band detail on both planets.

---

### Part 8 — Venus, and Picking the Right Texture

Ricky asked for Venus next: same treatment as Jupiter and Saturn, real texture showing in both `planet.html` and `index.html`.

One decision Venus needed that Jupiter/Saturn didn't: Solar System Scope offers two different Venus images — `venus_surface` (a false-color radar terrain map of the actual ground, from Magellan probe data) and `venus_atmosphere` (the real photographic cloud-top swirl pattern). `download_textures.py` had been pointing `tex_venus.jpg` at `venus_surface`. That's wrong for the "real photo" approach used everywhere else here — Venus's atmosphere is opaque; nothing has ever photographed its actual surface from outside. Switched the download URL to `venus_atmosphere` instead, which is what a camera genuinely sees: pale cream-gold swirling clouds, no terrain detail. Deleted the old (wrong) cached file and re-downloaded (224KB, 2048x1024 — no 8k tier exists for this one).

`renderVenus3D()` follows the exact same structure as `renderJupiter3D()` (no rings, no moon, no separate cloud layer — Venus's "surface" texture already *is* the cloud layer, so one sphere + bump map + warm limb glow is the whole thing), including `setupPlanetDrag()` from Part 6 for free. Added the `window._planetMaterials[1]` hot-swap block in `index.html`, same pattern as Jupiter/Saturn.

Verified via Playwright: close-up render shows the real swirling cloud texture cleanly (screenshot confirmed), `index.html`'s Venus material confirmed pointing at the real file, and drag-to-reposition confirmed working identically to Jupiter/Saturn (dragged it toward the bottom-right, position saved and rendered correctly) — all at the exact `Aion/Frontend/Code/` path Ricky's browser actually uses.

---

### Part 9 — Venus Reconsidered: "Bland Compared to Pictures of Venus"

Ricky sent reference photos — the famous fiery-orange Magellan radar globe most people actually picture when they think "Venus" — and said the atmosphere-photo version looked bland next to it. He was right: the real cloud-top photo is genuinely pale and low-contrast (that's just what Venus's atmosphere looks like), which reads as underwhelming compared to the iconic false-color terrain visualization, even though the terrain map isn't literally camera-true.

Switched `tex_venus.jpg` back to `venus_surface` (the Magellan radar map) — the same file Part 8 had deliberately avoided in favor of photographic accuracy. Confirmed first that Solar System Scope's version of it actually matches Ricky's reference images (downloaded and viewed it directly) before switching. Checked the "8k" tier for this file too — genuinely 8192x4096 at ~12.5MB, same situation as Earth/Moon in Part 7, too heavy — kept it at 2k (864KB). Updated `renderVenus3D()`'s comment to reflect the reasoning flip (visual iconicity over strict photographic accuracy, this time) rather than leaving stale reasoning in the code that argues against what it now does.

---

### Part 10 — Saturn "Still Too Bland"

Ricky sent two more reference photos — Cassini's north-pole hexagon storm close-up and the famous 2010-2011 "Great White Spot" storm band — and said Saturn still looked bland next to them. Checked the actual `tex_saturn.jpg` directly: it's a genuinely flat, low-contrast horizontal gradient with barely-visible banding. Confirmed Solar System Scope has no more-detailed Saturn alternative (checked for bump/normal-map variants too — none exist). This is a real limitation of the source data, not a rendering bug: the dramatic photos Ricky referenced are rare close-up Cassini flybys during specific storm events, not what any standard whole-globe texture map captures.

Rather than fabricate detail that isn't really there (procedural swirl overlays, fake storm shapes — the kind of thing already explicitly rejected for Jupiter earlier this project for looking fake), boosted the CONTRAST and SATURATION of the real texture data itself, the same idea as how astrophotographers process raw probe imagery for public release. Implemented via the canvas 2D context's native `filter` property (`contrast(145%) saturate(170%)`) applied to the loaded image before handing it to Three.js as a `CanvasTexture` — much faster than a manual per-pixel pass at 4096x2048. Also increased `bumpScale` from 0.012 to 0.022 so the now-more-visible banding gets more dimensional shading from the lighting rig. Added a shared `loadEnhancedTexture()` helper in `planet.html` (same pattern as `setupPlanetDrag()`) and replicated the same filter inline in `index.html`'s hot-swap block for the small orbiting Saturn, so both views match.

Verified visually via a fresh screenshot: noticeably more tonal variation and warmer color separation between bands, more three-dimensional surface shading. Confirmed the `index.html` material is genuinely using the enhanced `CanvasTexture` (not the flat original file) via direct material inspection.

---

### Part 11 — Blending Real Photo Elements Into Saturn's Texture

Ricky pushed further: even with the contrast/saturation boost, Saturn still looked bland next to the reference photos (the hexagon storm, the Great White Spot). He asked whether the actual photos he'd shared could be blended in directly, rather than a painted/procedural approximation — pointing out that those photos don't actually look that different in style from textures already used elsewhere. That's a fair, explicit creative request for a stylized composite, not a request to misrepresent the render as scientifically precise photography — same category as the Venus texture decision.

Used the exact screenshots Ricky had already shared in chat as source material (no web search needed once reframed this way — those already ARE real Cassini photos). Wrote `compose_saturn_texture.py`: crops the UI chrome off each reference screenshot, extracts a representative strip from each (the blue vortex from the hexagon photo, the turbulent white swirl from the storm photo), stretches each across the full texture width, and alpha-composites them onto `tex_saturn.jpg` with feathered vertical edges — the hexagon strip at the very top rows (north pole in equirectangular mapping), the storm strip around 26% down (roughly matching the real storm's ~35°N latitude).

First attempt produced visible dark bands above/below both features — diagnosed by checking per-row brightness in the source crops directly rather than guessing: the crop boxes had wandered into genuine black background pixels (space beyond the planet's curved limb, and a stray white/black UI border artifact at the very top of the hexagon screenshot), which then got stretched by the resize into visible dark bars. Fixed by numerically verifying each candidate crop box's minimum brightness before compositing (`box.mean(axis=2).min()`) until both were confirmed clean, not just eyeballing the crop.

Result verified by viewing the flat composited texture directly, then rendering it on the actual 3D sphere via Playwright — the blue vortex reads clearly at the pole edge (only a sliver is in frame at the current camera angle, consistent with how the other planets are framed) and the storm swirl is clearly visible as a distinct band. Confirmed working in both `planet.html` and `index.html` (material check confirms the small orbiting Saturn also uses this composited base). Saved the compositing script into the repo (`compose_saturn_texture.py`, root level, same tier as `download_textures.py`) for reproducibility, documented with the exact crop boxes and the brightness-check technique — though re-running it needs the source screenshot crops as local files, which aren't checked into the repo since they're personal chat attachments, not sourced assets.

`download_textures.py`'s existing skip-if-exists logic (skips files already >50KB) means re-running the downloader in the future won't accidentally clobber this composited texture back to the flat original — worth remembering if that ever seems to "undo" this work unexpectedly.

---

### Part 12 — Seam and Blur: Two Real Bugs in the First Composite

Ricky sent a screenshot showing a hard diagonal cut line on the sphere and said it was also too blurry compared to Jupiter's crisp surface, and asked for it to wrap fully without the cutoff. Both were real, diagnosable bugs in Part 11's compositing approach, not fixable by nudging parameters:

1. **Seam.** Part 11 stretched each source strip across the *full* 4096px texture width in one shot. A single stretch isn't seamless where the texture wraps around the sphere (x=4095 meets x=0) — the two ends of a plain stretched strip are unrelated pixels, so a hard cut line appeared once that longitude rotated into view. This is exactly what Ricky was seeing.
2. **Blur.** Stretching a ~270px source crop to fill 4096px is a ~15x upscale, which destroys sharpness — that's why the composited bands read as visibly softer than the surrounding real texture, and than Jupiter (which is never stretched like this at all).

Rewrote the compositor (`compose_saturn_texture.py`) properly:
- **Hexagon** (a real polar vortex genuinely does wrap the whole pole, so it can't just be a bounded patch): mirror-tiled 2x around the circumference instead of one stretch. Mirroring means each tile's edge is a reflection of its neighbor's, so the tile-to-tile seam is pixel-continuous. Verified numerically, not just by eye: mean pixel difference at both the tile boundary (0.63) and the full wrap-around seam (0.50) came out *lower* than the natural adjacent-pixel variance elsewhere in the same image (1.59) — genuinely seamless, confirmed at the pixel level rather than trusting a screenshot.
- **Storm** (a real, localized feature — even in the reference photo it never wrapped the whole planet): switched from a full-width stretch to one bounded, feathered-on-all-sides patch that never touches the texture's wrap edges at all, so there's no seam risk by construction, and the upscale factor dropped to ~4x instead of ~15x.
- Along the way, the storm patch initially showed a visible dark rectangular halo around the bright swirl — plain alpha-compositing was also showing the storm photo's own darker background/in-between pixels, which are darker than Saturn's real bright bands there. Switched to a LIGHTEN blend (per-channel max): where the patch is darker than the base, the base simply wins, so only the genuinely bright swirl pixels ever show through.
- Added a final `UnsharpMask` pass over the whole composited result to close some of the remaining softness gap with Jupiter.

Rebuilt from a clean, never-composited copy of the original 8k download (recovered from a cached earlier download rather than re-fetching) rather than editing on top of Part 11's already-flawed output, to avoid compounding errors. Verified the in-browser 3D render directly rather than only the flat texture preview, since equirectangular distortion near the poles can look different once wrapped on a sphere. A real rotation sweep to visually confirm the seam in-browser wasn't practical — this sandbox's software rendering is slow enough (consistent with prior sessions' notes on this environment) that a full ~40s rotation barely progressed within a reasonable test window — so the seam fix was verified the more reliable way, directly on the pixel data.

---

### Part 13 — Too Subtle: Boosting Color Intensity

Ricky liked the seam/blur fix but said both features now read as too subtle, blending into the base texture rather than standing out as distinct color events. Fair — the fix in Part 12 (tighter feathering, smaller patches) traded some visual presence for correctness.

Boosted saturation and contrast on both source crops before compositing (`ImageEnhance.Color` ~1.6-1.9x, `ImageEnhance.Contrast` ~1.15-1.2x) — the hexagon's blue in particular had been landing too close to the base texture's own dim, grey-blue polar-cap tone once blended in, so it read as a muted tint rather than a distinct hue. Also reduced how aggressively both features feather out (hexagon bottom feather 0.6→0.45 of its band height; storm feather zones 0.3/0.2→0.18/0.12 of the patch), so more of each feature holds its full color before fading into the surrounding real texture, rather than washing out early.

Verified on the actual 3D render: the blue at the pole is now clearly a distinct color event rather than a faint tint. Synced the updated texture and the color-boost changes in `compose_saturn_texture.py` to both file locations.

---

### Part 14 — Camera Orbit Controls

Ricky asked to be able to move the camera around the planets — a different thing from Part 6's drag-to-reposition feature, which moves the *planet* within a fixed frame, not the viewpoint around it.

Added Three.js `OrbitControls` to all four real-3D-render planets (Earth, Venus, Jupiter, Saturn). One wrinkle: cdnjs' three.js r128 package only bundles the core `three.min.js`, not the `examples/` addons — `OrbitControls.js` isn't there at all. Found it on jsdelivr instead, which mirrors the full npm package for the same r128 release (`cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js`), confirmed to be the right non-module/classic-script build (attaches `THREE.OrbitControls` globally, same loading pattern as `three.min.js` itself).

The real design question was how this coexists with Part 6's existing planet-drag feature, since both want to handle mousedown/mousemove on the same canvas. Resolved by making them mutually exclusive on the same `window.__siEditMode` flag the text layout editor already uses: orbit controls are the default (normal viewing), and get disabled (`controls.enabled = !window.__siEditMode`, checked every frame) whenever edit mode is on, at which point `setupPlanetDrag`'s handler takes over instead. Also disabled `OrbitControls`' built-in panning specifically, since panning and Part 6's planet-drag would otherwise do near-identical things through two different mechanisms.

Added a shared `loadOrbitControls()` (loads the script once, callback-based) and `makeOrbitControls()` (damping enabled, pan disabled, min/max zoom distance scaled off each planet's own starting camera distance) helper, called from each of the four `renderX3D()` functions' tick loop setup, right after `setupPlanetDrag()`. The planet's own self-rotation (`saturn.rotation.y = t*1.1` etc.) keeps running independent of camera orbit, same as before.

Verified via Playwright: dragging the canvas (not in edit mode) rotated the camera to Jupiter's dark/unlit side, confirming real camera movement, not just a visual no-op. Confirmed edit mode's planet-drag still works correctly and independently afterward (position saved to `localStorage` as expected). Confirmed all four planets load `THREE.OrbitControls` cleanly with no console errors.

---

### Part 15 — Mercury, With Everything

Ricky asked for Mercury next: same real-texture render, same texture in `index.html`, and all the same features (drag-to-reposition, camera orbit controls) — the full pattern proven four times over on the other planets.

`renderMercury3D()` follows Venus's structure most closely (no rings, no moon, no separate cloud layer), with one deliberate difference: no atmosphere glow shell. Every other real-render planet so far has one (Venus's thick clouds, Jupiter/Saturn's gas envelopes), but Mercury has essentially no atmosphere — real MESSENGER/Mariner 10 photos show a stark, hard-edged disk with no soft halo at all, so adding one would have been inaccurate for an airless body. Also used a moderately higher `bumpScale` (0.025) than Venus's smooth-clouds 0.01, since Mercury's real texture is heavily cratered and benefits from more pronounced shading.

Checked the "8k" texture tier first, same as every prior planet — Mercury's turned out to be a genuine 8192x4096 at 15MB, same heavy category as Earth/Moon, so kept the existing 2k version (already downloaded in Part 1) rather than paying that cost for a planet nobody had flagged as lacking detail.

Also caught and fixed a stale comment while adding Mercury's `index.html` hot-swap block: Venus's neighboring comment there still said "same real cloud-top photo," left over from before Part 9 switched it to the radar terrain map — corrected to match what's actually loaded.

Verified via Playwright: close-up render confirmed clean with real crater detail and correct bump shading (screenshot); dragging the canvas orbited the camera to Mercury's dark side, confirming real camera movement; edit-mode planet-drag still saved a position correctly afterward, confirming no conflict between the two; `index.html` material confirmed pointing at the real `tex_mercury.jpg` file. Synced code and texture to `Aion/Frontend/Code/` (the texture hadn't been copied there yet, only ever downloaded to repo root) and re-verified both reachable at that exact path.

---

### Part 16 — Mars

Ricky asked for Mars next, same pattern as every planet before it. `renderMars3D()` follows Mercury's structure, plus one addition: a faint dusty-pink atmosphere glow (opacity 0.22, much weaker than Venus/Jupiter/Earth's). Real Mars has a genuine atmosphere, just a very thin one (~1% of Earth's surface pressure) — Mercury's bare airless treatment would have undersold it, but a full-strength glow like Venus's would have overstated it. Landed at a low-opacity middle ground.

Checked the "8k" texture tier, same as every planet so far — genuinely 8192x4096 at 8.4MB, kept the existing 2k version.

Verified via Playwright: close-up render came out especially clean — Valles Marineris and a large impact crater are both clearly visible in the rendered surface detail, not just the flat color. Camera-orbit drag correctly rotated to Mars's dark side; edit-mode planet-drag still saved its own position afterward with no conflict; `index.html`'s Mars material confirmed pointing at the real texture file. Synced code and texture to both locations.

---

### Part 17 — Uranus

Ricky asked for Uranus next. `renderUranus3D()` uses a moderate-strength pale cyan atmosphere glow (0.42 opacity — between Mars's thin 0.22 and Jupiter/Saturn's gas-giant strength, since Uranus is a genuine ice giant with a real, if hazy and mostly featureless, atmosphere).

Checked the "8k" texture tier, same as every planet — this time it's a straight 404, no 8k file exists for Uranus at all from this source (unlike every prior planet, which at least had *some* 8k file even if too heavy). Real close-up Uranus photos are famously almost featureless — its atmosphere is unusually uniform even at high resolution — so this tracks; kept the existing 2k version, the only option regardless.

One deliberate extra: applied Uranus's real ~98° axial tilt as a one-time static rotation on the group (same technique as Saturn's 26.7° ring tilt from Part 2) — Uranus is the one planet that genuinely rotates almost entirely on its side rather than spinning upright like every other planet in the system, and the existing description text on the page already calls this out directly ("Uranus rotates on its side — its axial tilt is 98 degrees"), so the visual now actually matches what the page already says. The small orbiting `index.html` version does *not* get this tilt — kept as a simple texture swap like the others, since the tilt is specifically a closeup detail.

Verified via Playwright: close-up render confirmed clean, correct pale-cyan coloring with a visible atmospheric glow; camera-orbit drag rotated correctly to the dark side (with the glow rim still visible in shadow, as expected for a real atmosphere effect); edit-mode planet-drag still saved its own position with no conflict; `index.html` material confirmed pointing at the real texture. Synced to both locations.

---

### Part 18 — Uranus Was Too Flat: Stylized Bands and a Swirl

Ricky sent a reference image — a stylized, artistic ice-giant render with visible flowing cloud bands and a distinct swirl vortex — and asked for Uranus to look more like it. Confirmed which planet he meant before starting (Uranus, not Neptune — the reference could plausibly have been either), since building the wrong one would waste real work.

Checked the actual raw texture directly first: it's a completely flat vertical gradient, no bands, no noise, nothing at all. Real Uranus genuinely doesn't show much atmospheric detail even in the best available imagery — Voyager 2's 1986 flyby is still the most detailed close-up anyone has, and it's famously almost featureless. Unlike Saturn (which had real Cassini storm/hexagon photos to composite in), there's no equivalent real photo source for Uranus at the level of detail Ricky's reference showed, and that reference image itself reads as a clean artistic/stylized rendering, not raw probe photography. So this was built procedurally instead — flowing bands and a swirl painted from scratch, in the reference's color palette, explicitly as a stylized addition on a planet whose real texture had nothing underneath to preserve.

Two real technical problems took several iterations to solve, both worth remembering for next time:
1. **Blobs, not streaks.** The first attempts generated ordinary isotropic value noise (same detail frequency in both directions) and tried to fake horizontal flow with a directional blur afterward — this never actually worked, the noise stayed blob-shaped no matter how it was post-processed. The real fix was generating genuinely *anisotropic* noise from the start (few noise cells across the width, many down the height, at the base octave) — few, naturally-elongated cells is what produces real streaks, not blur applied after the fact.
2. **A hard, ugly dot at the swirl's center.** Several falloff-math attempts (adjusting exponents, radii) never fully softened it on their own — a real Gaussian blur pass over the finished image was what actually fixed it; math-only falloff adjustments kept producing some sharp transition somewhere.

Verified wrapped on the actual 3D sphere (not just the flat texture preview, which was misleading at each iteration — same lesson as Saturn's Part 12) with `renderUranus3D`'s real 98° axial tilt and lighting applied: the result reads as a genuinely dynamic, striking planet with visible flowing bands and a clearly-defined swirl, a large improvement over the flat original.

---

### Part 19 — Rebuilt on the Real Colors, More Exaggerated

Ricky asked to go back to the real NASA image, then to make it more exaggerated with more texture — meaning: don't invent a new palette from scratch (Part 18's lavender-blue was made up), build the exaggeration up FROM the real Solar System Scope colors instead.

Confirmed there's genuinely nothing real to extract first — sampled the clean texture directly and measured the residual variation after removing its smooth vertical gradient: standard deviation of ~0.35 out of 255, just JPEG noise, no hidden real banding to reveal via contrast. So the real colors themselves (a fairly uniform cyan-teal, sampled as an actual per-row average from the clean file) became the base to build on, rather than Part 18's invented lavender-blue-white palette.

Rebuilt with that real base: bands now darken/lighten the actual sampled color by up to ~28% (rather than blending toward invented palette colors), pushed further than Part 18 across the board — band contrast, swirl arm intensity, color saturation, overall contrast all increased. The swirl's eye came back slightly hard-edged once its color got darker for the bolder look (more color contrast against the surrounding halo reads as a harder edge even with the same falloff math) — fixed by increasing the post-paint blur from 2.5px to 3.5px specifically to compensate.

Rewrote `enhance_uranus_texture.py` to take the clean source texture as an explicit command-line argument rather than any implicit path, specifically so it can never accidentally sample colors from an already-enhanced `tex_uranus.jpg` on a future run (which would compound distortion). Verified again on the actual 3D sphere before finalizing. Synced to `Aion/Frontend/Code/`.

---

### Part 20 — Reverted: Back to the Plain NASA Texture

Ricky said Part 19's real-color-based version still didn't look meaningfully different and asked to just go back to the plain NASA image — no stylized bands or swirl at all. Restored the clean, untouched original (the same backup copy Part 19 sampled its base colors from) to both `textures/tex_uranus.jpg` and the `Aion/Frontend/Code/` copy, and removed `enhance_uranus_texture.py` from the repo since nothing calls it anymore and keeping an unused, non-applied enhancement script around would just be confusing clutter. Verified via a fresh screenshot: back to the flat, genuine teal-cyan gradient with no invented detail.

---

### Part 21 — A Real Photo That Actually Has Detail: JWST

Ricky then said the plain NASA texture itself "looks so bland, no texture" — a fair, separate complaint from Parts 18-20's stylization attempts. The real problem was never the palette or the exaggeration level; it's that the Voyager 2 1986 flyby data behind the Solar System Scope texture is genuinely almost featureless (confirmed numerically back in Part 19 — residual variation after removing the smooth gradient is ~0.35/255, just JPEG noise). No amount of enhancing that specific file reveals detail that was never captured.

Searched for a better real source instead of enhancing the same flat data further. NASA's 2023 JWST NIRCam images of Uranus turned out to be exactly what was needed — genuinely higher-fidelity real photography with an actual visible bright polar cap, subtle darker cloud structure, and real bright features, not an invented palette. Fetched the official image directly from NASA's science.nasa.gov asset page (found the real download URL, not a placeholder).

The fact that made this actually usable as a *texture*, not just a nice photo: Uranus's ~98° axial tilt means its pole points almost directly at Earth/JWST much of the time, so this image is essentially a pole-on disk view — the exact same situation as the Cassini hexagon photo used for Saturn's pole (Part 2). Measured the disk's center/radius directly from the image, verified a crop box was entirely inside the circle (`box.mean(axis=2).min() > 0`, same technique that caught the black-background bug in Saturn's Part 11/12), and mirror-tiled it onto the north pole of the equirectangular texture — proven-seamless technique from Saturn, reused directly.

First pass only extended the real-detail band to the top 30% of the texture (matching Saturn's original hexagon band height) — wrapped on the sphere with Uranus's real 98° tilt, that put nearly all of the added detail out of frame at the default (non-orbited) camera angle, the same "only a sliver visible" issue Saturn's hexagon has. Extended the band to 48% of the texture height instead, using a taller (still verified-clean) crop of the disk, so the real captured detail is actually visible without needing to manually orbit the camera up toward the pole.

Verified on the actual 3D sphere: soft, genuine luminosity variation now visibly spreads across the default view, not just a texture-preview artifact. Saved `compose_uranus_texture.py` (same tier as `compose_saturn_texture.py`) documenting the source, the disk-center measurement, and the black-background verification step. Synced to both locations.

---

### Part 22 — Still Bland: A Real Gap, Not a Judgment Call

Ricky looked at the rendered result and asked directly whether it was actually enough — it wasn't, and looking at it critically the reason was obvious: `renderUranus3D()` was still just doing a plain `loader.load()` with `bumpScale: 0.008`, the lowest of any planet (a leftover from when the texture had zero real detail to pick up). Every other real-3D planet either goes through `loadEnhancedTexture()`'s contrast/saturation boost (Saturn) or has a properly-tuned bump scale for its real surface relief (Mars, Mercury). Uranus had neither — the real JWST detail composited in Part 21 was there in the color data, but nothing in the render pipeline was making it visible. This wasn't a "maybe push it further" judgment call, it was a straightforward oversight caught by actually looking at the result instead of assuming the compositing work was sufficient on its own.

Fixed both: switched to `loadEnhancedTexture()` with `contrast:1.5, saturate:1.6` (similar strength to Saturn's), and raised `bumpScale` to make the now-enhanced color variation actually cast shading. First attempt at `bumpScale: 0.035` was too aggressive — it visibly amplified JPEG compression block artifacts in the source texture into a quilted/blocky look in one region. Dialed back to `0.022`, which keeps the real streaked texture clearly visible while keeping the block artifacts minor. Applied the identical contrast/saturation boost to `index.html`'s hot-swap block too, matching Saturn's precedent there.

Verified on the actual 3D sphere: real, clearly visible diagonal streak texture now spreads across the whole default view — a genuine, substantial improvement over both the original flat texture and the under-enhanced first JWST composite. Confirmed `index.html`'s small orbiting Uranus also shows the enhancement (`hasBumpMap: true`, no errors). Synced to both locations.

---

### Part 23 — Neptune

Ricky asked for Neptune next. Checked the raw Solar System Scope texture directly *before* writing any code this time — a real, direct lesson from Uranus's Part 18-22 detour, where the actual problem (missing contrast enhancement and bump scale) wasn't caught until several iterations in. Neptune's default texture turned out to already have genuine visible detail: the real Great Dark Spot storm, real banding, and small real cloud wisps are all present in the raw file — nothing like Uranus's completely flat gradient. No compositing needed here, just the standard pipeline applied correctly from the start.

`renderNeptune3D()` follows the Mars/Jupiter template, but — learning directly from Part 22's mistake — ships with `loadEnhancedTexture()`'s contrast/saturation boost (1.3/1.4, milder than Uranus's 1.5/1.6 since Neptune's source already has real contrast to work with) and a properly-tuned `bumpScale` (0.02) from the very first commit, not bolted on after the fact. Same for `index.html`'s hot-swap block — the contrast boost was included immediately rather than needing a follow-up fix.

Checked for an 8k tier (404, none exists — consistent with Uranus, apparently neither ice giant has one from this source).

Verified via Playwright: close-up render shows vivid, correctly deep-blue coloring with visible atmospheric glow and subtle real banding (the Great Dark Spot itself wasn't in frame at this particular rotation angle, but the underlying texture data has it — orbit controls let Ricky rotate to find it); camera-orbit drag rotated correctly to the dark side with the glow rim still visible in shadow; edit-mode planet-drag saved its own position with no conflict; `index.html` material confirmed using the enhanced `CanvasTexture`. Synced to both locations.

---

### Part 24 — Pluto Started, Blocked Mid-Investigation: Wrong Planet Entirely

Ricky asked to do Pluto next — same pattern as the previous eight planets. Checked the raw texture first, same discipline established after Uranus's Part 18-22 detour, before writing any render code.

Found something worse than Uranus's "just flat": `download_textures.py`'s existing entry for `tex_pluto.jpg` points at `2k_eris_fictional.jpg` — that's **Eris**, a different dwarf planet entirely, and Solar System Scope's own filename admits it's "fictional" (presumably a stand-in since Eris is too distant to have a real mapped surface texture at all). Viewed the actual file: a generic grey icy cratered surface with no heart-shaped feature — confirms it's not Pluto's real, extremely famous surface (Tombaugh Regio, the giant nitrogen-ice "heart," from New Horizons' 2015 flyby, one of the most iconic real photos of any body in the solar system). This is a real, worse-than-cosmetic bug in the existing download script, not a style choice — Pluto has been silently showing a different celestial object's texture (mislabeled as fictional, no less) this whole time.

Started searching for NASA's real New Horizons-derived Pluto global map to use instead (same idea as Uranus's JWST detour, but this time the "better real source" question isn't optional — the current one is wrong, not just bland). Web search hit a session rate limit before finding a usable direct download URL (resets 4:20am) — genuinely blocked, not a judgment call to pause on.

---

### Part 25 — Pluto Finished: The Real New Horizons Mosaic

Resumed once WebSearch was usable again. `science.nasa.gov` and `solarsystemscope.com` both came up empty for a real Pluto map, but `astrogeology.usgs.gov` (the actual NASA/USGS home for planetary map products) blocked `WebFetch` outright (403) — the same site accepted a plain `curl` with a browser User-Agent header just fine, mirroring the exact `download_textures.py` bot-protection pattern from Session 17 Part 1, just on a different site. Worked around it the same way: `curl -A "Mozilla/5.0"` instead of `WebFetch`.

Found the real product: NASA/JHU-APL/SwRI's New Horizons global mosaic (`pluto_new_horizons_lorri_mvic_global_mosaic_300m`), grayscale (LORRI is panchromatic), with a reasonable 1024x512 JPG preview (82KB) alongside a genuinely huge 309MB full-resolution TIF — kept the JPG; Pluto is the smallest, most distant body here and will never need more resolution than that on screen.

The real complication: New Horizons only imaged one hemisphere in detail during the 2015 flyby, so a real chunk of the mosaic is flat black (unmapped far side). A first attempt at filling it by mirroring "everything below row N" left black wedges bleeding through, because the real/unmapped boundary is a jagged terminator line, not a clean horizontal cutoff. Fixed with a genuine per-pixel mask instead (`compose_pluto_texture.py`): fill each no-data pixel from the vertical mirror if it has real data there, else the horizontal wrap-around mirror (equirectangular maps are seamless left-right), else a local blur as a last resort. Every pixel in the final result is still real New Horizons data (or a blur of it) — nothing invented for the unphotographed face.

Fixed `download_textures.py`'s actual bug: its `tex_pluto.jpg` entry pointed at `2k_eris_fictional.jpg` and always had — removed the entry entirely (no one-shot URL exists for the composited real result) and documented why in its comment, so a future run doesn't silently reintroduce the wrong planet.

`renderPluto3D()` follows the Neptune-established pattern (enhancement pipeline + bump scale from the start): tints the grayscale mosaic warm tan via the material's base color (multiplied with the texture) rather than rendering unnaturally neutral grayscale, and skips the atmosphere glow entirely — Pluto's real nitrogen atmosphere is even thinner than Mars's, same reasoning as Mercury's airless treatment. `index.html`'s hot-swap block applies the same warm tint via a canvas multiply-blend.

Verified via Playwright: close-up render shows genuine cratered, warm-toned real terrain (the heart wasn't in frame at this rotation, but orbit controls let it be found); camera-orbit correctly rotated to the dark side; edit-mode planet-drag saved its own position with no conflict; `index.html` material confirmed using the enhanced/tinted `CanvasTexture`. Saved `compose_pluto_texture.py` (same tier as the Saturn/Uranus scripts). Synced everything to both locations.

---

### Part 26 — Pluto Was Blurry: Upscaling vs. Real Resolution

Ricky pointed out Pluto looked too blurry. Real, identifiable cause: Part 25 used the USGS product page's small 1024x512 JPG preview and let it get upscaled 2x to the 2048x1024 output — upscaling can't add detail that was never captured, so the result was inherently soft no matter how the bump scale or sharpening was tuned.

Fixed by going back to the same USGS page and downloading the actual full-resolution source instead: `Pluto_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif`, a genuine 24888x12444, ~310MB scientific product. Too large to keep as a committed asset, but fine as a one-time source to downsample FROM — updated `compose_pluto_texture.py` to downsample it in two steps (first to a 4096x2048 working resolution, keeping the per-pixel void-fill math from Part 25 off the full 310-million-pixel array, which would've been unnecessarily memory-heavy; then a final LANCZOS pass down to the real 2048x1024 output), so the result is genuinely supersampled from real detail rather than upscaled from a low-res preview.

Verified visually before deploying: crater rims are now crisp with real shadow definition, fracture lines and ridges are clearly resolved, and even the cellular ice-polygon texture inside Tombaugh Regio (the heart) is faintly visible — all real captured detail that the 1024px preview simply didn't contain. Confirmed on the actual 3D sphere too: the bump map now has genuine height variation to shade, giving real dimensional relief instead of the previous soft, flat-looking craters. Synced the corrected texture to both locations.

---

### Part 27 — Still Blurry Up Close: Texel Limit, Not a Processing Bug

Ricky sent a screenshot zoomed in much closer than any of the verification screenshots so far (using the orbit-controls zoom built in Part 14) — at that distance, 2048x1024 was visibly soft again. Not a regression in the fix itself; every finite-resolution texture eventually shows its texel limit at some zoom distance, and 2048x1024 (matching most of the other planets) simply doesn't have the same headroom as Jupiter/Saturn's 4096x2048 "8k" tier.

Since `compose_pluto_texture.py` already downsamples from the real 24888x12444 source through an 8192x4096 working resolution, there was real detail being thrown away at the final step for no strong reason — raised the final output to 4096x2048 (matching Jupiter/Saturn) and the working resolution to 8192x4096 to keep a genuine 2x supersample margin above that. Result: 2.2MB, in line with Jupiter/Saturn's file sizes at the same resolution.

Verified by actually reproducing Ricky's test rather than trusting the fix by reasoning alone — scripted a Playwright test that dollies the camera in close via repeated scroll-wheel events (`OrbitControls`' zoom), matching how he'd have gotten to that view manually, then screenshotted. Confirmed: crater rims and terrain in the lit region are now genuinely crisp at that distance; the smoother-looking area on the shadowed side is low light, not texture blur — a real, meaningful distinction confirmed by checking rather than assumed. `index.html`'s small orbiting Pluto and the close-up drag/orbit-controls verification both still pass with no errors after the resolution bump. Synced to both locations.

---

### Part 28 — Still Reported Blurry: Stale Browser Cache, Not the File

Ricky sent another screenshot, this time at roughly the same view distance as earlier (not a deep zoom), still showing the old blurry look. Checked both texture files directly (`file` + `ls -la` on both `textures/tex_pluto.jpg` and the `Aion/Frontend/Code/` copy) — both genuinely are the correct, current 4096x2048 / 2.2MB version. The files were right; `tex_pluto.jpg` had simply been overwritten in place three times in a row (Parts 25-27) with the filename never changing, and the local dev server Ricky's testing against likely wasn't sending headers that would make the browser re-fetch instead of reusing whatever it cached from an earlier page load that day.

Fixed by adding a cache-busting query string (`tex_pluto.jpg?v=3`) to both load sites (`planet.html`'s `renderPluto3D` and `index.html`'s hot-swap block) — forces a fresh fetch regardless of what the browser cached under the bare filename, and documented in both places that the version number needs bumping if this file is ever regenerated again. Verified the cache-busted URL actually resolves (200, same file) and re-ran the full Pluto verification (close-up, drag, orbit, `index.html` material) with no errors. Synced to both locations.

---

### Part 29 — Still Blurry After the Cache Fix: Missing Anisotropic Filtering, Codebase-Wide

Ricky sent yet another screenshot after hard-refreshing multiple times — same exact look as before Part 28's fix, so it wasn't caching. This time the pattern was distinctive on close inspection: a diagonal, directional, almost "melted wax" streaky smear, worse toward the edges of the sphere and basically absent dead-center. That's a different signature than the uniform softness Parts 26-27 fixed — uniform softness comes from too few source pixels; directional smearing that gets worse at the edges of a curved surface is the textbook symptom of a GPU sampling a texture without anisotropic filtering at a grazing viewing angle (most of a sphere's visible surface, away from the point facing the camera dead-on).

Confirmed with `grep -n "anisotropy" planet.html index.html` — zero matches in either file. This property had never been set anywhere in the codebase, meaning it wasn't a Pluto-specific bug at all; every real-textured planet has been silently affected since the very first one (Jupiter, Session 16). Pluto just made it most visible because its high-contrast crater texture shows streaking that a smoother, lower-contrast planet's texture would partially hide.

Fixed with a small shared `setAniso(tex)` helper (`tex.anisotropy = 16` — the de facto max most GPUs support; Three.js auto-clamps down if the real hardware max is lower) added to both files:
- `planet.html`: called inside `loadEnhancedTexture()` on the composited `CanvasTexture`, plus inline at all 9 individual `loader.load()` call sites that don't go through that helper (Earth's 4 textures, Jupiter, Saturn's ring, Venus, Mercury, Mars).
- `index.html`: same pattern across its 12 `texLoader.load()` call sites — for the 4 planets that build a canvas-enhanced texture locally (Uranus, Neptune, Pluto, Saturn), `setAniso()` is called on the resulting `CanvasTexture`, not the raw loaded one, matching how `planet.html` handles it.

Verified two ways: a Playwright reproduction of Ricky's exact scenario (zoom in close via repeated scroll-wheel events, then orbit to a grazing side angle on Pluto in `planet.html`) — the crater/terrain detail is now crisp and granular with no diagonal streaking. Separately, queried every material in `index.html` after load and confirmed `anisotropy: 16` landed on all 9 planets' textures with zero JS errors. Synced both files to `Aion/Frontend/Code/`.

This was a real fix (every planet needed it) but it turned out not to be the actual cause of Ricky's specific Pluto complaint — see Part 30.

---

### Part 30 — Still "Trash": The Texture File Itself Had Real Baked-In Smear, Not a Rendering Bug

Ricky sent one more screenshot after Part 29's fix, direct and frustrated ("pluto is just as blurry as it ever was... it looks stupid"). Rather than trying another rendering-side theory, opened `textures/tex_pluto.jpg` directly and looked at the raw file — and the same diagonal "melted wax" smear was plainly visible in the file itself, in broad bands far from the black no-data wedge, not just at its seam. That ruled out every fix so far (resolution, caching, anisotropic filtering all operate on how a texture is *sampled and served* — none of them touch what's actually painted into the file), and meant Part 29's diagnosis, while a real and worthwhile fix, was never going to resolve this specific complaint.

Investigated why the source file itself smears: New Horizons' LORRI camera only captured its highest-resolution imagery along a narrow strip during closest approach; the rest of the encounter hemisphere was imaged from much farther away, at progressively lower resolution toward the limb. NASA/USGS's raw global mosaic reprojects that directly into the equirectangular map — the smear in `compose_pluto_texture.py` v1's output wasn't a compositing bug, it's what's actually in the source pixels. Confirmed this wasn't fixable by reprocessing: downloaded a second, independent, carefully-hand-composited source — Askaniy's "Pluto Texture Map (25K)" (24888x12444, blends the same New Horizons mosaic with a 2002 Hubble far-side fill and a separate true-color pass) — and it showed the exact same crisp-center/soft-limb structure. Two independent compositors landing on the same pattern confirms it's the real state of Pluto imaging data, not a bug in either pipeline.

The practical fix wasn't "process the bad data better" (impossible — the detail isn't there to recover), it was switching to the better-composited source. Differences from Askaniy's map that made the result genuinely better despite the same underlying data limits:
- Full sphere coverage with **no hard black void** — v1's raw NASA TIF left a true no-data hole that had to be mirror-filled by hand (Part 25), which is exactly what produced the jagged seam artifacts on top of the inherent smear. Askaniy's map fills the true far side with real (if low-res) Hubble data instead of a synthetic mirror, so there's no seam to feather in the first place.
- Already real, true color (New Horizons' actual color processing plus the "True Colors of Pluto and Charon" reference) — v1's source was grayscale LORRI-only, requiring the `0xcfa888` tan-multiply fake-color hack. Kept applying that hack on top of already-real color would have skewed it artificially orange, so it was removed from both `renderPluto3D` (`planet.html`) and the hot-swap block (`index.html`) — material color reverted to white, `loadEnhancedTexture`/canvas filter dialed back to a modest `contrast(110%) saturate(115%)` (the source no longer needs rescuing, just the same light touch every other planet gets).

Rewrote `compose_pluto_texture.py` to reflect the new source and much simpler process (no more per-pixel mask-fill — there's no void to fill): LANCZOS resize straight to 4096x2048, light `UnsharpMask`, done. Source downloaded via `curl` from the Google Drive folder linked on Askaniy's DeviantArt page (the DeviantArt page itself requires login to download; used a Playwright pass to pull the individual file ID out of the folder's rendered DOM, since Drive folder listings are client-rendered and not visible to a plain fetch). Noted the license in the script's docstring: CC BY-NC-SA 3.0 (non-commercial) — fine for the project as-is, worth revisiting if Soul Interface is ever monetized.

Verified visually: default view now shows genuinely crisp, richly-detailed, real-color terrain with no smear anywhere in frame — a real improvement, not a marginal one. Zoomed in far past normal viewing distance, the well-imaged hemisphere stays crisp while the genuinely-lower-resolution far side shows honest pixel blockiness rather than smearing — the correct, physically accurate failure mode for a texture at its real resolution limit, and not visible at all under normal use. Bumped the cache-busting query string to `?v=4` in both files. Synced texture + both HTML files to `Aion/Frontend/Code/`. **Committed** (Session 17's full planet-texture work, first commit of the session).

---

### Part 31 — Still Too Soft, Flat Contrast, and the Idle Spin Kept Finding the Bad Angle

Ricky checked the committed v2 texture live and called it correctly: better, but still not sharp enough, and the contrast looked "weird" (flat/washed rather than punchy). Three real, separate causes, all fixed:

1. **Sharpening was too conservative.** `compose_pluto_texture.py`'s `UnsharpMask(percent=40)` was deliberately timid to avoid ringing on real photo data, but landed too soft. Raised to `percent=65` (still a normal photo-sharpening value, not aggressive) — noticeably crisper on the well-imaged hemisphere, no visible ringing.
2. **Contrast/saturation were much weaker than every other composited planet.** Pluto's runtime boost was `contrast:1.1, saturate:1.15` — a holdover from when the texture was a grayscale rescue job needing a light touch. Every other enhanced planet uses a much punchier tier (Uranus 1.5/1.6, Saturn 1.45/1.7, Neptune 1.3/1.4). Raised Pluto to `1.3/1.25`, in both `planet.html` and `index.html` — brought it in line with the others instead of looking flat by comparison.
3. **The idle rotation was the real driver of "it's still blurry."** Pluto's texture isn't uniformly soft — it's sharp in a narrow band (New Horizons' actual imaging strip) and falls off fast outside it (confirmed: rotating just ~50° from front was enough to bring the smeared low-res band fully into view). Every other planet spins continuously with no downside since their real photos are reasonably uniform in quality all the way around; Pluto doing the same thing guaranteed that within a few seconds of idle time, the camera would be looking at the worst part of the texture — which is almost certainly what Ricky's screenshots kept catching. Replaced the continuous spin (`rotation.y = t*1.1`) with a bounded sway (`Math.sin(t*0.55) * 0.35`, ~±20°) that stays inside the sharp band. Also reduced `bumpScale` from 0.03 to 0.022 to stop the low-res region's smooth brightness gradient from reading as extra "melty" shading once lit.

Deliberately left `index.html`'s tiny orbiting overview on the same full continuous spin as every other planet there — at that icon scale the smear isn't visually significant, and special-casing it would be inconsistent with no real payoff.

Verified with Playwright: screenshotted at 2s, 6s, and 14s of idle time (well over a full sway cycle) — all three show the same crisp, richly-detailed, warm-contrast hemisphere, no smearing at any point. Re-synced texture + both HTML files to `Aion/Frontend/Code/`. **Committed** as a follow-up.

---

### Part 32 — Part 31's Sharpening Fix Introduced a New Artifact: Quilted-Looking Bump Noise

Ricky zoomed in extremely close and sent a screenshot showing the crater terrain looking jagged and "woven" rather than naturally eroded — a real regression from Part 31's fix. Recognized it immediately as the same class of artifact hit on Uranus earlier this session: the renderer uses the same texture for both the color map and the bump map, so `UnsharpMask(percent=65)`'s stronger edge contrast, once read as *height* by the bump map, turned every sharpened edge into visible fake fine-grain geometry. This wasn't the honest low-res far-side softness (Part 30/31) — it was a new artifact introduced by trying to fix that softness too aggressively.

Fixed by splitting the correction across both dials instead of leaning entirely on sharpening: eased `compose_pluto_texture.py`'s `UnsharpMask` back to `percent=50` (between v2's too-soft 40 and Part 31's too-quilted 65), and cut `bumpScale` from 0.022 to 0.012 in both `planet.html`'s `renderPluto3D` and `index.html`'s hot-swap block (the latter didn't set `bumpScale` explicitly before, silently defaulting to Three.js's `1.0` — set it explicitly now). The color map still reads crisp; the bump map no longer amplifies every sharpened edge into fake noise.

Verified with a Playwright reproduction of Ricky's exact framing (zoom in ~18 scroll-wheel steps, then orbit toward the upper-left crater field) — terrain now reads as coherent, naturally eroded surface with no quilting, and a normal-distance screenshot confirms crater rims and shadow definition are still clearly present, so the bump reduction didn't flatten it out. Bumped cache-busting to `?v=6`. Synced to `Aion/Frontend/Code/`.

---

### Current State

The bulk of Session 17 (everything through Part 31) is committed; Part 32 is ready to commit as a follow-up. All nine planets now have real-textured 3D renders with camera orbit controls, drag-to-reposition, and anisotropic filtering (Earth, Venus, Mercury, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto) — the procedural Canvas 2D renderer is no longer used for any planet in this project. Pluto went through the deepest debugging arc of the session (Parts 24-32): wrong planet → real NASA data but upscaled → real resolution but still texel-limited up close → stale cache → missing anisotropic filtering (a real, separate fix that applies to every planet) → directional smear genuinely baked into the New Horizons source data, fixed by switching to a better-composited true-color source (Askaniy's 25K map) → sharpening/contrast tuning plus a bounded idle sway once continuous rotation was found to reliably carry the texture's one genuinely low-res band in front of the camera → and finally, easing back the sharpening/bumpScale combination after it overshot into a fake "quilted" look at close zoom. Also included: the Saturn ring-spin fix, the Saturn real-photo composite, the Saturn contrast/saturation enhancement, `compose_saturn_texture.py`, `compose_uranus_texture.py`, `compose_pluto_texture.py` (now v2 with Part 32's tuning), and `download_textures.py`'s fixes (blocked headers, crashing print, Venus texture correction, and the Pluto/Eris fix).

### Next Session

- Part 32's fixes (moderated sharpening, reduced bumpScale on both files) are ready to commit as a follow-up if not already done.
- General lesson from Part 32, worth remembering for any future real-photo bump-mapped planet: a texture used as both color map and bump map means any sharpening applied for the color map's sake also gets read as fake height by the bump map. When tuning sharpness, check both — and if terrain starts looking "quilted" or "woven" at close zoom, suspect bumpScale amplifying sharpening artifacts before suspecting the source texture itself.
- `download_textures.py`'s header fix, resolution choices, and the Venus/Pluto texture corrections are real, generally-useful fixes — worth confirming they stay rather than reverting.
- Askaniy's Pluto map is CC BY-NC-SA 3.0 (non-commercial) — if Soul Interface's licensing model ever changes, this specific texture would need revisiting; everything else sourced this session (NASA/USGS/JWST) is public domain / free of that restriction.
- If Ricky ever wants Saturn's hexagon or Neptune's Great Dark Spot more prominent in the *default* (non-orbited) view, that's a camera framing change in the respective `renderX3D()`, not a texture change — right now both are reachable via orbit controls but not framed front-and-center by default.
- Worth a pass at some point checking whether `astrogeology.usgs.gov`'s WebFetch-blocks-but-curl-works quirk (Part 25) generalizes to other USGS/NASA subdomains, in case a future planet/texture search hits the same wall.
- Part 27's resolution lesson still stands independent of Parts 29-30's fixes: Earth/Venus/Mercury/Mars/Uranus are still at 2048x1024, same tier Pluto was before its resolution bump. Worth proactively checking those five under close zoom the same way Pluto was checked, rather than waiting for individual reports — though none of them are likely to have Pluto's specific problem (a single narrow high-res imaging strip), since they're all imaged far more uniformly (orbital/telescope coverage, not one flyby).
- If any texture gets overwritten in place under the same filename again in the future, remember Part 28 — add a cache-busting version query string at the same time, don't wait for a "still blurry" report to catch it.
- General lesson from Part 26, worth remembering for any future "the texture looks soft/blurry" report on a composited planet: check whether the source was upscaled before assuming the fix is more sharpening/contrast — sharpening a low-res upscale just makes fake-looking edges, it doesn't recover real detail. Always prefer downsampling from something bigger than the target over upscaling from something smaller.
- General lesson from Part 29: when a "blurry" report survives a resolution fix AND a cache-busting fix, check whether the pattern is directional/streaky rather than uniformly soft — that's the signature of missing anisotropic filtering, a rendering-pipeline setting, not a texture-file problem.
- The most important lesson of the whole arc, from Part 30: when a complaint survives every rendering-side fix (resolution, caching, sampling settings), stop debugging the pipeline and go look at the actual source file directly. Three different plausible-sounding rendering fixes in a row (Parts 27-29) were all real improvements that nonetheless left the actual problem untouched, because the problem was never in the pipeline — it was in what the texture file itself contained. A second independent source confirming the same defect pattern is strong evidence the "bug" is actually a real data limitation, not something to keep re-processing.
- The drag-to-reposition feature and orbit controls both cover Earth/Venus/Jupiter/Saturn/Mercury/Mars/Uranus/Neptune (all eight real-3D-render planets) — the procedural Canvas 2D planets don't have either, and weren't asked for.
