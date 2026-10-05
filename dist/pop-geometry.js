import * as THREE from './vendor/three.module.js';
import {MM,ATLAS_MM,CREASE_WIDTH} from './leather-geometry.js?v=20261002n';

// Millimetres, with the product centred at (0, 0). Each bonded pair is 0.5 + 0.5 mm.
export const POP={width:107,height:80,radius:10,thickness:1,plyThickness:.5,inset:4,pitch:3.38,creaseInset:2,creaseWidth:CREASE_WIDTH/MM};
export const bounds={
 rear:{half:53.5,bottom:-40,top:40,rt:10,rb:10,z:-1.5},
 accent:{half:42.5,bottom:-30.5,top:24.5,rt:3,rb:3,z:-.5},
 front:{half:53.5,bottom:-40,top:8.5,rt:0,rb:10,z:-.5}
};
const uvOffset={rear:[.025,.015],accent:[.04,-.06],front:[-.04,.06]};
export function popRing(part,inset=0){
 const b=bounds[part],h=b.half-inset,lo=b.bottom+inset,hi=b.top-inset,rt=Math.max(.001,b.rt-inset),rb=Math.max(.001,b.rb-inset),pts=[];
 const line=(ax,ay,bx,by)=>{const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/.8));for(let i=0;i<n;i++)pts.push(new THREE.Vector2((ax+(bx-ax)*i/n)*MM,(ay+(by-ay)*i/n)*MM))};
 const arc=(x,y,r,a)=>{for(let i=0;i<24;i++){const t=a+Math.PI/2*i/24;pts.push(new THREE.Vector2((x+r*Math.cos(t))*MM,(y+r*Math.sin(t))*MM))}};
 line(-h+rb,lo,h-rb,lo);arc(h-rb,lo+rb,rb,-Math.PI/2);line(h,lo+rb,h,hi-rt);arc(h-rt,hi-rt,rt,0);line(h-rt,hi,-h+rt,hi);arc(-h+rt,hi-rt,rt,Math.PI/2);line(-h,hi-rt,-h,lo+rb);arc(-h+rb,lo+rb,rb,Math.PI);
 return pts;
}
export function popDistance(part,x,y){
 const b=bounds[part],px=Math.abs(x/MM),py=y/MM;
 for(const [r,cy,test] of [[b.rt,b.top-b.rt,py>b.top-b.rt],[b.rb,b.bottom+b.rb,py<b.bottom+b.rb]])if(r&&test&&px>b.half-r)return (r-Math.hypot(px-(b.half-r),py-cy))*MM;
 return Math.min(b.half-px,py-b.bottom,b.top-py)*MM;
}
function gap(part,x,y){
 if(part==='rear')return 0;
 const b=bounds[part],side=THREE.MathUtils.smoothstep(popDistance(part,x,Math.min(y,(b.top-10)*MM))/MM,4,10),rise=THREE.MathUtils.clamp((y/MM-b.bottom-4)/(b.top-b.bottom-4),0,1);
 return .45*MM*side*rise**3;
}
export function popSurfaceZ(part,x,y,back=false,pressed=false){
 // The lower pocket is glued to the base along its two sides and bottom. It
 // rises only inward of that seam, over the 1 mm middle pocket where present.
 const overMiddle=THREE.MathUtils.smoothstep(popDistance('accent',x,y)/MM,-5.5,-1),
 opening=part==='front'?overMiddle*(1.05*MM+gap('accent',x,y))+gap('front',x,y):gap(part,x,y);
 const groove=pressed?.10*MM*Math.exp(-(((popDistance(part,x,y)-2*MM)/(.115*MM))**2)):0;
 return (bounds[part].z+(back?0:1))*MM+opening+(back?groove:-groove);
}
export function popSetPressed(geo,pressed){
 const p=geo.attributes.position.array,{part,back}=geo.userData;
 for(let i=0;i<p.length;i+=3)p[i+2]=popSurfaceZ(part,p[i],p[i+1],back,pressed);
 geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();
}
export function popSurface(part,back=false){
 const positions=[],uv=[],indices=[],outer=popRing(part),cy=(bounds[part].bottom+bounds[part].top)/2*MM;
 const add=(x,y)=>{positions.push(x,y,popSurfaceZ(part,x,y,back));const o=uvOffset[part];uv.push(x/(ATLAS_MM*MM)+.5+o[0],y/(ATLAS_MM*MM)+.5+o[1]);return positions.length/3-1};
 // Sample corresponding points at a fixed contour count so each concentric ring is welded.
 const contour=(inset)=>{const path=new THREE.Path(popRing(part,inset));path.closePath();path.arcLengthDivisions=3000;return outer.map((_,i)=>path.getPointAt(i/outer.length))};
 let previous=null;
 for(const inset of [0,.3,1,1.5,1.7,1.82,1.9,1.94,1.97,2,2.03,2.06,2.1,2.18,2.3,3.5]){
  const ids=contour(inset).map(p=>add(p.x,p.y));if(previous)for(let i=0;i<ids.length;i++){const j=(i+1)%ids.length;indices.push(previous[i],previous[j],ids[i],previous[j],ids[j],ids[i])}previous=ids;
 }
 const inner=contour(3.5);
 for(let k=1;k<=14;k++){const s=1-k/15,ids=inner.map(p=>add(p.x*s,cy+(p.y-cy)*s));for(let i=0;i<ids.length;i++){const j=(i+1)%ids.length;indices.push(previous[i],previous[j],ids[i],previous[j],ids[j],ids[i])}previous=ids}
 const c=add(0,cy);for(let i=0;i<previous.length;i++)indices.push(previous[i],previous[(i+1)%previous.length],c);
 if(back)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.userData={part,back};return g;
}
export function popEdge(part){
 // One outer shell seals the base + lower pocket together. The lower pocket's
 // only separate exposed edge is its mouth; the middle pocket has its own coat.
 let pts=popRing(part),closed=true;
 if(part==='rear'){
  const mouth=bounds.front.top*MM;
  for(let i=pts.length-1;i>=0;i--){const a=pts[i],b=pts[(i+1)%pts.length];if((a.y-mouth)*(b.y-mouth)<0){const lower=new THREE.Vector2(a.x+(b.x-a.x)*(mouth-a.y)/(b.y-a.y),mouth),upper=lower.clone();upper.upper=true;pts.splice(i+1,0,...(a.y<mouth?[lower,upper]:[upper,lower]))}}
 }else if(part==='front'){
  closed=false;pts=Array.from({length:135},(_,i)=>new THREE.Vector2((-53.5+107*i/134)*MM,bounds.front.top*MM));
 }
 const positions=[],indices=[],cross=8,rows=closed?pts.length+1:pts.length;
 for(let i=0;i<rows;i++){
  const p=pts[i%pts.length],prev=pts[closed?(i+pts.length-1)%pts.length:Math.max(0,i-1)],next=pts[closed?(i+1)%pts.length:Math.min(pts.length-1,i+1)],t=next.clone().sub(prev).normalize(),n=closed?new THREE.Vector2(t.y,-t.x):new THREE.Vector2(0,1);
  const belowMouth=part==='rear'&&!p.upper&&p.y<=bounds.front.top*MM;
  // Duplicate the mouth row above it to keep a sharp change from 2 mm to 1 mm.
  const top=popSurfaceZ(belowMouth?'front':part,p.x,p.y);
  for(let j=0;j<=cross;j++){
   const u=j/cross,bulge=.045*MM*Math.sin(Math.PI*u),q=p.clone().addScaledVector(n,bulge),z=THREE.MathUtils.lerp(popSurfaceZ(part,p.x,p.y,true)-.015*MM,top+.015*MM,u);positions.push(q.x,q.y,z);
   if(i<rows-1&&j<cross){const k=i*(cross+1)+j;indices.push(k,k+1,k+cross+1,k+1,k+cross+2,k+cross+1)}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.userData={part,fullPerimeter:closed,sharedOuter:part==='rear',mouthOnly:part==='front',customization:part==='accent'?'innerEdge':'outerEdge'};return g;
}
function topFrontZ(x,y){return popSurfaceZ(y<=bounds.front.top*MM?'front':'rear',x,y)+.045*MM}
export function popStitches(){
 const curves=[],holes=[],paths=[],pitch=POP.pitch,half=49.5,r=6,frontTop=bounds.front.top;
 // Both vertical runs share a phase: the lower mouth bisects its neighbouring holes.
 const valid=[];for(let k=-40;k<40;k++){const y=frontTop+(k+.5)*pitch;if(y>=-30&&y<=30)valid.push(y)}
 const base=valid.map(y=>new THREE.Vector2(-half*MM,y*MM));
 function join(path){path.arcLengthDivisions=3000;const n=Math.round(path.getLength()/(pitch*MM));for(let i=1;i<n;i++)base.push(path.getPointAt(i/n))}
 const top=new THREE.Path();top.moveTo(-half*MM,valid.at(-1)*MM);top.lineTo(-half*MM,30*MM);top.absarc((-half+r)*MM,30*MM,r*MM,Math.PI,Math.PI/2,true);top.lineTo((half-r)*MM,36*MM);top.absarc((half-r)*MM,30*MM,r*MM,Math.PI/2,0,true);top.lineTo(half*MM,valid.at(-1)*MM);join(top);
 [...valid].reverse().forEach(y=>base.push(new THREE.Vector2(half*MM,y*MM)));
 const bottom=new THREE.Path();bottom.moveTo(half*MM,valid[0]*MM);bottom.lineTo(half*MM,-30*MM);bottom.absarc((half-r)*MM,-30*MM,r*MM,0,-Math.PI/2,true);bottom.lineTo((-half+r)*MM,-36*MM);bottom.absarc((-half+r)*MM,-30*MM,r*MM,-Math.PI/2,-Math.PI,true);bottom.lineTo(-half*MM,valid[0]*MM);join(bottom);
 paths.push({part:'rear',points:base});
 // The inner card slot has its own stitched perimeter, with no shared outer seam.
 const midPath=new THREE.Path(popRing('accent',4));midPath.closePath();midPath.arcLengthDivisions=3000;const midCount=Math.round(midPath.getLength()/(pitch*MM));paths.push({part:'accent',points:Array.from({length:midCount},(_,i)=>midPath.getPointAt(i/midCount))});
 for(const {part,points} of paths){
  for(const p of points)holes.push({part,point:p});
  for(const back of [false,true])for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length],dir=b.clone().sub(a).normalize(),n=new THREE.Vector2(-dir.y,dir.x),pa=a.clone().addScaledVector(dir,.12*MM).addScaledVector(n,.29*MM),pb=b.clone().addScaledVector(dir,-.12*MM).addScaledVector(n,-.29*MM),pts=[];
   const zAt=(p)=>part==='accent'?popSurfaceZ(part,p.x,p.y,back)+(back?-.045:.045)*MM:back?popSurfaceZ('rear',p.x,p.y,true)-.045*MM:topFrontZ(p.x,p.y);
   const za=zAt(pa),zb=zAt(pb),bridge=part==='rear'&&!back&&Math.min(pa.y,pb.y)<frontTop*MM&&Math.max(pa.y,pb.y)>frontTop*MM;
   for(let j=0;j<=20;j++){const t=j/20,p=pa.clone().lerp(pb,t);let z=bridge?Math.max(THREE.MathUtils.lerp(za,zb,t),zAt(p)):zAt(p);z+=(back?-1:1)*(.018*MM*Math.sin(Math.PI*t)-.12*MM*Math.exp(-((Math.min(t,1-t)/.045)**2)));pts.push(new THREE.Vector3(p.x,p.y,z))}
   // Piecewise taut bridge over the square edge: two straight spans meeting at the lip.
   if(bridge){const t=(frontTop*MM-pa.y)/(pb.y-pa.y),x=THREE.MathUtils.lerp(pa.x,pb.x,t),lip=new THREE.Vector3(x,frontTop*MM,popSurfaceZ('front',x,frontTop*MM)+.10*MM),start=new THREE.Vector3(pa.x,pa.y,za),end=new THREE.Vector3(pb.x,pb.y,zb);pts.length=0;for(let j=0;j<=20;j++){const u=j/20;const q=u<t?start.clone().lerp(lip,u/t):lip.clone().lerp(end,(u-t)/(1-t));q.z-=.12*MM*Math.exp(-((Math.min(u,1-u)/.045)**2));pts.push(q)}curves.push({points:pts,kind:'edge-bridge',part,back})}
   else curves.push({points:pts,kind:'regular',part,back});
  }
 }
 return {curves,holes,count:base.length,pitchMM:pitch,mouthYMM:frontTop,sideHolesMM:valid};
}
