"""Lossless data maps and high-quality color maps for WebGL. Requires Pillow."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'dist/materials/baked'
for path in root.glob('*.png'):
    im=Image.open(path).convert('RGB')
    if any(x in path.stem for x in ['-height','-rough']): im=im.resize((512,512),Image.Resampling.LANCZOS)
    im.save(path.with_suffix('.webp'),lossless='-base' not in path.stem,quality=95,method=6)
    path.unlink()
