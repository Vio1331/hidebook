"""Neutral black samples: same exposure and no photographic edge shadows."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
root=Path(__file__).resolve().parents[1]/'dist/materials'
sources=json.loads((root/'scale-calibration.json').read_text())['sources']
for name,s in sources.items():
 im=Image.open(root/s['file']).convert('L').crop(s['crop'])
 v=np.asarray(im,dtype=np.float32)/255
 log=np.log(np.maximum(v,.015));detail=log-gaussian_filter(log,25)
 std=np.sqrt(gaussian_filter(detail*detail,35));detail/=np.maximum(std,np.median(std)*.6)
 # Match black appearance, while preserving each leather's measured grain.
 strength=3 if name=='swift' else 16
 sample=np.uint8(np.clip(48+detail*strength,12,112))
 Image.fromarray(sample).convert('RGB').save(root/'baked'/f'{name}-sample.jpg',quality=94)
 print(name,'neutral black sample')
