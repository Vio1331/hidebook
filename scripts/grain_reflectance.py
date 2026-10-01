"""Pack roughness (RGB) and peak/valley specular strength (alpha) in one atlas."""
from pathlib import Path
import sys
import numpy as np
from PIL import Image

def reflectance(relief, peak_roughness=.65):
    lo, hi = np.percentile(relief, [10, 90])
    peak = np.clip((relief - lo) / max(.01, hi - lo), 0, 1)
    roughness = (.97 - (.97 - peak_roughness) * peak) * 255
    strength = (.30 + .70 * peak) * 255
    return np.uint8(np.clip(np.stack([roughness, roughness, roughness, strength], axis=-1), 0, 255))

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1] / 'dist/materials/baked'
    for name in sys.argv[1:] or ['epsom', 'evercolor', 'mysore']:
        height = np.asarray(Image.open(root / f'{name}-height.webp').convert('L'), dtype=np.float32) / 255
        image = Image.fromarray(reflectance(height, .52 if name == 'mysore' else .65), 'RGBA')
        image.save(root / f'{name}-rough.webp', lossless=True, quality=95, method=6)
        print(name, 'peak/valley reflectance', image.size, flush=True)
