import * as THREE from './vendor/three.module.js';
export const CARD_WIDTH_MM=107,CARD_HEIGHT_MM=70,MM=3.5/107,LAYER=MM;
export const HALF=53.5*MM,BOTTOM=-35*MM,BODY_TOP=35*MM;
export const BOTTOM_RADIUS=10*MM,CREASE_INSET=2*MM,CREASE_WIDTH=.2*MM;
export const STITCH_INSET=3*MM,THREAD_DIAMETER=.45*MM,STITCH_PITCH=3.38*MM;
export const ACCENT_TOP=24*MM,FRONT_TOP=13*MM,ATLAS_MM=160;
export const PART_TOP={rear:BODY_TOP,body:BODY_TOP,accent:ACCENT_TOP,front:FRONT_TOP};
export const PART_Z={rear:-2*MM,body:-MM,accent:0,front:MM};
export function slotTop(x,top){return top-(top<30*MM?1.15*MM*(1-(x/HALF)**2):0)}
export function outline(top,inset=0){
 const s=new THREE.Shape(),r=BOTTOM_RADIUS-inset,h=HALF-inset,b=BOTTOM+inset;
 s.moveTo(-h+r,b);s.lineTo(h-r,b);s.absarc(h-r,b+r,r,-Math.PI/2,0,false);s.lineTo(h,slotTop(h,top)-inset);
 for(let i=1;i<=80;i++){const x=h-2*h*i/80;s.lineTo(x,slotTop(x,top)-inset)}
 s.lineTo(-h,b+r);s.absarc(-h+r,b+r,r,Math.PI,1.5*Math.PI,false);s.closePath();return s;
}
export function edgeDistance(x,y){
 if(y<BOTTOM+BOTTOM_RADIUS&&Math.abs(x)>HALF-BOTTOM_RADIUS)return BOTTOM_RADIUS-Math.hypot(Math.abs(x)-(HALF-BOTTOM_RADIUS),y-(BOTTOM+BOTTOM_RADIUS));
 return Math.min(HALF-Math.abs(x),y-BOTTOM);
}
export function topDistance(x,y,top){return slotTop(x,top)-y}
export function openingOffset(part,x,y){
 if(part==='rear')return 0;
 // Open at the mouth, closed at the saddle seam and bottom. Distinct solids.
 const side=Math.max(0,1-(Math.abs(x)/(HALF-3.2*MM))**6);
 const rise=Math.max(0,Math.min(1,(y-BOTTOM-3*MM)/(BODY_TOP-BOTTOM-3*MM)));
 let gap=1.9*MM*side*rise**3;
 if(part==='accent'||part==='front')gap+=.38*MM*side*Math.max(0,(y-BOTTOM)/(ACCENT_TOP-BOTTOM))**4;
 if(part==='front')gap+=.32*MM*side*Math.max(0,(y-BOTTOM)/(FRONT_TOP-BOTTOM))**4;
 return gap;
}
export function grooveDepth(x,y,top){
 const d=Math.min(edgeDistance(x,y),topDistance(x,y,top));
 return .055*MM*Math.exp(-(((d-CREASE_INSET)/(.064*MM))**2));
}
export function surfaceZ(part,x,y,back=false,pressed=true){
 return PART_Z[part]+(back?0:LAYER)+openingOffset(part,x,y)-(pressed?(back?-1:1)*grooveDepth(x,y,PART_TOP[part]):0);
}
// Densely sampled concentric boundaries place real vertices on the 0.2mm groove.
// The interior is subdivided only enough to reproduce gentle leather bowing.
function ringPoints(top,inset){
 const h=HALF-inset,r=BOTTOM_RADIUS-inset,b=BOTTOM+inset,pts=[];
 const line=(ax,ay,bx,by,n)=>{for(let i=0;i<n;i++)pts.push(new THREE.Vector2(ax+(bx-ax)*i/n,ay+(by-ay)*i/n))};
 line(-h+r,b,h-r,b,170);
 for(let i=0;i<48;i++){const a=-Math.PI/2+Math.PI/2*i/48;pts.push(new THREE.Vector2(h-r+r*Math.cos(a),b+r+r*Math.sin(a)))}
 line(h,b+r,h,slotTop(h,top)-inset,120);
 for(let i=0;i<220;i++){const x=h-2*h*i/220;pts.push(new THREE.Vector2(x,slotTop(x,top)-inset))}
 line(-h,slotTop(-h,top)-inset,-h,b+r,120);
 for(let i=0;i<48;i++){const a=Math.PI+Math.PI/2*i/48;pts.push(new THREE.Vector2(-h+r+r*Math.cos(a),b+r+r*Math.sin(a)))}
 return pts;
}
export function makeLeatherSurface(part,back=false,stampShapes=[]){
 const top=PART_TOP[part]-.5*MM,positions=[],uv=[],indices=[];
 const add=(x,y)=>{positions.push(x,y,surfaceZ(part,x,y,back,false));const off={rear:[.025,.015],body:[-.025,-.015],accent:[.04,-.06],front:[-.04,.06]}[part];uv.push(x/(ATLAS_MM*MM)+.5+off[0],y/(ATLAS_MM*MM)+.5+off[1]);return positions.length/3-1};
 const ds=[0,.3,1,1.32,1.4,1.44,1.47,1.5,1.53,1.56,1.6,1.68,1.7,1.82,1.9,1.94,1.97,2,2.03,2.06,2.1,2.18,2.3,3.5];
 let previous=null;
 for(const d of ds){const pts=ringPoints(top,d*MM),ids=pts.map(p=>add(p.x,p.y));if(previous)for(let i=0;i<ids.length;i++){const j=(i+1)%ids.length;indices.push(previous[i],previous[j],ids[i],previous[j],ids[j],ids[i])}previous=ids}
 const pts=ringPoints(top,3.5*MM),s=new THREE.Shape(pts),islands=[];
 if(!back)for(const glyph of stampShapes){s.holes.push(new THREE.Path(glyph.getPoints(12)));for(const hole of glyph.holes)islands.push(new THREE.Shape(hole.getPoints(12)))}
 const g=new THREE.ShapeGeometry([s,...islands]),a=g.attributes.position.array;
 function tri(p,q,r,depth=0){
  const max=Math.max(Math.hypot(p[0]-q[0],p[1]-q[1]),Math.hypot(p[0]-r[0],p[1]-r[1]),Math.hypot(r[0]-q[0],r[1]-q[1]));
  if(max>4*MM&&depth<16){
   const dist=(u,v)=>Math.hypot(u[0]-v[0],u[1]-v[1]);
   if(dist(p,q)>=dist(p,r)&&dist(p,q)>=dist(q,r)){const m=[(p[0]+q[0])/2,(p[1]+q[1])/2];tri(p,m,r,depth+1);tri(m,q,r,depth+1)}
   else if(dist(p,r)>=dist(q,r)){const m=[(p[0]+r[0])/2,(p[1]+r[1])/2];tri(p,q,m,depth+1);tri(m,q,r,depth+1)}
   else{const m=[(q[0]+r[0])/2,(q[1]+r[1])/2];tri(p,q,m,depth+1);tri(p,m,r,depth+1)}
  }else indices.push(add(...p),add(...q),add(...r));
 }
 if(stampShapes.length&&!back){const ind=g.index.array;for(let i=0;i<ind.length;i+=3)tri([a[ind[i]*3],a[ind[i]*3+1]],[a[ind[i+1]*3],a[ind[i+1]*3+1]],[a[ind[i+2]*3],a[ind[i+2]*3+1]])}
 else{
  const inset=3.5*MM,h=HALF-inset,r=10*MM-inset,b=BOTTOM+inset,nx=100,ny=70,start=positions.length/3;
  for(let j=0;j<ny;j++){const t=j/(ny-1),y0=b+(top-inset-b)*t,half=y0<b+r?h-r+Math.sqrt(Math.max(0,r*r-(y0-b-r)**2)):h;
   for(let i=0;i<nx;i++){const x=-half+2*half*i/(nx-1),y=y0-(top<30*MM?1.15*MM*(1-(x/HALF)**2)*THREE.MathUtils.smoothstep(t,.75,1):0);add(x,y)}
  }
  for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const k=start+j*nx+i;indices.push(k,k+1,k+nx,k+1,k+nx+1,k+nx)}
 }g.dispose();
 if(back)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();geo.userData={part,back,rest:new Float32Array(positions)};return geo;
}
export function setPressedGeometry(geo,pressed){const a=geo.attributes.position.array,r=geo.userData.rest,{part,back}=geo.userData;for(let i=0;i<a.length;i+=3)a[i+2]=r[i+2]-(pressed?(back?-1:1)*grooveDepth(a[i],a[i+1],PART_TOP[part]):0);geo.attributes.position.needsUpdate=true;geo.computeVertexNormals()}
export function foldedTopGeometry(part){
 const top=PART_TOP[part],p=[],uv=[],ind=[],nx=300,nr=24;
 for(let i=0;i<=nx;i++){const x=-HALF+2*HALF*i/nx;for(let j=0;j<=nr;j++){
  const a=j/nr*Math.PI,y=slotTop(x,top)-.5*MM+.5*MM*Math.sin(a),z=PART_Z[part]+.5*MM+.5*MM*Math.cos(a)+openingOffset(part,x,slotTop(x,top)-.5*MM);
  p.push(x,y,z);uv.push(x/(ATLAS_MM*MM)+.5,y/(ATLAS_MM*MM)+.5);
  if(i<nx&&j<nr){const k=i*(nr+1)+j;ind.push(k,k+nr+1,k+1,k+1,k+nr+1,k+nr+2)}
 }}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();return g;
}
export function seamPath(top=BODY_TOP-.4*MM,inset=STITCH_INSET){
 const p=new THREE.Path(),l=-HALF+inset,r=HALF-inset,b=BOTTOM+inset,rad=BOTTOM_RADIUS-inset;
 p.moveTo(l,top);p.lineTo(l,b+rad);p.absarc(l+rad,b+rad,rad,Math.PI,1.5*Math.PI,false);p.lineTo(r-rad,b);p.absarc(r-rad,b+rad,rad,-Math.PI/2,0,false);p.lineTo(r,top);p.arcLengthDivisions=3000;return p;
}
export function frontPartAt(x,y){return y<slotTop(x,FRONT_TOP)-.5*MM?'front':y<slotTop(x,ACCENT_TOP)-.5*MM?'accent':'body'}
export function seamSurfaceZ(x,y,back=false){return back?surfaceZ('rear',x,y,true):surfaceZ(frontPartAt(x,y),x,y)}
// Physical holes share one continuous seam phase. Long stitches bridge each fold.
export function stitchSegments(){
 const path=seamPath(),length=path.getLength(),count=Math.round(length/STITCH_PITCH),pitch=length/count,segments=[];
 const holes=Array.from({length:count+1},(_,i)=>path.getPointAt(i/count));
 for(let i=0;i<count;i++){
  const a=holes[i],b=holes[i+1],t=b.clone().sub(a).normalize(),n=new THREE.Vector2(-t.y,t.x);
  // Photo: left seam rises to the right; bottom seam descends to the right.
  const slant=.58*MM;const pa=a.clone().addScaledVector(t,.12*MM).addScaledVector(n,slant/2),pb=b.clone().addScaledVector(t,-.12*MM).addScaledVector(n,-slant/2);
  segments.push({a:pa,b:pb,backstitch:false});
 }
 // Exactly two return stitches at either mouth corner, plus fold-over anchoring.
 for(const index of [0,1,count-2,count-1])segments.push({...segments[index],backstitch:true});
 return {segments,holes,pitchMM:pitch/MM,count};
}
