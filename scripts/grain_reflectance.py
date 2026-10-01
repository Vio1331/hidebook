"""Pack roughness (RGB) and peak/valley specular strength (alpha) in one atlas."""
from pathlib import Path
import sys
import numpy as np
from PIL import Image

PROFILES = {
    'epsom': (.65, .30, 1.0),
    'mysore': (.52, .30, 1.0),
    'evercolor': (.62, .24, 1.0),
    'togo': (.79, .28, .82),
    'swift': (.90, .58, .90),
}

def reflectance(relief, peak_roughness=.65, valley_strength=.30, peak_strength=1.0):
    lo, hi = np.percentile(relief, [10, 90])
    peak = np.clip((relief - lo) / max(.01, hi - lo), 0, 1)
    roughness = (.97 - (.97 - peak_roughness) * peak) * 255
    strength = (valley_strength + (peak_strength - valley_strength) * peak) * 255
    return np.uint8(np.clip(np.stack([roughness, roughness, roughness, strength], axis=-1), 0, 255))

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1] / 'dist/materials/baked'
    for name in sys.argv[1:] or list(PROFILES):
        height = np.asarray(Image.open(root / f'{name}-height.webp').convert('L'), dtype=np.float32) / 255
        image = Image.fromarray(reflectance(height, *PROFILES[name]), 'RGBA')
        image.save(root / f'{name}-rough.webp', lossless=True, quality=95, method=6)
        print(name, 'peak/valley reflectance', image.size, flush=True)
