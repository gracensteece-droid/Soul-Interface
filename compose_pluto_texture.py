"""
Soul Interface — Pluto texture compositor (v4, already applied)

v1 downsampled directly from NASA's raw New Horizons TIF and mirror-filled
the unmapped far side, which produced a hard black void with jagged seam
artifacts on top of a real, unfixable resolution falloff (New Horizons only
imaged a narrow high-res strip during closest approach — everything else
degrades toward the limb, and that's baked into the actual pixels, not a
processing bug). v2 switched to Askaniy's "Pluto Texture Map (25K)", a
third-party composite blending that same New Horizons data with a 2002
Hubble far-side fill and a true-color pass. v3 added per-pixel detail-tier
blending across the real crisp/soft seams, plus low-amplitude grain in the
flat patches so they didn't read as an obviously pasted-in fill.

v3's real, repeated mistake: `renderPluto3D` and index.html both point
`.map` AND `.bumpMap` at the SAME output file. Every cosmetic, color-only
addition made to that one file — sharpening, grain, anything with any
high-frequency content — also becomes fake physical geometry once the
bump map reads it as height. This bit three separate times under three
different specific appearances, each one initially looking like a
different bug:
  - Part 32: sharpening's edge contrast read as a "quilted" look
  - Part 34: a downsampled-then-BICUBIC-upsampled grain layer's faint
    resampling-grid edges read as a hard rectangular artifact
  - Part 37 (this one): v3's two-octave grain, uniform enough in
    frequency, read as a regular "orange peel"/drywall-knockdown pattern
    once lit and shaded as height — Ricky's exact, correct description.

Each time, the fix was another round of tuning sharpening/bumpScale/grain
parameters against the shared file — which only ever reduces the symptom,
because the actual cause (one file serving two incompatible jobs) was
never addressed. v4 fixes the real thing: outputs TWO files instead of
one. `tex_pluto.jpg` (the color map) keeps the full treatment — sharpening,
seam-blending, grain. `tex_pluto_bump.jpg` (the bump map) gets ONLY the
seam-blending — no sharpening, no grain — so nothing added purely for
color/cosmetic reasons can ever be misread as height again, regardless of
how future tuning on the color side changes. `renderPluto3D` (planet.html)
and index.html's Pluto block both updated to point `.bumpMap` at the new
file instead of reusing `.map`'s texture object.

Source: "Pluto Texture Map (25K)" by Askaniy (deviantart.com/askaniy),
24888x12444, CC BY-NC-SA 3.0 (non-commercial — fine for this project as-is,
but flag it if Soul Interface is ever monetized). Downloaded from the
artist's linked Google Drive folder (pluto25K.jpg, ~59MB) rather than the
DeviantArt page itself, which requires a login to download.

This has already been run once — textures/tex_pluto.jpg and
textures/tex_pluto_bump.jpg (and the Aion/Frontend/Code copies) already
reflect its output.

Usage (if re-doing this from scratch):
  pip install pillow numpy
  Get pluto25K.jpg from Askaniy's Google Drive folder (linked in the
  DeviantArt page's December 2020 update) — not the .png versions, they're
  10x the size for no visible quality gain at our output resolution.
  python compose_pluto_texture.py <pluto25K.jpg>
"""
import sys
import os
import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None  # source is ~310M pixels, above PIL's default decompression-bomb guard

TEX_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures')
OUT_COLOR = os.path.join(TEX_DIR, 'tex_pluto.jpg')
OUT_BUMP = os.path.join(TEX_DIR, 'tex_pluto_bump.jpg')
OUT_W, OUT_H = 4096, 2048  # matches Jupiter/Saturn's resolution tier


def _box_blur_1d(arr, radius, axis):
    """Cumsum-based box blur along one axis — works on arbitrary float32 ranges (PIL's 'F' mode GaussianBlur doesn't, at least on this Pillow build)."""
    r = max(int(radius), 1)
    pad = [(0, 0)] * arr.ndim
    pad[axis] = (r, r)
    padded = np.pad(arr, pad, mode='edge')
    cs = np.cumsum(padded, axis=axis, dtype=np.float64)
    cs = np.insert(cs, 0, 0, axis=axis)
    n = arr.shape[axis]
    idx_hi = np.arange(2 * r + 1, 2 * r + 1 + n)
    idx_lo = np.arange(0, n)
    hi = np.take(cs, idx_hi, axis=axis)
    lo = np.take(cs, idx_lo, axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def _blur(arr_f32, radius):
    """Approximate Gaussian blur via three passes of box blur (a standard, cheap approximation)."""
    out = arr_f32
    for _ in range(3):
        out = _box_blur_1d(out, radius, axis=0)
        out = _box_blur_1d(out, radius, axis=1)
    return out


def _compute_flatness(arr):
    """0 (detailed) - 1 (flat) blend weight from local luminance variance, blurred wide so it ramps smoothly rather than cutting at a hard boundary."""
    gray = arr.mean(axis=2)
    mean = _blur(gray, 10)
    mean_sq = _blur(gray * gray, 10)
    variance = np.clip(mean_sq - mean * mean, 0, None)
    v = np.log1p(variance)
    v_lo, v_hi = np.percentile(v, 2), np.percentile(v, 45)
    flatness = np.clip(1.0 - (v - v_lo) / max(v_hi - v_lo, 1e-6), 0.0, 1.0)
    return _blur(flatness, 60)


def _blend_seams(arr, flatness):
    """Blend each pixel toward a locally-blurred version of itself, weighted by flatness — softens the real crisp/soft tier boundaries without touching detailed regions (flatness ~0 there)."""
    softened = np.stack([_blur(arr[..., c], 12) for c in range(3)], axis=-1)
    alpha = (flatness * 0.85)[..., None]
    return arr * (1 - alpha) + softened * alpha


def main():
    if len(sys.argv) != 2:
        print("Usage: python compose_pluto_texture.py <pluto25K.jpg>")
        sys.exit(1)
    src_path = sys.argv[1]

    src = Image.open(src_path).convert("RGB")
    resized = src.resize((OUT_W, OUT_H), Image.LANCZOS)
    base = np.asarray(resized, dtype=np.float32)
    flatness = _compute_flatness(base)
    blended = _blend_seams(base, flatness)

    # ── Bump map: seam-blending ONLY. No sharpening, no grain — anything
    # added here purely for color/cosmetic reasons becomes fake physical
    # relief once read as height (see the module docstring; this is the
    # actual fix for Parts 32/34/37, not another parameter tweak).
    bump_img = Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8))
    bump_img.save(OUT_BUMP, quality=93)
    print(f"saved {OUT_BUMP}")

    # ── Color map: full treatment — sharpen, then grain in the flat regions
    # so they read as soft real terrain rather than an obviously pasted-in
    # fill. Both are purely cosmetic now that they never touch the bump map.
    sharpened = Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8))
    sharpened = sharpened.filter(ImageFilter.UnsharpMask(radius=1.5, percent=50, threshold=3))
    color = np.asarray(sharpened, dtype=np.float32)

    rng = np.random.default_rng(20260720)
    fine = _blur(rng.normal(0, 1, size=(OUT_H, OUT_W)).astype(np.float32), 1.0)
    coarse = _blur(rng.normal(0, 1, size=(OUT_H, OUT_W)).astype(np.float32), 18)
    grain = fine * 3.5 + coarse * 7.0
    color += grain[..., None] * flatness[..., None]

    color_img = Image.fromarray(np.clip(color, 0, 255).astype(np.uint8))
    color_img.save(OUT_COLOR, quality=93)
    print(f"saved {OUT_COLOR}")


if __name__ == "__main__":
    main()
