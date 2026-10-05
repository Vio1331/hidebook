import assert from 'node:assert/strict';
import {MM} from '../dist/leather-geometry.js';
import {POP,bounds,popRing,popSurface,popSurfaceZ,popSetPressed,popEdge,popStitches,popDistance} from '../dist/pop-geometry.js';
import {popPalettes,popAccessoryPalette} from '../dist/pop-colors.js';
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
near(bounds.rear.half*2,107);near(bounds.rear.top-bounds.rear.bottom,80);near(bounds.rear.rt,10);near(bounds.front.rb,10);
near(bounds.accent.half*2,85);near(bounds.accent.top-bounds.accent.bottom,55);near(bounds.accent.rt*2,6);
near(bounds.rear.top-bounds.accent.top,15.5);near(bounds.accent.top-bounds.front.top,16);near(bounds.front.top-bounds.front.bottom,48.5);
for(const part of ['rear','accent','front']){
 const b=bounds[part],ring=popRing(part);near(Math.max(...ring.map(p=>p.x))/MM,b.half);near(Math.max(...ring.map(p=>p.y))/MM,b.top);
 for(const back of [true,false]){const g=popSurface(part,back),original=g.attributes.position.array.slice();for(const v of original)assert.ok(Number.isFinite(v));popSetPressed(g,true);assert.ok(original.some((v,i)=>v!==g.attributes.position.array[i]));popSetPressed(g,false);for(let i=0;i<original.length;i++)near(original[i],g.attributes.position.array[i]);
 const normals=g.attributes.normal.array,tangents=g.attributes.tangent.array;for(let i=0;i<normals.length;i+=3){near(Math.hypot(normals[i],normals[i+1],normals[i+2]),1,1e-6);assert.ok(back?normals[i+2]<0:normals[i+2]>0,'Surface normal faces the wrong side');const j=i/3*4;near(Math.hypot(tangents[j],tangents[j+1],tangents[j+2]),1,1e-6);near(normals[i]*tangents[j]+normals[i+1]*tangents[j+1]+normals[i+2]*tangents[j+2],0,1e-6);assert.equal(tangents[j+3],back?-1:1);}
 const edges=new Map(),ind=g.index.array;for(let i=0;i<ind.length;i+=3)for(let j=0;j<3;j++){const a=ind[i+j],c=ind[i+(j+1)%3],key=[Math.min(a,c),Math.max(a,c)].join(':');edges.set(key,(edges.get(key)||0)+1)}
 assert.equal([...edges.values()].filter(n=>n===1).length,ring.length,'Only the perimeter is open');assert.ok([...edges.values()].every(n=>n<=2),'Nonmanifold face');g.dispose()}
 for(let y=b.bottom+4;y<b.top-4;y+=2)for(let x=-b.half+4;x<b.half-4;x+=2)near((popSurfaceZ(part,x*MM,y*MM)-popSurfaceZ(part,x*MM,y*MM,true))/MM,1);
 const coat=popEdge(part);assert.equal(coat.userData.fullPerimeter,part!=='front');assert.equal(coat.userData.customization,part==='accent'?'innerEdge':'outerEdge');for(const v of coat.attributes.position.array)assert.ok(Number.isFinite(v));coat.dispose();
}
// At their overlap, each bonded pair remains separate and the two pockets open at their mouths.
for(let y=-30;y<8.5;y++)for(let x=-38;x<38;x++){
 assert.ok(popSurfaceZ('accent',x*MM,y*MM,true)>=popSurfaceZ('rear',x*MM,y*MM)-1e-9);
 assert.ok(popSurfaceZ('front',x*MM,y*MM,true)>=popSurfaceZ('accent',x*MM,y*MM)-1e-9);
}
// Check the actual triangulated underside, including the middle pocket's corners.
const lowerMesh=popSurface('front',true),vertices=lowerMesh.attributes.position.array,triangles=lowerMesh.index.array;
for(let t=0;t<triangles.length;t+=3){const ids=[triangles[t],triangles[t+1],triangles[t+2]],x=ids.reduce((s,i)=>s+vertices[i*3],0)/3,y=ids.reduce((s,i)=>s+vertices[i*3+1],0)/3,z=ids.reduce((s,i)=>s+vertices[i*3+2],0)/3;if(popDistance('accent',x,y)>=0)assert.ok(z>=popSurfaceZ('accent',x,y)-1e-7,'Lower mesh intersects the middle pocket');}
lowerMesh.dispose();
const seam=popStitches(),ys=seam.sideHolesMM;const below=ys.filter(y=>y<8.5).at(-1),above=ys.find(y=>y>8.5);near((below+above)/2,8.5);near(above-below,3.38);
for(let i=1;i<ys.length;i++)near(ys[i]-ys[i-1],3.38);
assert.equal(seam.curves.filter(c=>c.kind==='edge-bridge').length,2);
const returns=seam.curves.filter(c=>c.kind==='mouth-backstitch');
assert.equal(returns.length,8,'Two backstitches per side, on both faces');
for(const side of ['left','right'])for(const back of [false,true]){
 const group=returns.filter(c=>c.side===side&&c.back===back);assert.deepEqual(group.map(c=>c.stitch).sort(),[0,1]);
 for(const c of group){
  const outgoing=seam.curves.find(o=>o.part==='rear'&&o.back===back&&o.kind!=='mouth-backstitch'&&o.points[0].distanceTo(c.points.at(-1))<1e-9&&o.points.at(-1).distanceTo(c.points[0])<1e-9);
  assert.ok(outgoing,'Return uses existing holes');
  const a=c.points[10],b=outgoing.points[10];near(Math.abs(a.x-b.x)/MM,.38);assert.ok(back?a.z<b.z:a.z>b.z);
  if(!back)for(const p of c.points.slice(2,-2))if(p.y<=bounds.front.top*MM)assert.ok(p.z>=popSurfaceZ('front',p.x,p.y)-.005*MM,'Backstitch intersects pocket lip');
 }
}
for(const c of seam.curves.filter(c=>c.kind==='edge-bridge'))for(const p of c.points)if(p.y<=bounds.front.top*MM&&Math.abs(p.y-bounds.front.top*MM)<1*MM)assert.ok(p.z>=popSurfaceZ('front',p.x,p.y)-.005*MM,'Thread intersects the lower lip');
// The whole shared U-shaped boundary is bonded, not just a hidden paint bridge.
for(const p of popRing('front'))if(p.y<bounds.front.top*MM-1e-7)near(popSurfaceZ('front',p.x,p.y,true),popSurfaceZ('rear',p.x,p.y),1e-7);
for(const x of [-49.5,49.5])for(let y=-30;y<8.5;y+=.5)near(popSurfaceZ('front',x*MM,y*MM,true),popSurfaceZ('rear',x*MM,y*MM),1e-7);
assert.deepEqual(popPalettes.epsom.map(c=>c.name),['卡萨克红','橙色','那不勒斯黄','炫绿色','丝兰绿','鸭绿色','天蓝色','水妖蓝','深邃蓝','锦葵紫','杜鹃粉','粉笔白']);
assert.deepEqual(popPalettes.evercolor.map(c=>c.name),['爱马仕红','饼干色','金色','冰川蓝','水泥灰','石板灰','大象灰']);
assert.deepEqual(popAccessoryPalette.map(c=>c.id),[...popPalettes.epsom,...popPalettes.evercolor].map(c=>c.id));
console.log('PASS: Pop 107×80, middle 85×55/R3, lower 48.5 mm; three 1 mm bonded pairs; bonded shared outer boundary and continuous coat; connected faces; no layer intersections; 3.38 mm side pitch; mouth centred between holes on both sides; 12/7 material colors in requested order.');
