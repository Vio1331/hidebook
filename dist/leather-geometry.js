import * as THREE from './vendor/three.module.js';
export const CARD_WIDTH_MM=107, CARD_HEIGHT_MM=70;
export const MM=3.5/CARD_WIDTH_MM, LAYER=MM;
export const HALF=53.5*MM, BOTTOM=-35*MM, BODY_TOP=35*MM;
export const BOTTOM_RADIUS=10*MM, CREASE_INSET=2*MM, CREASE_WIDTH=.2*MM;
export const STITCH_INSET=3*MM, THREAD_DIAMETER=.45*MM, STITCH_PITCH=3.38*MM;
export const ACCENT_TOP=24*MM, FRONT_TOP=13*MM;
export const ATLAS_MM=140;
export function outline(top){
 const s=new THREE.Shape(),r=BOTTOM_RADIUS;
 s.moveTo(-HALF+r,BOTTOM);s.lineTo(HALF-r,BOTTOM);
 s.absarc(HALF-r,BOTTOM+r,r,-Math.PI/2,0,false);s.lineTo(HALF,top);
 s.lineTo(-HALF,top);
 s.lineTo(-HALF,BOTTOM+r);s.absarc(-HALF+r,BOTTOM+r,r,Math.PI,1.5*Math.PI,false);return s;
}
export function edgeDistance(x,y){
 if(y<BOTTOM+BOTTOM_RADIUS&&Math.abs(x)>HALF-BOTTOM_RADIUS)return BOTTOM_RADIUS-Math.hypot(Math.abs(x)-(HALF-BOTTOM_RADIUS),y-(BOTTOM+BOTTOM_RADIUS));
 return Math.min(HALF-Math.abs(x),y-BOTTOM);
}
export function topDistance(x,y,top){return top-y}
export function makeLeatherSurface(top,z,back=false){
 const positions=[],uv=[],rest=[],nx=217,ny=145;
 for(let j=0;j<ny;j++){
  const rawY=BOTTOM+(top-BOTTOM)*j/(ny-1),r=BOTTOM_RADIUS;
  const half=rawY<BOTTOM+r?HALF-r+Math.sqrt(Math.max(0,r*r-(rawY-BOTTOM-r)**2)):HALF;
  for(let i=0;i<nx;i++){
   const x=-half+2*half*i/(nx-1),base=BOTTOM+r;
   const y=rawY;
   const d=Math.max(0,Math.min(edgeDistance(x,y),topDistance(x,y,top)));
   const roll=.08*MM*(1-Math.min(1,d/(.2*MM)))**2;
   const loft=.07*MM*Math.sin(Math.PI*(x+HALF)/(2*HALF))**2*Math.sin(Math.PI*(y-BOTTOM)/(top-BOTTOM))**2;
   positions.push(x,y,z+(back?-1:1)*(loft-roll));uv.push(x/(ATLAS_MM*MM)+.5,y/(ATLAS_MM*MM)+.5);rest.push(x,y,d);
  }
 }
 const indices=[];for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;if(back)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();g.userData={top,z,back,rest};return g;
}
// U-shaped seam, measured on the centre of the thread. R10 becomes R7 at 3 mm.
export function seamPath(top=BODY_TOP-3*MM,inset=STITCH_INSET){
 const p=new THREE.Path(),l=-HALF+inset,r=HALF-inset,b=BOTTOM+inset,rad=BOTTOM_RADIUS-inset;
 p.moveTo(l,top);p.lineTo(l,b+rad);p.absarc(l+rad,b+rad,rad,Math.PI,1.5*Math.PI,false);p.lineTo(r-rad,b);p.absarc(r-rad,b+rad,rad,-Math.PI/2,0,false);p.lineTo(r,top);p.arcLengthDivisions=1600;return p;
}
export function applyPressedLine(material,top){
 material.userData.pressed={value:1};
 material.onBeforeCompile=shader=>{
  shader.uniforms.uPressed=material.userData.pressed;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vLeatherMM;').replace('#include <begin_vertex>',`#include <begin_vertex>\nvLeatherMM=position.xy/${MM.toFixed(12)};`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
  varying vec2 vLeatherMM;uniform float uPressed;
  float pressedDistance(){vec2 p=vLeatherMM;float d=min(53.5-abs(p.x),p.y+35.0);if(p.y < -25.0 && abs(p.x)>43.5)d=10.0-length(vec2(abs(p.x)-43.5,p.y+25.0));
   float t=${(top/MM).toFixed(9)}-p.y;
   return min(abs(d-2.0),abs(t-2.0));}
  float pressedMask(){return uPressed*(1.0-smoothstep(0.075,0.1,pressedDistance()));}
  `).replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=1.0-.20*pressedMask();').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor*=1.0-.13*pressedMask();');
 };
 material.customProgramCacheKey=()=>`pressed-${top}`;
}
