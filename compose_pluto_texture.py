"""
Soul Interface — Pluto texture compositor (v2, already applied)

Replaces the v1 approach (see git history), which downsampled directly from
NASA/JHU-APL/SwRI's raw New Horizons global mosaic TIF and filled the
unmapped far side with a per-pixel mirror algorithm. That produced a hard
black void with jagged mirror-seam artifacts, and — the part that wasn't
caught until Ricky zoomed in and it still looked "melted" after fixing
resolution, caching, AND anisotropic filtering — genuine directional
smearing in the approach-imaging band that has nothing to do with any of
those three things. That smear is real: New Horizons only captured its
highest-resolution LORRI strip along a narrow "bowtie" during closest
approach; the rest of the encounter hemisphere was imaged from much farther
out (progressively lower resolution toward the limb), and the raw mosaic
reprojects that directly — the smear is what's actually in the source pixels,
not a rendering bug or a processing bug in v1's script.

v2 doesn't try to out-fix physics. It switches to a full-sphere composite
that a third party has already carefully blended from multiple real sources
(the same New Horizons LORRI/MVIC mosaic for the sharp hemisphere, plus a
2002 Hubble map to fill the region New Horizons never imaged at all, plus a
color pass from "The True Colors of Pluto and Charon"). It still has the
same real falloff from sharp to soft — that's unavoidable, it's the actual
state of Pluto imaging data as of this writing — but the falloff is smooth
and gradient-like rather than a hard black wedge with mirror-seam artifacts,
and it's already true natural color, so the renderer no longer needs the
warm-tan multiply tint that v1 used to make a grayscale mosaic look right
(see the removed `plutoMat.color` tint in renderPluto3D and the removed
canvas multiply-blend in index.html's Pluto hot-swap block).

Source: "Pluto Texture Map (25K)" by Askaniy (deviantart.com/askaniy),
24888x12444, CC BY-NC-SA 3.0 (non-commercial — fine for this project as-is,
but flag it if Soul Interface is ever monetized). Downloaded from the
artist's linked Google Drive folder (pluto25K.jpg, ~59MB) rather than the
DeviantArt page itself, which requires a login to download.

This has already been run once — textures/tex_pluto.jpg (and the
Aion/Frontend/Code copy) already reflect its output.

Usage (if re-doing this from scratch):
  pip install pillow
  Get pluto25K.jpg from Askaniy's Google Drive folder (linked in the
  DeviantArt page's December 2020 update) — not the .png versions, they're
  10x the size for no visible quality gain at our output resolution.
  python compose_pluto_texture.py <pluto25K.jpg>
"""
import sys
import os
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None  # source is ~310M pixels, above PIL's default decompression-bomb guard

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures', 'tex_pluto.jpg')
OUT_W, OUT_H = 4096, 2048  # matches Jupiter/Saturn's resolution tier


def main():
    if len(sys.argv) != 2:
        print("Usage: python compose_pluto_texture.py <pluto25K.jpg>")
        sys.exit(1)
    src_path = sys.argv[1]

    src = Image.open(src_path).convert("RGB")
    result = src.resize((OUT_W, OUT_H), Image.LANCZOS)
    # Ricky flagged the first pass (percent=40) as still too soft — bumped to
    # a stronger but still real photo-sharpening tier (matches typical
    # unsharp-mask presets; not aggressive enough to fabricate ringing on
    # real detail). This can't recover detail the low-res far-side band
    # never had, but it does make the well-imaged encounter hemisphere
    # noticeably crisper, which was worth more sharpening headroom.
    result = result.filter(ImageFilter.UnsharpMask(radius=2, percent=65, threshold=2))
    result.save(OUT, quality=93)
    print(f"saved {OUT}")


if __name__ == "__main__":
    main()
