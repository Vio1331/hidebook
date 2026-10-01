from pathlib import Path
import sys
from PIL import Image
root=Path(__file__).resolve().parents[1]/'dist/materials/baked'
for p in root.glob('*.webp'):
 if len(sys.argv)>1 and p.name.split('-')[0] not in sys.argv[1:]:continue
 im=Image.open(p);im=im.convert('RGBA' if '-rough' in p.name and im.mode=='RGBA' else 'RGB')
 if '-normal' not in p.name:im=im.resize((1024,1024),Image.Resampling.LANCZOS)
 im.save(p,quality=95,method=6,lossless=('-rough' in p.name or '-height' in p.name))
 print(p.name,p.stat().st_size,flush=True)
