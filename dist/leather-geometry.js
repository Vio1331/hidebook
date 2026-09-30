import * as THREE from 'three';
export const CARD_WIDTH_MM=107;
export const CARD_HEIGHT_MM=70;
export const MM=3.5/CARD_WIDTH_MM;
export const LAYER=MM;
export const CREASE_INSET=3*MM;
export const CREASE_WIDTH=MM;
export const BOTTOM=-1.14;
export const BODY_TOP=BOTTOM+CARD_HEIGHT_MM*MM;
const HALF=CARD_WIDTH_MM*MM/2;
function insideDistance(x,y,top){
 let d=Math.min(HALF-Math.abs(x),y-BOTTOM,top-y);
 if(y<BOTTOM+.20&&Math.abs(x)>HALF-.20)d=.20-Math.hypot(Math.abs(x)-(HALF-.20),y-(BOTTOM+.20));
 return Math.max(0,d);
}
export function makeLeatherSurface(top,z,back=false){
 const xs=[],ys=[];
 for(let i=0;i<=224;i++)xs.push(-HALF+2*HALF*i/224);
 for(let j=0;j<=150;j++)ys.push(BOTTOM+(top-BOTTOM)*j/150);
 // Explicit vertices resolve the pressed line all the way to the cut edge.
 for(const delta of [-CREASE_WIDTH/2,0,CREASE_WIDTH/2]){xs.push(-HALF+CREASE_INSET+delta,HALF-CREASE_INSET+delta);ys.push(BOTTOM+CREASE_INSET+delta,top-CREASE_INSET+delta)}
 const X=[...new Set(xs)].sort((a,b)=>a-b),Y=[...new Set(ys)].sort((a,b)=>a-b),positions=[],uv=[],rest=[];
 for(const y of Y){let half=HALF;if(y<BOTTOM+.2)half=HALF-.2+Math.sqrt(Math.max(0,.2**2-(y-BOTTOM-.2)**2));if(y>top-.035)half=HALF-.035+Math.sqrt(Math.max(0,.035**2-(y-top+.035)**2));for(const original of X){const x=original*half/HALF;positions.push(x,y,z);uv.push((x+2.4)/4.8,(y+2.4)/4.8);rest.push(x,y,insideDistance(x,y,top))}}
 const nx=X.length,indices=[];for(let j=0;j<Y.length-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;if(back)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c)}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.userData={rest,z,back,top,indices};return geo;
}
export function updateLeatherSurface(geo,_field,style){
 const {rest,z,back,top,indices}=geo.userData,pos=geo.attributes.position,sign=back?-1:1;
 // Grain is resolved once by the physical-scale normal map. Sampling it again
 // on this coarser mesh aliases the pores and doubles the apparent relief.
 const distance=(x,y,d)=>Math.min(Math.abs(d-CREASE_INSET),Math.abs(top-y-CREASE_INSET));
 for(let i=0;i<pos.count;i++){const x=rest[i*3],y=rest[i*3+1],d=rest[i*3+2],line=distance(x,y,d);const bevel=.003*(1-Math.min(1,d/.006))**2;const lineProfile=Math.max(0,1-line/(CREASE_WIDTH/2));const groove=style==='single'?.003*lineProfile*lineProfile:0;const loft=.0035*Math.sin(Math.PI*(x+HALF)/(2*HALF))**2*Math.sin(Math.PI*(y-BOTTOM)/(top-BOTTOM))**2;pos.setZ(i,z+sign*(-bevel+loft-groove))}
 const surface=[],crease=[],smoothBorder=[];
 for(let i=0;i<indices.length;i+=3){let x=0,y=0,d=0;for(let j=0;j<3;j++){const k=indices[i+j];x+=rest[k*3]/3;y+=rest[k*3+1]/3;d+=rest[k*3+2]/3}let dest=surface;if(style==='single'){if(d<CREASE_INSET-CREASE_WIDTH/2)dest=smoothBorder;else if(distance(x,y,d)<=CREASE_WIDTH/2)dest=crease}dest.push(indices[i],indices[i+1],indices[i+2])}
 geo.setIndex([...surface,...crease,...smoothBorder]);geo.clearGroups();geo.addGroup(0,surface.length,0);if(crease.length)geo.addGroup(surface.length,crease.length,1);if(smoothBorder.length)geo.addGroup(surface.length+crease.length,smoothBorder.length,2);
 pos.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
}
