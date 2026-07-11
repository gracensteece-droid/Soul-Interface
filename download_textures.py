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
    'tex_venus.jpg':        'https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg',
    'tex_earth.jpg':        'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg',
    'tex_earth_clouds.jpg': 'https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg',
    'tex_earth_night.jpg':  'https://www.solarsystemscope.com/textures/download/2k_earth_nightmap.jpg',
    'tex_moon.jpg':         'https://www.solarsystemscope.com/textures/download/2k_moon.jpg',
    'tex_mars.jpg':         'https://www.solarsystemscope.com/textures/download/2k_mars.jpg',
    'tex_jupiter.jpg':      'https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg',
    'tex_saturn.jpg':       'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg',
    'tex_saturn_ring.png':  'https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png',
    'tex_uranus.jpg':       'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg',
    'tex_neptune.jpg':      'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg',
    'tex_pluto.jpg':        'https://www.solarsystemscope.com/textures/download/2k_eris_fictional.jpg',
    'tex_sun.jpg':          'https://www.solarsystemscope.com/textures/download/2k_sun.jpg',
    'tex_stars.jpg':        'https://www.solarsystemscope.com/textures/download/2k_stars_milky_way.jpg',
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.solarsystemscope.com/textures/',
}

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
            print(f' {size_kb}KB ✓')
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