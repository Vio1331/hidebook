import assert from 'node:assert/strict';
import {MM} from '../dist/leather-geometry.js';
import {POP,bounds,popRing,popSurface,popSurfaceZ,popSetPressed,popEdge,popStitches} from '../dist/pop-geometry.js';
import {popPalettes} from '../dist/pop-colors.js';
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
near(bounds.rear.half*2,107);near(bounds.rear.top-bounds.rear.bottom,80);near(bounds.rear.rt,10);near(bounds.front.rb,10);
near(bounds.accent.half*2,85);near(bounds.accent.top-bounds.accent.bottom,55);near(bounds.accent.rt*2,6);
near(bounds.rear.top-bounds.accent.top,15.5);near(bounds.accent.top-bounds.front.top,16);near(bounds.front.top-bounds.front.bottom,48.5);
for(const part of ['rear','accent','front']){
 const b=bounds[part],ring=popRing(part);near(Math.max(...ring.map(p=>p.x))/MM,b.half);near(Math.max(...ring.map(p=>p.y))/MM,b.top);
 for(const back of [true,false]){const g=popSurface(part,back),original=g.attributes.position.array.slice();for(const v of original)assert.ok(Number.isFinite(v));popSetPressed(g,true);assert.ok(original.some((v,i)=>v!==g.attributes.position.array[i]));popSetPressed(g,false);for(let i=0;i<original.length;i++)near(original[i],g.attributes.position.array[i]);
 const edges=new Map(),ind=g.index.array;for(let i=0;i<ind.length;i+=3)for(let j=0;j<3;j++){const a=ind[i+j],c=ind[i+(j+1)%3],key=[Math.min(a,c),Math.max(a,c)].join(':');edges.set(key,(edges.get(key)||0)+1)}
 assert.equal([...edges.values()].filter(n=>n===1).length,ring.length,'Only the perimeter is open');assert.ok([...edges.values()].every(n=>n<=2),'Nonmanifold face');g.dispose()}
 for(let y=b.bottom+4;y<b.top-4;y+=2)for(let x=-b.half+4;x<b.half-4;x+=2)near((popSurfaceZ(part,x*MM,y*MM)-popSurfaceZ(part,x*MM,y*MM,true))/MM,1);
 const coat=popEdge(part);assert.ok(coat.userData.fullPerimeter);for(const v of coat.attributes.position.array)assert.ok(Number.isFinite(v));coat.dispose();
}
// At their overlap, each bonded pair remains separate and the two pockets open at their mouths.
for(let y=-30;y<8.5;y++)for(let x=-38;x<38;x++){
 assert.ok(popSurfaceZ('accent',x*MM,y*MM,true)>=popSurfaceZ('rear',x*MM,y*MM)-1e-9);
 assert.ok(popSurfaceZ('front',x*MM,y*MM,true)>=popSurfaceZ('accent',x*MM,y*MM)-1e-9);
}
const seam=popStitches(),ys=seam.sideHolesMM;const below=ys.filter(y=>y<8.5).at(-1),above=ys.find(y=>y>8.5);near((below+above)/2,8.5);near(above-below,3.38);
for(let i=1;i<ys.length;i++)near(ys[i]-ys[i-1],3.38);
assert.equal(seam.curves.filter(c=>c.kind==='edge-bridge').length,2);
for(const c of seam.curves.filter(c=>c.kind==='edge-bridge'))for(const p of c.points)if(p.y<=bounds.front.top*MM&&Math.abs(p.y-bounds.front.top*MM)<1*MM)assert.ok(p.z>=popSurfaceZ('front',p.x,p.y)-.005*MM,'Thread intersects the lower lip');
assert.equal(popPalettes.epsom.length,17);assert.equal(popPalettes.evercolor.length,9);assert.equal(new Set(popPalettes.epsom.map(c=>c.id)).size,17);
console.log('PASS: Pop 107×80, middle 85×55/R3, lower 48.5 mm; three 1 mm bonded pairs; independent full edge coats; connected faces; no layer intersections; 3.38 mm side pitch; mouth centred between holes on both sides; 17/9 material colors.');
