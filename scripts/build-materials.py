"""Calibrated photo-grain reconstruction; 4096px / 160mm, clamped full-panel atlases.
Reproduce: python scripts/build-materials.py. Pillow, NumPy and SciPy required.
"""
from pathlib import Path
import json, sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
ROOT=Path(__file__).resolve().parents[1]/'dist/materials'
SIZE=4096;SPAN=160;PX=SIZE/SPAN
# Pixels refer to the supplied 2000px product photos. Product short side, not canvas.
SOURCES={
 'togo':dict(file='Togo-ulysse-22x17.webp',crop=[520,330,1400,1670],product_px=1254,product_mm=170,depth=.125),
 'epsom':dict(file='Epsom-mc²-euclide-10.5x7.5.jpg',crop=[650,470,1320,1400],product_px=900,product_mm=75,depth=.11),
 'evercolor':dict(file='Evercolor-h-sellier-11x9.2.webp',crop=[520,580,1450,1320],product_px=1180,product_mm=110,depth=.075),
 'mysore':dict(file='Mysore-calvi-duo-10.5x7(2).webp',crop=[490,300,1490,1680],product_px=1150,product_mm=70,depth=.10),
 'swift':dict(file='Swift-magsafe-9.6x6.6(3).jpg',crop=[780,550,1140,1080],product_px=880,product_mm=66,depth=.010),
}
def cut(e):
 h,w=e.shape;c=e.copy();paths=np.empty((h,w),np.int16)
 for y in range(1,h):
  prev=c[y-1];three=np.stack([np.r_[np.inf,prev[:-1]],prev,np.r_[prev[1:],np.inf]])
  d=np.argmin(three,axis=0)-1;paths[y]=np.arange(w)+d;c[y]+=three[d+1,np.arange(w)]
 x=np.argmin(c[-1]);result=np.zeros(h,np.int16)
 for y in range(h-1,-1,-1):result[y]=x;x=paths[y,x] if y else 0
 return result

def quilt(src,rng):
 h,w=src.shape;patch=min(600,int(min(h,w)*.66));overlap=patch//4;step=patch-overlap
 out=np.zeros((SIZE,SIZE),np.float32)
 for oy in range(0,SIZE,step):
  for ox in range(0,SIZE,step):
   ph=min(patch,SIZE-oy);pw=min(patch,SIZE-ox);best=None;best_error=np.inf
   for _ in range(36):
    sy=int(rng.integers(0,h-patch+1));sx=int(rng.integers(0,w-patch+1));p=src[sy:sy+ph,sx:sx+pw];err=0
    if ox:err+=np.mean((out[oy:oy+ph:5,ox:ox+min(overlap,pw):5]-p[::5,:min(overlap,pw):5])**2)
    if oy:err+=np.mean((out[oy:oy+min(overlap,ph):5,ox:ox+pw:5]-p[:min(overlap,ph):5,::5])**2)
    if err<best_error:best_error=err;best=p.copy()
   old=out[oy:oy+ph,ox:ox+pw];weight=np.ones((ph,pw),np.float32)
   if ox:
    ov=min(overlap,pw);seam=cut((old[:,:ov]-best[:,:ov])**2)
    weight[:,:ov]=np.clip((np.arange(ov)[None,:]-seam[:,None]+2)/4,0,1)
   if oy:
    ov=min(overlap,ph);seam=cut(((old[:ov]-best[:ov])**2).T)
    weight[:ov]=np.minimum(weight[:ov],np.clip((np.arange(ov)[:,None]-seam[None,:]+2)/4,0,1))
   old[:]=old*(1-weight)+best*weight
 return out

def save(arr,file,lossless=True):
 Image.fromarray(np.uint8(np.clip(arr,0,255))).save(ROOT/'baked'/file,format='WEBP',lossless=lossless,quality=95,method=6)
for k,(name,s) in enumerate(SOURCES.items()):
 if len(sys.argv)>1 and name not in sys.argv[1:]:continue
 image=Image.open(ROOT/s['file']).convert('RGB');crop=image.crop(s['crop']);crop.save(ROOT/'baked'/f'{name}-sample.jpg',quality=93)
 mm_per_pixel=s['product_mm']/s['product_px'];scale=mm_per_pixel*PX
 crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
 luma=np.asarray(crop,dtype=np.float32)@np.array([.2126,.7152,.0722],np.float32)/255
 log=np.log(np.maximum(luma,.015));detail=log-gaussian_filter(log,PX*1.7)
 # Remove exposure/shading while keeping the supplied grain's size and orientation.
 if name=='evercolor':
  local=np.sqrt(gaussian_filter(detail*detail,PX*.8));detail=detail/np.maximum(local,float(np.median(local))*.6)
 else:detail=detail/max(.006,float(detail.std()))
 detail=np.clip(detail,-2.5,2.5)
 atlas=quilt(detail,np.random.default_rng(9145+k*71))
 atlas=atlas-gaussian_filter(atlas,PX*1.2)
 if name=='evercolor':atlas/=np.maximum(np.sqrt(gaussian_filter(atlas*atlas,PX*1.2)),.5)
 # Shallow rounded grain plateaus, dark valleys. No photo highlights in base color.
 relief=1-np.logaddexp(0,-1.6*(atlas+.3))/5
 relief=gaussian_filter(relief,.75)
 if name=='swift':relief=gaussian_filter(relief,1.3)
 gy,gx=np.gradient(relief*s['depth'],SPAN/SIZE)
 norm=np.sqrt(gx*gx+gy*gy+1)
 normal=np.stack([(1-gx/norm)*127.5,(1+gy/norm)*127.5,(1+1/norm)*127.5],axis=-1)
 valley=np.clip(1-relief,0,1)
 tone=np.clip(.987-(.10 if name=='epsom' else .042)*valley,.87 if name=='epsom' else .92,1)*255
 rough=np.clip(.86+.12*valley,0,1)*255
 save(normal,f'{name}-normal.webp');save(tone,f'{name}-base.webp',False)
 save(rough,f'{name}-rough.webp');save(np.clip(relief,0,1)*255,f'{name}-height.webp')
 print(name,'4096 px / 160 mm complete',flush=True)
(ROOT/'scale-calibration.json').write_text(json.dumps(dict(atlasMM=SPAN,atlasPixels=SIZE,sources=SOURCES,method='Measured product pixel width / filename dimensions in mm; log-luminance shading removal, minimum-error photo quilting, physically scaled relief normals; clamp, never tile.'),ensure_ascii=False,indent=2))
