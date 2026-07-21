"""
Soul Interface — Saturn texture compositor (one-time, already applied)

Blends real Cassini photo elements into textures/tex_saturn.jpg: the
north-pole blue hexagon vortex, and the 2010-2011 "Great White Spot" storm
band. The raw Solar System Scope map has neither — it's a genuinely flat,
muted average — while these are the two features Ricky pointed to as
"what Saturn actually looks like" from real reference photos he shared.

Not a scientifically precise reprojection (the hexagon photo is a polar
orthographic view; equirectangular polar rows are heavily distorted and a
true reprojection would need real spherical math). Explicitly a stylized
addition, not a claim of photographic accuracy — same spirit as choosing
the venus_surface radar map over the literal (but bland) venus_atmosphere
photo earlier the same session.

v1 (first attempt, replaced) stretched each source strip across the FULL
4096px texture width in one shot. Two real bugs came from that:
  1. SEAM — a single stretch isn't seamless at the wrap edge (x=4095 meets
     x=0 on the sphere), so a hard visible cut line appeared once that
     longitude rotated into view.
  2. BLUR — stretching a ~270px source crop to fill 4096px is a ~15x
     upscale, destroying sharpness, which read as blurrier than the
     surrounding real texture (and than Jupiter, which never gets
     stretched like this).

v2 (current) fixes both:
  - Hexagon (needs to wrap the whole pole, since a real polar vortex does):
    mirror-tiled 2x around the circumference instead of one stretch.
    Mirroring means each tile's edge is a reflection of its neighbor's
    edge, so the seam between them is pixel-continuous — genuinely
    seamless, verified by checking mean pixel difference at both the
    tile-to-tile boundary and the x=0/x=W wrap (both came out LOWER than
    the natural adjacent-pixel variance elsewhere in the image). Also
    halves the upscale factor vs. one full-width stretch.
  - Storm (a real, localized feature — it never wrapped the whole planet
    even in the reference photo): kept as one bounded patch, feathered on
    all four sides, nowhere near x=0 or x=W, so there's no seam to worry
    about and the upscale factor is much smaller (~4x, not ~15x).
  - Storm uses a LIGHTEN blend (per-channel max), not plain alpha-over —
    alpha-over showed the storm photo's own darker background/in-between
    pixels too, which read as a visible dark box around the bright swirl,
    since Saturn's real bands there are brighter than the storm photo's
    background. Lighten only ever brightens: where the patch is darker
    than the base, the base wins outright, so there's nothing to
    feather-hide.
  - Final UnsharpMask pass over the whole result, closing some of the gap
    with Jupiter's crisper base texture.

This has already been run once — textures/tex_saturn.jpg (and the
Aion/Frontend/Code copy) already reflect its output, built from a clean
8k_saturn.jpg download with nothing composited in yet. Re-running requires
the two source crops as local files, NOT checked into this repo (they're
crops of screenshots Ricky shared in chat, not sourced assets):
  - hexagon_crop.png: a Cassini north-pole hexagon storm photo, UI chrome
    cropped out, roughly 590x480. Verified-clean sample box used:
    (150, 80, 420, 210) — i.e. crop.mean(axis=2).min() has no near-black
    (background/limb) pixels in that range.
  - stormband_crop.png: a Cassini "Great White Spot" storm photo, UI
    chrome cropped out, roughly 592x425. Verified-clean sample box used:
    (240, 85, 508, 190).
If picking new source photos, adjust the crop boxes below and re-verify
with box.mean(axis=2).min() before compositing — wandering into black
background/limb pixels (space beyond the planet's curved edge, or a stray
UI border) was the actual root cause of both bugs v1 hit, not the stretch
math itself.

Usage (if re-doing this from scratch):
  pip install pillow numpy
  python compose_saturn_texture.py <hexagon_crop.png> <stormband_crop.png>

This overwrites textures/tex_saturn.jpg in place — back it up first if you
want to keep the current composite to compare against.
"""
import sys
import os
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures', 'tex_saturn.jpg')


def vfeather(w, h, top, bottom):
    a = np.ones((h, w), dtype=np.float32)
    for y in range(h):
        v = 1.0
        if y < top: v = y / max(top, 1)
        elif y > h - bottom: v = (h - y) / max(bottom, 1)
        a[y, :] = max(0.0, min(1.0, v))
    return a


