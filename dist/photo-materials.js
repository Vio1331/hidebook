// Image-derived material experiment. Only the grain comes from the photographs;
// normals and roughness are estimates, never represented as measured scan maps.
export const photoSources = {
 "togo": {
  "samplePixels": 768,
  "file": "./materials/togo-source.jpg",
  "crop": [
   0.01875,
   0.35625,
   0.29375,
   0.24375
  ],
  "contrast": 0.048,
  "grainDepthMM": 0.160,
  "label": "Hermès · Togo 官方皮面特写",
  "url": "https://www.hermes.com/uk/en/product/sac-a-depeches-29-messenger-bag-H082688CK18/"
 },
 "epsom": {
  "samplePixels": 900,
  "file": "./materials/epsom-source.jpg",
  "crop": [
   0.1875,
   0.7875,
   0.375,
   0.20625
  ],
  "contrast": 0.043,
  "grainDepthMM": 0.105,
  "label": "Hermès · Epsom 官方皮面特写",
  "url": "https://www.hermes.com/us/en/product/sac-a-depeches-24-pouch-H086415CK18/"
 },
 "swift": {
  "samplePixels": 384,
  "file": "./materials/swift-source.jpg",
  "crop": [
   0.55,
   0.29375,
   0.2,
   0.33125
  ],
  "contrast": 0.026,
  "grainDepthMM": 0.020,
  "label": "Hermès · Swift 官方皮面特写",
  "url": "https://www.hermes.com/ca/en/product/glenan-compact-wallet-H086439CC37/"
 },
 "evercolor": {
  "samplePixels": 768,
  "file": "./materials/evercolor-source.jpg",
  "crop": [
   0.025,
   0.3125,
   0.4125,
   0.40625
  ],
  "contrast": 0.035,
  "grainDepthMM": 0.090,
  "label": "Hermès · Evercolor 官方皮面特写",
  "url": "https://www.hermes.cn/cn/en/product/faubourg-express-bag-H086337CC37/"
 },
 "mysore": {
  "samplePixels": 900,
  "file": "./materials/mysore-source.jpg",
  "crop": [
   0.4625,
   0.08125,
   0.3625,
   0.14375
  ],
  "contrast": 0.045,
  "grainDepthMM": 0.120,
  "label": "Hermès · Mysore 官方皮面特写",
  "url": "https://www.hermes.com/us/en/product/hermes-geta-bag-H083052CKBO/"
 }
};
function boxBlur(src,n,r){
 const h=src.length/n;
 const horizontal=new Float32Array(src.length),out=new Float32Array(src.length),window=r*2+1;
 for(let y=0;y<h;y++){let sum=0;for(let k=-r;k<=r;k++)sum+=src[y*n+Math.max(0,Math.min(n-1,k))];for(let x=0;x<n;x++){horizontal[y*n+x]=sum/window;sum+=src[y*n+Math.min(n-1,x+r+1)]-src[y*n+Math.max(0,x-r)]}}
 for(let x=0;x<n;x++){let sum=0;for(let k=-r;k<=r;k++)sum+=horizontal[Math.max(0,Math.min(h-1,k))*n+x];for(let y=0;y<h;y++){out[y*n+x]=sum/window;sum+=horizontal[Math.min(h-1,y+r+1)*n+x]-horizontal[Math.max(0,y-r)*n+x]}}
 return out;
}
// Minimum-error cuts quilt real grain into a non-periodic, full-panel atlas.
// The atlas is sampled once, never wrapped at UV integer boundaries.
function quilt(src,n,size=2048){
 const hsrc=src.length/n,out=new Float32Array(size*size),patch=Math.min(224,Math.floor(Math.min(n,hsrc)*.7)),overlap=Math.floor(patch*.24),step=patch-overlap;
 let seed=7823;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 function cut(errors,w,h){const cost=new Float32Array(errors),from=new Int16Array(w*h);for(let y=1;y<h;y++)for(let x=0;x<w;x++){let best=x;for(let k=Math.max(0,x-1);k<=Math.min(w-1,x+1);k++)if(cost[(y-1)*w+k]<cost[(y-1)*w+best])best=k;cost[y*w+x]+=cost[(y-1)*w+best];from[y*w+x]=best}let x=0;for(let k=1;k<w;k++)if(cost[(h-1)*w+k]<cost[(h-1)*w+x])x=k;const path=new Int16Array(h);for(let y=h-1;y>=0;y--){path[y]=x;x=from[y*w+x]}return path}
 for(let oy=0;oy<size-overlap;oy+=step)for(let ox=0;ox<size-overlap;ox+=step){
  const w=Math.min(patch,size-ox),h=Math.min(patch,size-oy);let sx=0,sy=0,best=Infinity;
  for(let trial=0;trial<24;trial++){const tx=Math.floor(random()*(n-patch)),ty=Math.floor(random()*(hsrc-patch));let err=0;
   if(ox)for(let y=0;y<h;y+=4)for(let x=0;x<overlap;x+=4)err+=(out[(oy+y)*size+ox+x]-src[(ty+y)*n+tx+x])**2;
   if(oy)for(let y=0;y<overlap;y+=4)for(let x=0;x<w;x+=4)err+=(out[(oy+y)*size+ox+x]-src[(ty+y)*n+tx+x])**2;
   if(err<best){best=err;sx=tx;sy=ty}
  }
  let left,top;
  if(ox){const e=new Float32Array(overlap*h);for(let y=0;y<h;y++)for(let x=0;x<overlap;x++)e[y*overlap+x]=(out[(oy+y)*size+ox+x]-src[(sy+y)*n+sx+x])**2;left=cut(e,overlap,h)}
  if(oy){const e=new Float32Array(overlap*w);for(let x=0;x<w;x++)for(let y=0;y<overlap;y++)e[x*overlap+y]=(out[(oy+y)*size+ox+x]-src[(sy+y)*n+sx+x])**2;top=cut(e,overlap,w)}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let weight=1;if(left&&x<overlap)weight=Math.min(weight,Math.max(0,Math.min(1,(x-left[y]+2)/4)));if(top&&y<overlap)weight=Math.min(weight,Math.max(0,Math.min(1,(y-top[x]+2)/4)));const i=(oy+y)*size+ox+x;out[i]=out[i]*(1-weight)+src[(sy+y)*n+sx+x]*weight}
 }return out;
}
export function derivePhotoMaps(image,spec,createCanvas){
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,[x,y,w,h]=spec.crop;
 const sourceSize=spec.samplePixels||768,sourceHeight=Math.round(sourceSize*(h*ih)/(w*iw)),canvas=createCanvas(sourceSize,sourceHeight),ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.imageSmoothingQuality='high';ctx.drawImage(image,x*iw,y*ih,w*iw,h*ih,0,0,sourceSize,sourceHeight);
 const original=ctx.getImageData(0,0,sourceSize,sourceHeight),luma=new Float32Array(sourceSize*sourceHeight);
 for(let i=0;i<luma.length;i++)luma[i]=(.2126*original.data[i*4]+.7152*original.data[i*4+1]+.0722*original.data[i*4+2])/255;
 const illumination=boxBlur(boxBlur(luma,sourceSize,14),sourceSize,14),sourceDetail=new Float32Array(luma.length);
 let detail=sourceDetail;
 let sum=0,squared=0;
 for(let i=0;i<luma.length;i++){detail[i]=Math.log(Math.max(.01,luma[i])/Math.max(.01,illumination[i]));sum+=detail[i];squared+=detail[i]**2}
 const mean=sum/detail.length,std=Math.sqrt(Math.max(.00001,squared/detail.length-mean*mean));
 for(let i=0;i<detail.length;i++)detail[i]=Math.max(-2.3,Math.min(2.3,(detail[i]-mean)/std));
 const size=2048;detail=quilt(sourceDetail,sourceSize,size);
 // A photographed highlight is not a raised grain. Reconstruct shallow dark
 // valleys with softly rounded plateaus; suppress the bright-side photo lobes.
 // This remains a photograph-derived estimate, not measured surface depth.
 const relief=new Float32Array(detail.length);
 for(let i=0;i<detail.length;i++)relief[i]=1-Math.log1p(Math.exp(-2*(detail[i]+.35)))/4.8;
 const surface=boxBlur(relief,size,1);
 // Atlas spans 4.8 world units; MM=3.5/110. Derive both normal channels
 // from the same physical height scale, not an arbitrary contrast multiplier.
 const heightScale=spec.grainDepthMM*(3.5/110),texel=4.8/size;
 const base=createCanvas(size,size),normal=createCanvas(size,size),rough=createCanvas(size,size),height=createCanvas(size,size);
 const bc=base.getContext('2d'),nc=normal.getContext('2d'),rc=rough.getContext('2d'),hc=height.getContext('2d');
 const bi=bc.createImageData(size,size),ni=nc.createImageData(size,size),ri=rc.createImageData(size,size),hi=hc.createImageData(size,size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const p=y*size+x,i=p*4,d=detail[p];
  // Retain only subtle pigment variation. Photo brightness is not albedo or depth.
  // Keep only restrained cavity occlusion; photographed highlights must not
  // remain painted onto the leather when the studio lights move.
  const valley=Math.max(0,1-surface[p]);
  const tone=Math.max(.9,.98-valley*.055+Math.max(-.5,Math.min(.5,d))*.008);
  const dx=(surface[y*size+Math.min(size-1,x+1)]-surface[y*size+Math.max(0,x-1)])*heightScale/(2*texel);
  const dy=(surface[Math.min(size-1,y+1)*size+x]-surface[Math.max(0,y-1)*size+x])*heightScale/(2*texel);
  const length=Math.hypot(dx,dy,1);
  bi.data[i]=bi.data[i+1]=bi.data[i+2]=tone*255;bi.data[i+3]=255;
  ni.data[i]=(1-dx/length)*127.5;ni.data[i+1]=(1+dy/length)*127.5;ni.data[i+2]=(1+1/length)*127.5;ni.data[i+3]=255;
  ri.data[i]=ri.data[i+1]=ri.data[i+2]=Math.min(255,220+valley*35);ri.data[i+3]=255;
  hi.data[i]=hi.data[i+1]=hi.data[i+2]=Math.max(0,Math.min(255,surface[p]*255));hi.data[i+3]=255;
 }
 bc.putImageData(bi,0,0);nc.putImageData(ni,0,0);rc.putImageData(ri,0,0);hc.putImageData(hi,0,0);
 return {base,normal,rough,height,photo:canvas,contrast:std};
}
export async function loadPhotoMaterials(THREE){
 const result={heights:{},normals:{},albedos:{},roughnessMaps:{},samples:{},photos:{}};
 const load=async url=>{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('皮料材质读取失败'));image.src=url});return image};
 await Promise.all(Object.keys(photoSources).map(async id=>{
  const maps=await Promise.all(['base','normal','rough','height'].map(kind=>load(`./materials/baked/${id}-${kind}.webp`)));
  const texture=(image,color=false)=>{const t=new THREE.Texture(image);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.anisotropy=16;if(color)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t};
  result.albedos[id]=texture(maps[0],true);result.normals[id]=texture(maps[1]);result.roughnessMaps[id]=texture(maps[2]);
  const canvas=document.createElement('canvas');canvas.width=maps[3].naturalWidth||maps[3].width;canvas.height=maps[3].naturalHeight||maps[3].height;canvas.getContext('2d').drawImage(maps[3],0,0);result.heights[id]=new THREE.CanvasTexture(canvas);
  result.samples[id]=`./materials/baked/${id}-sample.jpg`;result.photos[id]=result.samples[id];
 }));return result;
}
