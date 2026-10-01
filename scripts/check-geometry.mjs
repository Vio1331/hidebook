import assert from 'node:assert/strict';
import {CARD_WIDTH_MM,CARD_HEIGHT_MM,MM,HALF,BOTTOM,BODY_TOP,BOTTOM_RADIUS,LAYER,CREASE_WIDTH,CREASE_INSET,THREAD_DIAMETER,STITCH_PITCH,STITCH_INSET,outline,makeLeatherSurface,seamPath,topDistance} from '../dist/leather-geometry.js';
const near=(a,b,t=1e-4)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
near(CARD_WIDTH_MM,107);near(CARD_HEIGHT_MM,70);near(BOTTOM_RADIUS/MM,10);near(LAYER/MM,1);near(CREASE_WIDTH/MM,.2);near(CREASE_INSET/MM,2);near(THREAD_DIAMETER/MM,.45);near(STITCH_PITCH/MM,3.38);near(STITCH_INSET/MM,3);
const g=makeLeatherSurface(BODY_TOP,0,false);g.computeBoundingBox();near(g.boundingBox.max.x-g.boundingBox.min.x,107*MM);near(g.boundingBox.max.y-g.boundingBox.min.y,70*MM);
for(const a of g.attributes.position.array)assert.ok(Number.isFinite(a));
const points=outline(BODY_TOP).getPoints(120);near(Math.min(...points.map(p=>p.y)),BOTTOM);near(Math.max(...points.map(p=>p.x)),HALF);near(Math.max(...points.map(p=>p.y)),BODY_TOP);
near(topDistance(0,BODY_TOP-2*MM,BODY_TOP)/MM,2);
const p=seamPath();for(let i=0;i<=100;i++){const v=p.getPointAt(i/100);assert.ok(Math.abs(v.x)<=HALF-3*MM+1e-6);assert.ok(v.y>=BOTTOM+3*MM-1e-6)}
console.log('PASS: 107 × 70 mm, R10, 1 mm layers, straight slot edges, 0.2/2 mm crease, 0.45/3/3.38 mm seam.');
