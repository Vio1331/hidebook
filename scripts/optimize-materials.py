from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'dist/materials/baked'
for p in root.glob('*.webp'):
 im=Image.open(p).convert('RGB')
 if '-normal' not in p.name:im=im.resize((1024,1024),Image.Resampling.LANCZOS)
 im.save(p,quality=95,method=6,lossless=('-rough' in p.name or '-height' in p.name))
 print(p.name,p.stat().st_size,flush=True)