def hfeather(w, h, left, right):
    a = np.ones((h, w), dtype=np.float32)
    for x in range(w):
        v = 1.0
        if x < left: v = x / max(left, 1)
        elif x > w - right: v = (w - x) / max(right, 1)
        a[:, x] = np.minimum(a[:, x], max(0.0, min(1.0, v)))
    return a


def make_alpha_img(arr):
    img = Image.fromarray((arr * 255).astype(np.uint8), mode="L")
    return img.filter(ImageFilter.GaussianBlur(6))


def main():
    if len(sys.argv) != 3:
        print("Usage: python compose_saturn_texture.py <hexagon_crop.png> <stormband_crop.png>")
        sys.exit(1)
    hexagon_src, storm_src = sys.argv[1], sys.argv[2]

    base = Image.open(BASE).convert("RGB")
    W, H = base.size
    result = base.convert("RGBA")

    # ── Hexagon: seamless mirror-tiled band around the whole north pole ──
    # Saturation/contrast boosted before tiling — the raw crop's blue read
    # as too close to the base texture's own dim polar-cap tone once
    # blended in, i.e. it "blended in entirely" rather than reading as a
    # distinct color event. Also feathered less aggressively (0.6 -> 0.45)
    # so more of the band holds full color instead of fading out early.
    N_TILES = 2
    tile_w = W // N_TILES
    hex_band_h = int(H * 0.16)

    src = Image.open(hexagon_src).convert("RGB").crop((150, 80, 420, 210))
    src = ImageEnhance.Color(src).enhance(1.9)
    src = ImageEnhance.Contrast(src).enhance(1.15)
    tile = src.resize((tile_w, hex_band_h), Image.LANCZOS)
    tile_mirror = tile.transpose(Image.FLIP_LEFT_RIGHT)

    hex_strip = Image.new("RGB", (W, hex_band_h))
    for i in range(N_TILES):
        t = tile if i % 2 == 0 else tile_mirror
        hex_strip.paste(t, (i * tile_w, 0))

    alpha = vfeather(W, hex_band_h, top=0, bottom=int(hex_band_h * 0.45))
    hex_strip_rgba = hex_strip.convert("RGBA")
    hex_strip_rgba.putalpha(make_alpha_img(alpha))
    result.alpha_composite(hex_strip_rgba, dest=(0, 0))

    # ── Storm: one bounded patch, LIGHTEN-blended (not alpha-over) ───────
    # Same reasoning as the hexagon — boosted color/contrast, and tighter
    # feather zones (0.3/0.2 -> 0.18/0.12) so the swirl holds more of its
    # own color before fading into the surrounding base texture.
    storm_crop = Image.open(storm_src).convert("RGB").crop((240, 85, 508, 190))
    storm_crop = ImageEnhance.Color(storm_crop).enhance(1.6)
    storm_crop = ImageEnhance.Contrast(storm_crop).enhance(1.2)
    sw, sh = storm_crop.size
    scale = 4.2  # moderate upscale — visible without v1's ~16x-induced blur
    patch_w, patch_h = int(sw * scale), int(sh * scale)
    storm_patch = storm_crop.resize((patch_w, patch_h), Image.LANCZOS)

    storm_x = int(W * 0.42)  # arbitrary longitude, well clear of both edges
    storm_y = int(H * 0.22)

    alpha_v = vfeather(patch_w, patch_h, top=int(patch_h * 0.18), bottom=int(patch_h * 0.18))
    alpha_h = hfeather(patch_w, patch_h, left=int(patch_w * 0.12), right=int(patch_w * 0.12))
    intensity_raw = alpha_v * alpha_h
    intensity = np.array(make_alpha_img(intensity_raw), dtype=np.float32) / 255.0

    base_region = np.array(result.convert("RGB").crop((storm_x, storm_y, storm_x + patch_w, storm_y + patch_h)), dtype=np.float32)
    overlay = np.array(storm_patch, dtype=np.float32)
    lightened = np.maximum(base_region, overlay)
    blended = base_region * (1 - intensity[..., None]) + lightened * intensity[..., None]
    blended_img = Image.fromarray(blended.astype(np.uint8), mode="RGB").convert("RGBA")
    blended_img.putalpha(255)
    result.paste(blended_img, (storm_x, storm_y))

    # ── Sharpen the whole result ──────────────────────────────────────────
    final = result.convert("RGB")
    sharpened = final.filter(ImageFilter.UnsharpMask(radius=3, percent=140, threshold=2))

    sharpened.save(BASE, quality=93)
    print("saved", BASE)


if __name__ == "__main__":
    main()
