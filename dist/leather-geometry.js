import * as THREE from 'three';

export const CARD_WIDTH_MM=107;
export const CARD_HEIGHT_MM=70;
export const MM=3.5/CARD_WIDTH_MM;
export const LAYER=MM;
export const CREASE_INSET=2*MM;
export const CREASE_WIDTH=1*MM;
export const STITCH_INSET=3*MM;
export const BOTTOM=-1.14;
export const BODY_TOP=BOTTOM+CARD_HEIGHT_MM*MM;
export const HALF=CARD_WIDTH_MM*MM/2;
export const BOTTOM_RADIUS=10*MM;
export const POCKET_SAG=4*MM;

export function topAt(x,top,curvedTop=false){
 if(!curvedTop)return top;
 const t=Math.max(0,Math.min(1,(x+HALF)/(2*HALF)));
 return top-4*POCKET_SAG*t*(1-t);
}

function insideDistance(x,y,top,curvedTop){
 let d=Math.min(HALF-Math.abs(x),y-BOTTOM,topAt(x,top,curvedTop)-y);
 if(y<BOTTOM+BOTTOM_RADIUS&&Math.abs(x)>HALF-BOTTOM_RADIUS)d=BOTTOM_RADIUS-Math.hypot(Math.abs(x)-(HALF-BOTTOM_RADIUS),y-(BOTTOM+BOTTOM_RADIUS));
 return Math.max(0,d);
}

export function makeLeatherSurface(top,z,back=false,curvedTop=false){
 const xs=[],rows=[];
 for(let i=0;i<=224;i++)xs.push(-HALF+2*HALF*i/224);
 for(let j=0;j<=150;j++)rows.push(j/150);
 // Extra samples keep the 1 mm decorative groove crisp at its 2 mm inset.
 for(const delta of [-CREASE_WIDTH/2,0,CREASE_WIDTH/2]){
  xs.push(-HALF+CREASE_INSET+delta,HALF-CREASE_INSET+delta);
  rows.push((CREASE_INSET+delta)/(top-BOTTOM),1-(CREASE_INSET+delta)/(top-BOTTOM));
 }
 const X=[...new Set(xs)].sort((a,b)=>a-b),T=[...new Set(rows)].sort((a,b)=>a-b),positions=[],uv=[],rest=[];
 for(const row of T){
  for(const original of X){
   const localTop=topAt(original,top,curvedTop),rawY=BOTTOM+(localTop-BOTTOM)*row;
   let half=HALF;
   if(rawY<BOTTOM+BOTTOM_RADIUS)half=HALF-BOTTOM_RADIUS+Math.sqrt(Math.max(0,BOTTOM_RADIUS**2-(rawY-BOTTOM-BOTTOM_RADIUS)**2));
   const x=original*half/HALF,y=BOTTOM+(topAt(x,top,curvedTop)-BOTTOM)*row;
   positions.push(x,y,z);uv.push((x+2.4)/4.8,(y+2.4)/4.8);rest.push(x,y,insideDistance(x,y,top,curvedTop));
  }
 }
 const nx=X.length,indices=[];
 for(let j=0;j<T.length-1;j++)for(let i=0;i<nx-1;i++){
  const a=j*nx+i,b=a+1,c=a+nx,d=c+1;
  if(back)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.userData={rest,z,back,top,curvedTop,indices};return geo;
}

export function updateLeatherSurface(geo,_field,style){
 const {rest,z,back,top,curvedTop,indices}=geo.userData,pos=geo.attributes.position,sign=back?-1:1;
 const distance=(x,y,d)=>Math.min(Math.abs(d-CREASE_INSET),Math.abs(topAt(x,top,curvedTop)-y-CREASE_INSET));
 for(let i=0;i<pos.count;i++){
  const x=rest[i*3],y=rest[i*3+1],d=rest[i*3+2],line=distance(x,y,d);
  const bevel=.003*(1-Math.min(1,d/.006))**2,lineProfile=Math.max(0,1-line/(CREASE_WIDTH/2));
  const groove=style==='single'?.003*lineProfile*lineProfile:0;
  const loft=.0035*Math.sin(Math.PI*(x+HALF)/(2*HALF))**2*Math.sin(Math.PI*(y-BOTTOM)/(topAt(x,top,curvedTop)-BOTTOM))**2;
  pos.setZ(i,z+sign*(-bevel+loft-groove));
 }
 const surface=[],crease=[],smoothBorder=[];
 for(let i=0;i<indices.length;i+=3){
  let x=0,y=0,d=0;for(let j=0;j<3;j++){const k=indices[i+j];x+=rest[k*3]/3;y+=rest[k*3+1]/3;d+=rest[k*3+2]/3}
  let dest=surface;if(style==='single'){if(d<CREASE_INSET-CREASE_WIDTH/2)dest=smoothBorder;else if(distance(x,y,d)<=CREASE_WIDTH/2)dest=crease}dest.push(indices[i],indices[i+1],indices[i+2]);
 }
 geo.setIndex([...surface,...crease,...smoothBorder]);geo.clearGroups();geo.addGroup(0,surface.length,0);if(crease.length)geo.addGroup(surface.length,crease.length,1);if(smoothBorder.length)geo.addGroup(surface.length+crease.length,smoothBorder.length,2);
 pos.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
}
