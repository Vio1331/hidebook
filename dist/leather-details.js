import * as THREE from './vendor/three.module.js';
import {MM,HALF,BOTTOM,BODY_TOP,PART_TOP,PART_Z,STITCH_INSET,THREAD_DIAMETER,seamPath,stitchSegments,surfaceZ,slotTop} from './leather-geometry.js?v=20261002c';
export const LINEN_PLIES=3,LINEN_TWIST_MM=2.6;
export function stitchZ(x,y,back){
 if(back)return surfaceZ('rear',x,y,true,false)-.045*MM;
 let z=surfaceZ('body',x,y,false,false);
 for(const part of ['accent','front']){const top=slotTop(x,PART_TOP[part]),u=THREE.MathUtils.smoothstep(top+.45*MM-y,0,1.05*MM);z=THREE.MathUtils.lerp(z,surfaceZ(part,x,y,false,false),u)}
 return z+.045*MM;
}
export function seamCurves(){
 const {segments,holes,count,pitchMM}=stitchSegments(),curves=[],pairGap=.42*MM;
 for(const back of [false,true])for(let i=0;i<count;i++){
  if(i===0||i===count-1)continue; // Replaced by one continuous front/top/back stitch.
  const s=segments[i],dir=s.b.clone().sub(s.a).normalize(),normal=new THREE.Vector2(-dir.y,dir.x),paired=i===1||i===count-2;
  for(const strand of paired?[-.5,.5]:[0]){
   const pts=[];for(let j=0;j<=12;j++){const t=j/12,x=THREE.MathUtils.lerp(s.a.x,s.b.x,t)+normal.x*pairGap*strand,y=THREE.MathUtils.lerp(s.a.y,s.b.y,t)+normal.y*pairGap*strand;
    const lift=Math.sin(Math.PI*t)*.025*MM;pts.push(new THREE.Vector3(x,y,stitchZ(x,y,back)+(back?-lift:lift)))}
   curves.push({points:pts,kind:paired?'parallel-return':'regular',side:back?'back':'front',index:i,strand});
  }
 }
 for(const side of [-1,1]){
  const s=segments[side<0?0:count-1],lower=side<0?s.b:s.a,upper=side<0?s.a:s.b;
  for(const strand of [-.5,.5]){
   const dx=pairGap*strand,x=upper.x+dx,pts=[],yc=BODY_TOP-.5*MM;
   for(let i=0;i<=12;i++){const t=i/12,px=THREE.MathUtils.lerp(lower.x,upper.x,t)+dx,py=THREE.MathUtils.lerp(lower.y,yc,t);pts.push(new THREE.Vector3(px,py,stitchZ(px,py,false)))}
   // One uninterrupted curve climbs the front, passes over both folds and
   // descends the rear. It has only two ends, both inside the lower awl holes.
   const zf=surfaceZ('body',x,yc,false,false),zb=surfaceZ('rear',x,yc,true,false),lift=.045*MM;
   for(let i=1;i<=12;i++){const a=i/12*Math.PI/2;pts.push(new THREE.Vector3(x,yc+(.5*MM+lift)*Math.sin(a),zf-.5*MM+(.5*MM+lift)*Math.cos(a)))}
   for(let i=1;i<=8;i++)pts.push(new THREE.Vector3(x,BODY_TOP+lift,THREE.MathUtils.lerp(zf-.5*MM,zb+.5*MM,i/8)));
   for(let i=1;i<=12;i++){const a=Math.PI/2+i/12*Math.PI/2;pts.push(new THREE.Vector3(x,yc+(.5*MM+lift)*Math.sin(a),zb+.5*MM+(.5*MM+lift)*Math.cos(a)))}
   for(let i=1;i<=12;i++){const t=i/12,px=THREE.MathUtils.lerp(upper.x,lower.x,t)+dx,py=THREE.MathUtils.lerp(yc,lower.y,t);pts.push(new THREE.Vector3(px,py,stitchZ(px,py,true)))}
   curves.push({points:pts,kind:'continuous-top-return',side,index:side<0?0:count-1,strand});
  }
 }
 return {curves,holes,count,pitchMM};
}
export function linenGeometry(points){
 const curve=new THREE.CatmullRomCurve3(points),length=curve.getLength(),steps=Math.max(22,Math.ceil(length/MM*16)),radial=18,frames=curve.computeFrenetFrames(steps,false),p=[],uv=[],ind=[],r=THREAD_DIAMETER/2;
 for(let i=0;i<=steps;i++){
  const t=i/steps,c=curve.getPointAt(t),taper=.28+.72*Math.sin(Math.PI*Math.min(1,Math.min(t,1-t)*18)/2);
  for(let j=0;j<=radial;j++){
   const a=j/radial*Math.PI*2,twist=length/MM*t*2*Math.PI/LINEN_TWIST_MM,rib=1+.16*Math.cos(LINEN_PLIES*(a-twist));
   const v=frames.normals[i].clone().multiplyScalar(Math.cos(a)*r*rib*taper).addScaledVector(frames.binormals[i],Math.sin(a)*r*rib*taper);
   p.push(c.x+v.x,c.y+v.y,c.z+v.z);uv.push(t*length/MM/LINEN_TWIST_MM,j/radial);
   if(i<steps&&j<radial){const k=i*(radial+1)+j;ind.push(k,k+1,k+radial+1,k+1,k+radial+2,k+radial+1)}
  }
 }
 for(const end of [0,steps]){const c=curve.getPointAt(end/steps),idx=p.length/3;p.push(...c.toArray());uv.push(0,0);for(let j=0;j<radial;j++){const k=end*(radial+1)+j;ind.push(idx,k+1,k)}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();return g;
}
// A single continuous edge coat spans the glued stack. There are no per-layer
// ridges. Only the outside silhouette steps at the pocket mouths.
export function edgePaintGeometry(){
 const p=[],ind=[],cross=20,rows=[];
 for(let y=-25;y<34.5;y+=.5)rows.push({y});
 for(const top of [13,24]){
  for(let j=0;j<=16;j++)rows.push({y:top-.5+.525*j/16,cap:top});
  rows.push({y:top+.025,above:true,cap:top});
 }
 for(let j=0;j<=20;j++)rows.push({y:34.5+.525*j/20});
 rows.sort((a,b)=>a.y-b.y||Number(!!a.above)-Number(!!b.above));
 function limits(row){
  const y=row.y;
  if(y>=34.5){const r=Math.sqrt(Math.max(0,.525**2-(y-34.5)**2));return [-1.5-r,-.5+r]}
  let front=y<13.025?2.025:y<24.025?1.025:.025;
  if(row.above)front=row.cap===13?1.025:.025;
  else for(const [top,z] of [[13,1.5],[24,.5]])if(y>=top-.5&&y<=top+.025){front=z+Math.sqrt(Math.max(0,.525**2-(y-top+.5)**2));break}
  return [-2.025,front];
 }
 for(const side of [-1,1]){
  const start=p.length/3;
  for(let i=0;i<rows.length;i++){
   const {y}=rows[i],[back,front]=limits(rows[i]);
   for(let j=0;j<=cross;j++){const u=j/cross,z=back+(front-back)*u,offset=.055-.13*Math.exp(-((Math.min(z-back,front-z)/.10)**2));p.push(side*(HALF+offset*MM),y*MM,z*MM);
    if(i<rows.length-1&&j<cross){const k=start+i*(cross+1)+j;if(side<0)ind.push(k,k+1,k+cross+1,k+1,k+cross+2,k+cross+1);else ind.push(k,k+cross+1,k+1,k+1,k+cross+1,k+cross+2)}
   }
  }
  // A narrow top return hides the two folded-end junctions with one coat.
  const last=start+(rows.length-1)*(cross+1),rim=p.length/3;
  for(let j=0;j<=cross;j++){const q=(last+j)*3;p.push(side*(HALF-.10*MM),p[q+1],p[q+2]);if(j<cross)side>0?ind.push(last+j,rim+j,last+j+1,last+j+1,rim+j,rim+j+1):ind.push(last+j,last+j+1,rim+j,last+j+1,rim+j+1,rim+j)}
 }
 const path=seamPath(-25*MM,0),n=320,start=p.length/3;
 for(let i=0;i<=n;i++){
  const q=path.getPointAt(i/n),t=path.getTangentAt(i/n),out=new THREE.Vector2(t.y,-t.x);if(i===0){q.set(-HALF,-25*MM);out.set(-1,0)}if(i===n){q.set(HALF,-25*MM);out.set(1,0)}
  for(let j=0;j<=cross;j++){const u=j/cross,offset=(.055-.13*Math.exp(-((4.05*Math.min(u,1-u)/.10)**2)))*MM;p.push(q.x+out.x*offset,q.y+out.y*offset,(-2.025+4.05*u)*MM);
   if(i<n&&j<cross){const k=start+i*(cross+1)+j;ind.push(k,k+cross+1,k+1,k+1,k+cross+1,k+cross+2)}
  }
 }
 const welded=[],remap=[],byPosition=new Map(),indices=[];
 for(let i=0;i<p.length;i+=3){const key=p.slice(i,i+3).map(n=>Math.round(n*1e6)).join(':');if(!byPosition.has(key)){byPosition.set(key,welded.length/3);welded.push(p[i],p[i+1],p[i+2])}remap.push(byPosition.get(key))}
 for(let i=0;i<ind.length;i+=3){const [a,b,c]=[remap[ind[i]],remap[ind[i+1]],remap[ind[i+2]]];if(a!==b&&b!==c&&a!==c)indices.push(a,b,c)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(welded,3));g.setIndex(indices);g.computeVertexNormals();g.userData={continuousCoat:true};return g;
}
