import assert from 'node:assert/strict';
import {MM,HALF,BOTTOM,BODY_TOP,PART_TOP,PART_Z,LAYER,CREASE_INSET,CREASE_WIDTH,THREAD_DIAMETER,STITCH_PITCH,makeLeatherSurface,foldedTopGeometry,surfaceZ,openingOffset,setPressedGeometry,stitchSegments,slotTop} from '../dist/leather-geometry.js';
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
near(HALF*2/MM,107);near((BODY_TOP-BOTTOM)/MM,70);near(LAYER/MM,1);near(CREASE_INSET/MM,2);near(CREASE_WIDTH/MM,.28);near(THREAD_DIAMETER/MM,.45);
for(const p of ['rear','body','accent','front']){
 const g=makeLeatherSurface(p);for(const a of g.attributes.position.array)assert.ok(Number.isFinite(a));
 const original=g.attributes.position.array.slice();setPressedGeometry(g,true);assert.ok(original.some((a,i)=>a!==g.attributes.position.array[i]));setPressedGeometry(g,false);for(let i=0;i<original.length;i++)near(original[i],g.attributes.position.array[i]);
 // Straight top lips, including the midpoint, with no U-shaped sag.
 near(slotTop(0,PART_TOP[p]),slotTop(HALF,PART_TOP[p]));
 const fold=foldedTopGeometry(p),positions=fold.attributes.position.array;
 for(let i=0;i<positions.length;i+=3){const x=positions[i],y=positions[i+1],z=positions[i+2],yc=slotTop(x,PART_TOP[p])-.5*MM,zc=PART_Z[p]+.5*MM+openingOffset(p,x,yc);near(Math.hypot(y-yc,z-zc)/MM,.5,.00002)}
 // A connected disk has only its outer boundary: no exposed internal edges.
 const indices=g.index.array,edges=new Map();
 for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){const a=indices[i+j],b=indices[i+(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1)}
 const boundary=[...edges].filter(([,n])=>n===1);
 assert.equal(boundary.length,726,'Only the outer contour may have unpaired edges');
 for(const [key] of boundary){const [a,b]=key.split(':').map(Number);assert.ok(a<726&&b<726,'An interior seam is open')}
 g.dispose();fold.dispose();
}
// Validate no overlap between individual solids across the usable planar domain.
let gaps=0;
for(let y=BOTTOM+4*MM;y<BODY_TOP-.6*MM;y+=.7*MM)for(let x=-HALF+4*MM;x<HALF-4*MM;x+=.7*MM){
 const visible=['rear','body','accent','front'].filter(p=>y<slotTop(x,PART_TOP[p])-.6*MM);
 for(let i=1;i<visible.length;i++){const back=surfaceZ(visible[i],x,y,true,false),previous=surfaceZ(visible[i-1],x,y,false,false);assert.ok(back>=previous-1e-7,`${visible[i]} intersects ${visible[i-1]}`)}gaps++;
}
assert.ok(openingOffset('body',0,BODY_TOP)/MM>1.8);near(openingOffset('body',HALF-3*MM,BODY_TOP),0);
const seam=stitchSegments();assert.equal(seam.count,68);assert.equal(seam.segments.filter(s=>s.backstitch).length,4);assert.ok(Math.abs(seam.pitchMM-STITCH_PITCH/MM)<.03);
assert.ok(seam.segments[2].b.x<seam.segments[2].a.x,'Left seam must rise to the right');
console.log(`PASS: four separate solids; ${gaps} nonintersection samples; folded R0.5mm lips; real crease; ${seam.count} continuous stitches, ${seam.pitchMM.toFixed(3)}mm pitch, two return stitches per corner.`);
