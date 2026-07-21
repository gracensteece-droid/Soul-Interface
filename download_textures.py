"""
Soul Interface — NASA Texture Downloader
Run this script ONCE from your Soul Interface project folder.
It downloads real photographic planet textures (public domain / CC BY 4.0)
from Solar System Scope into a 'textures/' subfolder next to your index.html.

Usage:
  cd "C:\\Users\\Ricky\\OneDrive - Personal\\Desktop\\Soul Interface"
  python download_textures.py

Requirements: pip install requests
"""

import requests
import os
import sys

TEXTURES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures')

TEXTURES = {
    'tex_mercury.jpg':      'https://www.solarsystemscope.com/textures/download/2k_mercury.jpg',
    # Tried "venus_atmosphere" first (the real photographic cloud-top view —
    # what a camera actually sees, since the thick atmosphere hides the
    # ground entirely) but Ricky compared it against reference photos and it
    # read as bland — the pale, low-contrast cloud swirl doesn't match what
    # people recognize as "Venus." Switched to "venus_surface", the
    # Magellan-radar false-color terrain map: not literally camera-true, but
    # it's the iconic fiery orange image everyone actually associates with
    # the planet. "8k" for this one is a genuine 8192x4096 image (~12.5MB) —
    # same situation as Earth/Moon in Session 17, too heavy — stayed at 2k.
    'tex_venus.jpg':        'https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg',
    'tex_earth.jpg':        'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg',
    'tex_earth_clouds.jpg': 'https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg',
    'tex_earth_night.jpg':  'https://www.solarsystemscope.com/textures/download/2k_earth_nightmap.jpg',
    'tex_moon.jpg':         'https://www.solarsystemscope.com/textures/download/2k_moon.jpg',
    'tex_mars.jpg':         'https://www.solarsystemscope.com/textures/download/2k_mars.jpg',
    # Jupiter/Saturn bumped to Solar System Scope's "8k" tier — in practice
    # these two happen to only be 4096x2048 source art (4x the pixel data of
    # "2k", not a true 8k image), landing at a reasonable 1-3MB each. Earth's
    # "8k" equivalents are genuine 8192x4096 source art and would have added
    # ~34MB combined for Earth+Moon alone — not a reasonable trade for a page
    # that should load quickly, and Earth/Moon's texture wasn't what was
    # actually flagged as lacking, so those stay at 2k.
    'tex_jupiter.jpg':      'https://www.solarsystemscope.com/textures/download/8k_jupiter.jpg',
    'tex_saturn.jpg':       'https://www.solarsystemscope.com/textures/download/8k_saturn.jpg',
    'tex_saturn_ring.png':  'https://www.solarsystemscope.com/textures/download/8k_saturn_ring_alpha.png',
    'tex_uranus.jpg':       'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg',
    'tex_neptune.jpg':      'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg',
    # NOT Solar System Scope — they don't have a real Pluto texture at
    # all; their catalog entry that used to be here ("2k_eris_fictional")
    # is a DIFFERENT dwarf planet (Eris), explicitly marked fictional in
    # its own filename. Real Pluto data comes from NASA/JHU-APL/SwRI's New
    # Horizons global mosaic via USGS Astrogeology, then processed by
    # compose_pluto_texture.py (fills the real spacecraft's unmapped far
    # side by mirroring the imaged hemisphere, not by inventing anything) —
    # this downloader intentionally does NOT fetch tex_pluto.jpg, since
    # skip-if-exists would otherwise be fine but there's no direct one-shot
    # URL for the finished, composited result. See compose_pluto_texture.py
    # for the source URL and how to rebuild it from scratch.
    'tex_sun.jpg':          'https://www.solarsystemscope.com/textures/download/2k_sun.jpg',
    'tex_stars.jpg':        'https://www.solarsystemscope.com/textures/download/2k_stars_milky_way.jpg',
}

# Solar System Scope's WAF blocks requests carrying a browser-shaped
# User-Agent/Referer (403, even though a real browser tab works fine) but
# allows bare requests with no headers at all through — so send none.
HEADERS = {}

def download():
    os.makedirs(TEXTURES_DIR, exist_ok=True)
    print(f'\nDownloading to: {TEXTURES_DIR}\n')

    ok, fail = 0, 0
    for fname, url in TEXTURES.items():
        dest = os.path.join(TEXTURES_DIR, fname)
        if os.path.exists(dest) and os.path.getsize(dest) > 50000:
            print(f'  SKIP  {fname} (already exists)')
            ok += 1
            continue
        try:
            print(f'  GET   {fname} ...', end='', flush=True)
            r = requests.get(url, headers=HEADERS, timeout=30, stream=True)
            r.raise_for_status()
            with open(dest, 'wb') as f:
                for chunk in r.iter_content(65536):
                    f.write(chunk)
            size_kb = os.path.getsize(dest) // 1024
            print(f' {size_kb}KB OK')
            ok += 1
        except Exception as e:
            print(f' FAILED — {e}')
            fail += 1

    print(f'\n{"="*40}')
    print(f'Done: {ok} downloaded, {fail} failed')
    if fail == 0:
        print('\nAll textures ready. Open index.html in your browser.')
    else:
        print('\nSome failed. Check your internet connection and try again.')
        print('The HTML will use procedural fallbacks for any missing textures.')

if __name__ == '__main__':
    try:
        import requests
    except ImportError:
        print('Installing requests...')
        os.system(f'{sys.executable} -m pip install requests')
        import requests
    download()