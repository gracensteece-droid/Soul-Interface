"""
Soul Interface — Uranus texture compositor (one-time, already applied)

Builds Uranus's texture from a REAL NASA/ESA/CSA JWST NIRCam photo instead
of procedural invention — Ricky tried a stylized painted version first
(bands + a swirl, in a made-up palette, then rebuilt on the real Solar
System Scope color gradient), but said it still didn't look meaningfully
different, and separately noted the plain Voyager-derived texture "looks
so bland, no texture." The real fix wasn't the palette or the exaggeration
— it's that Voyager's 1986 flyby data is genuinely almost featureless, so
no amount of enhancing it reveals real detail that isn't there (confirmed
numerically: the residual variation after removing the smooth gradient
has a standard deviation of ~0.35 out of 255 — just JPEG noise).

JWST's 2023 images are a different, much higher-fidelity source with
genuine real detail: a bright polar cap, subtle darker cloud structure, a
couple of real bright features. The key fact that makes this usable as a
texture at all: Uranus's ~98° axial tilt means its pole points almost
directly at Earth/JWST much of the time, so this photo is essentially a
pole-on disk view — the same situation as the Cassini hexagon photo used
for Saturn's pole (compose_saturn_texture.py). Extracts a verified-clean
crop of that disk and mirror-tiles it onto the north pole of the
equirectangular texture, extending further down-latitude than Saturn's
equivalent band so the real detail is actually visible in the default
(non-orbited) camera view, not just when looking directly at the pole.

Source: NASA/ESA/CSA JWST NIRCam image of Uranus, released April 2023.
https://science.nasa.gov/asset/webb/uranus-nircam-image/
(the "Unannotated, Full Res" PNG on that page)

This has already been run once — textures/tex_uranus.jpg (and the
Aion/Frontend/Code copy) already reflect its output. Verified wrapped on
the actual 3D sphere with lighting/bump mapping before finalizing — same
lesson as every other real-photo composite this project has done, the
flat texture preview alone is misleading.

Usage (if re-doing this from scratch):
  pip install pillow numpy
  Download the JWST NIRCam Uranus PNG from the NASA page above.
  Get a clean (never-enhanced) copy of textures/tex_uranus.jpg — re-run
  download_textures.py after temporarily removing the current file if
  needed, since the existing one already has this composite applied.
  python compose_uranus_texture.py <clean_uranus.jpg> <jwst_uranus.png>

If picking a different source photo, find the planet disk's center/radius
first, then verify any crop box is entirely inside the circle with
box.mean(axis=2).min() before using it — wandering into black background
outside the disk was the real bug both this and Saturn's composite hit on
the first attempt.
"""
import sys
import os
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures', 'tex_uranus.jpg')
W, H = 2048, 1024

# Disk center/radius measured directly from the specific JWST image linked
# above (1268x1268 source). Re-measure these for a different source image.
DISK_CX, DISK_CY = 647, 645


def vfeather(w, h, top, bottom):
    import numpy as np
    a = np.ones((h, w), dtype=np.float32)
    for y in range(h):
        v = 1.0
        if y < top: v = y / max(top, 1)
        elif y > h - bottom: v = (h - y) / max(bottom, 1)
        a[y, :] = max(0.0, min(1.0, v))
    return a


def make_alpha_img(arr):
    img = Image.fromarray((arr * 255).astype('uint8'), mode="L")
    return img.filter(ImageFilter.GaussianBlur(6))


def main():
    if len(sys.argv) != 3:
        print("Usage: python compose_uranus_texture.py <clean_uranus.jpg> <jwst_uranus.png>")
        sys.exit(1)
    clean_path, jwst_path = sys.argv[1], sys.argv[2]

    # Crop verified (via box.mean(axis=2).min() > 0, no black background)
    # to stay entirely inside the disk's circle.
    jwst = Image.open(jwst_path).convert("RGB")
    disk_crop = jwst.crop((DISK_CX - 170, DISK_CY - 190, DISK_CX + 170, DISK_CY + 150))

    base = Image.open(clean_path).convert("RGB").resize((W, H), Image.BICUBIC)
    result = base.convert("RGBA")

    N_TILES = 2
    tile_w = W // N_TILES
    pole_band_h = int(H * 0.48)  # extends well past the pole so real detail shows in the default camera view

    tile = disk_crop.resize((tile_w, pole_band_h), Image.LANCZOS)
    tile_mirror = tile.transpose(Image.FLIP_LEFT_RIGHT)

    pole_strip = Image.new("RGB", (W, pole_band_h))
    for i in range(N_TILES):
        t = tile if i % 2 == 0 else tile_mirror
        pole_strip.paste(t, (i * tile_w, 0))

    alpha = vfeather(W, pole_band_h, top=0, bottom=int(pole_band_h * 0.55))
    pole_rgba = pole_strip.convert("RGBA")
    pole_rgba.putalpha(make_alpha_img(alpha))
    result.alpha_composite(pole_rgba, dest=(0, 0))

    final = result.convert("RGB").filter(ImageFilter.GaussianBlur(1.0))
    final.save(OUT, quality=93)
    print("saved", OUT)


if __name__ == "__main__":
    main()
