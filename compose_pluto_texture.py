"""
Soul Interface — Pluto texture compositor (v3, already applied)

v1 downsampled directly from NASA's raw New Horizons TIF and mirror-filled
the unmapped far side, which produced a hard black void with jagged seam
artifacts on top of a real, unfixable resolution falloff (New Horizons only
imaged a narrow high-res strip during closest approach — everything else
degrades toward the limb, and that's baked into the actual pixels, not a
processing bug). v2 switched to Askaniy's "Pluto Texture Map (25K)", a
third-party composite blending that same New Horizons data with a 2002
Hubble far-side fill and a true-color pass — a real improvement (full
coverage, no void, real color) but Ricky correctly flagged that the
different source tiers still don't *blend* into each other: there's a
sharply-detailed encounter hemisphere, a smeared lower-resolution band, and
— confirmed by inspecting the raw 25K source directly, not just our
downsampled output — genuinely flat, near-zero-detail patches at both poles
where not even Hubble resolved anything. Those tiers meet at real, abrupt
seams in the source itself.

v3 doesn't invent detail in the flat patches — there is none to recover,
in any resolution of any available source. What it does instead:
  1. Detects low-detail regions via local variance on a downsampled/blurred
     luminance map (cheap box-blur-based estimate, not a fabricated feature
     map).
  2. Blends in very low-amplitude two-octave grain (a soft coarse layer plus
     a finer layer, both smoothed) into exactly those regions, weighted by
     how flat they are — enough that a dead-flat "pasted-on" patch reads as
     plausibly soft real terrain instead of an obviously separate fill, not
     enough to simulate any specific geographic feature. This is grain, not
     fabricated craters.
  3. Because the variance mask is itself a smooth (blurred) gradient, the
     grain fades in/out gradually across the real tier boundaries instead of
     stopping at a hard edge — softening the seams Ricky pointed out without
     touching the genuinely detailed regions at all (their variance is high,
     so their blend weight is ~0).

Source: "Pluto Texture Map (25K)" by Askaniy (deviantart.com/askaniy),
24888x12444, CC BY-NC-SA 3.0 (non-commercial — fine for this project as-is,
but flag it if Soul Interface is ever monetized). Downloaded from the
artist's linked Google Drive folder (pluto25K.jpg, ~59MB) rather than the
DeviantArt page itself, which requires a login to download.

This has already been run once — textures/tex_pluto.jpg (and the
Aion/Frontend/Code copy) already reflect its output.

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

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures', 'tex_pluto.jpg')
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


def main():
    if len(sys.argv) != 2:
        print("Usage: python compose_pluto_texture.py <pluto25K.jpg>")
        sys.exit(1)
    src_path = sys.argv[1]

    src = Image.open(src_path).convert("RGB")
    result = src.resize((OUT_W, OUT_H), Image.LANCZOS)
    # percent=40 (v2) read too soft; percent=65 (Part 31) fixed that but,
    # combined with the renderer's bumpMap using this same sharpened image,
    # amplified the sharpening's fine edge contrast into a fake "quilted"
    # look once lit and shaded as height — the same class of artifact hit on
    # Uranus earlier this session. Settled at percent=50, with the rest of
    # the fake-geometry fix living in bumpScale (see renderPluto3D / index.html).
    result = result.filter(ImageFilter.UnsharpMask(radius=1.5, percent=50, threshold=3))

    arr = np.asarray(result, dtype=np.float32)
    gray = arr.mean(axis=2)

    # Local variance = E[x^2] - E[x]^2, via two Gaussian blurs. sigma=10 is
    # wide enough to judge "is this a detailed crater field or a flat fill"
    # rather than reacting to single-pixel noise.
    mean = _blur(gray, 10)
    mean_sq = _blur(gray * gray, 10)
    variance = np.clip(mean_sq - mean * mean, 0, None)

    # Normalize into a 0 (detailed) - 1 (flat) blend weight. The real
    # cratered regions have variance in the hundreds-to-thousands; the flat
    # polar/far-side fills are near 0. log1p compresses the range so the
    # falloff between "somewhat textured" and "detailed" isn't razor-thin.
    v = np.log1p(variance)
    v_lo, v_hi = np.percentile(v, 2), np.percentile(v, 45)
    flatness = np.clip(1.0 - (v - v_lo) / max(v_hi - v_lo, 1e-6), 0.0, 1.0)
    # sigma=60 (not 14) — the first pass only smoothed the *grain* mask, but
    # the actual complaint was the abrupt jump in sharpness itself where a
    # crater field cuts directly into a flat fill. A wide blur here means
    # `flatness` ramps from 0 to 1 over a real span of pixels, so the blend
    # below softens detail gradually across that span instead of stopping
    # dead at a boundary.
    flatness = _blur(flatness, 60)

    # Blend each pixel toward a locally-blurred version of itself, weighted
    # by flatness. Purely-detailed regions (flatness ~0) are untouched;
    # purely-flat regions were already smooth so this is a no-op there too;
    # the actual effect is on the ramp *between* them, where detail now
    # fades out gradually instead of cutting hard into the fill.
    softened = np.stack([_blur(arr[..., c], 12) for c in range(3)], axis=-1)
    alpha = (flatness * 0.85)[..., None]
    arr = arr * (1 - alpha) + softened * alpha

    rng = np.random.default_rng(20260720)
    fine = rng.normal(0, 1, size=gray.shape).astype(np.float32)
    fine = _blur(fine, 1.0)
    coarse_small = rng.normal(0, 1, size=(gray.shape[0] // 6, gray.shape[1] // 6)).astype(np.float32)
    coarse_small = _blur(coarse_small, 2.5)
    coarse = np.asarray(
        Image.fromarray(coarse_small, mode='F').resize((gray.shape[1], gray.shape[0]), Image.BICUBIC),
        dtype=np.float32,
    )

    # Low amplitude on purpose — this is grain/texture, not simulated
    # geography. Just enough that a dead-flat patch reads as soft real
    # terrain instead of an obviously separate pasted-in fill.
    grain = fine * 3.5 + coarse * 7.0
    arr += grain[..., None] * flatness[..., None]

    result = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    result.save(OUT, quality=93)
    print(f"saved {OUT}")


if __name__ == "__main__":
    main()
