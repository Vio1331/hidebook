import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {MM,LAYER,HALF,BOTTOM,BODY_TOP,PART_TOP,PART_Z,ATLAS_MM,CREASE_INSET,STITCH_INSET,THREAD_DIAMETER,slotTop,makeLeatherSurface,setPressedGeometry,foldedTopGeometry,seamPath,stitchSegments,ringPoints,surfaceZ,seamSurfaceZ} from './leather-geometry.js?v=20261002j';
import {loadPhotoMaterials,leatherSpecs} from './photo-materials.js?v=20261002h';
import {seamCurves,linenGeometry,edgePaintGeometry,LINEN_PLIES} from './leather-details.js?v=20261002j';
import {createStudioLighting,createStudioEnvironment} from './studio-lighting.js?v=20261002i';
import {createCustomizationSheet} from './customization-sheet.js?v=20261002k';
const $=s=>document.querySelector(s);
const palette=[{id:'black',name:'黑色',hex:'#363634'},{id:'craie',name:'粉笔白',hex:'#dacdbb'},{id:'gold',name:'金色',hex:'#8c5732'},{id:'caramel',name:'焦糖色',hex:'#ae7238'},{id:'etoupe',name:'大象灰',hex:'#736154'}];
const foilColors=[{id:'gold',name:'金色',hex:'#e3bd60'},{id:'silver',name:'银色',hex:'#c7ccd1'},{id:'heat',name:'热压',hex:null}];
const DEFAULT_VIEW_DISTANCE=9;
const MIN_VIEW_DISTANCE=5.8;
const threads=palette;
const parts=[{id:'rear',name:'底皮'},{id:'body',name:'钞位'},{id:'accent',name:'卡位'},{id:'front',name:'下卡位'}];
const steps=[...parts,{id:'thread',name:'缝线'},{id:'edge',name:'边油'},{id:'crease',name:'边缘装饰线'},{id:'monogram',name:'烫金文字'}];
const initial={rearMaterial:'epsom',bodyMaterial:'epsom',accentMaterial:'epsom',frontMaterial:'epsom',rear:'black',body:'black',accent:'black',front:'black',edge:'black',thread:'craie',crease:'single',monogram:'',foil:'gold'};
let state={...initial},activeStep=0,renderer,scene,camera,controls,root,studio,materialMaps,fontData,ready=false,cameraMotion=null,partHighlight=null,needsRender=true;
const meshes={},leatherMaterials={},threadObjects=[],letterGroup=new THREE.Group();
const color=(id,list=palette)=>list.find(c=>c.id===id);
const spec=id=>leatherSpecs.find(l=>l.id===id);
const current=()=>steps[activeStep];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function materialCard(l){return `<article class="material-card"><img src="./materials/baked/${l.id}-sample.jpg?v=${['togo','evercolor','swift'].includes(l.id)?'20261002h':'20261002d'}" alt="${l.name} 皮纹"><header><h3>${l.name}</h3><span>${l.kind}</span></header><dl><dt>外观</dt><dd>${l.appearance}</dd><dt>触感</dt><dd>${l.touch}</dd><dt>手感</dt><dd>${l.feel}</dd><dt>使用</dt><dd>${l.aging}</dd></dl></article>`}
function swatches(id,list){return `<div class="swatches" role="group" aria-label="${current().name}颜色">${list.map(c=>`<button class="swatch" data-color="${c.id}" style="--swatch:${c.hex}" aria-label="${c.name}" aria-pressed="${state[id]===c.id}"><span class="color-disc"></span><span class="color-caption">${c.name}</span></button>`).join('')}</div>`}
$('#part-menu').innerHTML=steps.map((s,i)=>`<button data-step="${i}" aria-current="false">${s.name}</button>`).join('');
function closeMenu(){$('#part-menu').hidden=true;$('#menu-toggle').setAttribute('aria-expanded','false')}
$('#menu-toggle').onclick=()=>{const open=$('#part-menu').hidden;$('#part-menu').hidden=!open;$('#menu-toggle').setAttribute('aria-expanded',String(open))};
document.addEventListener('click',e=>{if(!e.target.closest('#part-menu,#menu-toggle'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>selectStep(+b.dataset.step));
$('#prev-part').onclick=()=>selectStep(Math.max(0,activeStep-1));$('#next-part').onclick=()=>selectStep(Math.min(steps.length-1,activeStep+1));
function selectStep(index){activeStep=index;closeMenu();renderOptions();focusPart(current().id);highlightPart(current().id)}
function renderOptions(){
 const {id,name}=current(),part=parts.some(p=>p.id===id);$('#part-title').textContent=name;
 $('#prev-part').disabled=activeStep===0;$('#next-part').disabled=activeStep===steps.length-1;
 document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-current',String(+b.dataset.step===activeStep)));
 if(part){$('#options').innerHTML=`<div class="leather-options" role="group" aria-label="${name}皮料">${leatherSpecs.map(l=>`<div class="leather-option"><button class="leather-button" data-material="${l.id}" aria-pressed="${state[id+'Material']===l.id}">${l.name}</button>${materialCard(l)}<button class="material-info-button" data-info="${l.id}" aria-label="查看 ${l.name} 皮料信息">详情</button></div>`).join('')}</div>${swatches(id,palette)}`}
 else if(id==='thread'||id==='edge')$('#options').innerHTML=`<div class="leather-options"><button class="leather-button fixed-option" aria-pressed="true" aria-label="${id==='thread'?'高品质亚麻手缝线':'意大利 FENICE 边油'}">${id==='thread'?'高品质亚麻手缝线':'意大利 FENICE 边油'}</button></div>${swatches(id,id==='thread'?threads:palette)}`;
 else if(id==='crease')$('#options').innerHTML=`<div class="detail-options" role="group" aria-label="边缘装饰线"><button class="leather-button choice" data-crease="single" aria-pressed="${state.crease==='single'}">有</button><button class="leather-button choice" data-crease="none" aria-pressed="${state.crease==='none'}">无</button></div>`;
 else $('#options').innerHTML=`<div class="input-wrap"><input id="monogram" aria-label="烫金文字，最多7个英文或数字" maxlength="7" pattern="[A-Za-z0-9]*" autocomplete="off" spellcheck="false" value="${state.monogram}" placeholder="支持输入英文 / 数字"></div>${swatches('foil',foilColors.map(c=>({...c,hex:c.hex||color(state.front).hex})))}`;
 document.querySelectorAll('[data-material]').forEach(b=>b.onclick=()=>{state[id+'Material']=b.dataset.material;document.querySelectorAll('[data-material]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));applyMaterials(id)});
 function showMaterialInfo(id){$('#material-dialog-content').innerHTML=materialCard(spec(id));$('#material-dialog-content h3').id='material-dialog-title';$('#material-dialog').showModal()}
 document.querySelectorAll('[data-info]').forEach(b=>b.onclick=()=>showMaterialInfo(b.dataset.info));
 document.querySelectorAll('[data-material]').forEach(b=>{let press=null,opened=false;b.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){opened=false;press=setTimeout(()=>{opened=true;showMaterialInfo(b.dataset.material)},500)}});for(const event of ['pointerup','pointercancel','pointerleave'])b.addEventListener(event,()=>clearTimeout(press));b.addEventListener('click',e=>{if(opened){e.stopImmediatePropagation();opened=false}},true)});
 document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{state[id==='monogram'?'foil':id]=b.dataset.color;document.querySelectorAll('[data-color]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));applyMaterials(id==='monogram'?'foil':id)});
 document.querySelectorAll('[data-crease]').forEach(b=>b.onclick=()=>{state.crease=b.dataset.crease;needsRender=true;document.querySelectorAll('[data-crease]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));for(const m of Object.values(meshes))m.children.filter(x=>x.userData.surface).forEach(x=>setPressedGeometry(x.geometry,state.crease==='single'))});
 const input=$('#monogram');
 if(input){input.onfocus=()=>input.placeholder='';input.onblur=()=>input.placeholder='支持输入英文 / 数字';input.oninput=e=>{const value=e.target.value.replace(/[^a-zA-Z0-9]/g,'').slice(0,7);state.monogram=value;e.target.value=value;updateLetters()}}
}
for(const d of document.querySelectorAll('dialog')){d.querySelector('.close-dialog').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,2300)}
$('#reset-all').onclick=()=>{state={...initial};applyMaterials();for(const m of Object.values(meshes))m.children.filter(x=>x.userData.surface).forEach(x=>setPressedGeometry(x.geometry,true));selectStep(0);resetView()};
function orderRows(config=state){
 const hasText=!!config.monogram,baseCents=24900,stampCents=hasText?5000:0,money=cents=>'¥'+(cents/100).toFixed(2);
 const rows=[{label:'基础价格',value:'',amount:money(baseCents)}];
 rows.push(...parts.map(p=>({label:p.name,value:`${color(config[p.id]).name} · ${spec(config[p.id+'Material']).name}`,hex:color(config[p.id]).hex})));
 rows.push({label:'缝线',value:color(config.thread).name,hex:color(config.thread).hex},{label:'边油',value:color(config.edge).name,hex:color(config.edge).hex},{label:'边缘装饰线',value:config.crease==='none'?'无':'有',hex:null},{label:'烫金文字',value:hasText?`${color(config.foil,foilColors).name} · ${config.monogram}`:'无',hex:hasText?(config.foil==='heat'?'#'+new THREE.Color(color(config.front).hex).multiplyScalar(.5).getHexString():color(config.foil,foilColors).hex):null,amount:hasText?'+'+money(stampCents):null},{label:'总价',value:'',amount:money(baseCents+stampCents),total:true});return rows;
}
function captureOrderViews(){
 clearPartHighlight();const size=renderer.getSize(new THREE.Vector2()),pixelRatio=renderer.getPixelRatio(),view=new THREE.PerspectiveCamera(32,4/3,.08,50),images=[];
 try{
  renderer.setPixelRatio(1);renderer.setSize(760,570,false);
  for(const side of [1,-1]){view.position.set(0,0,5.8*side);view.lookAt(0,0,0);studio.update(view);renderer.render(scene,view);images.push(renderer.domElement.toDataURL('image/png'))}
 }finally{renderer.setSize(size.x,size.y,false);renderer.setPixelRatio(pixelRatio);studio.update();renderer.render(scene,camera);needsRender=true}
 return images;
}
let orderImageURL=null;
$('#save-design').onclick=async()=>{
 if(!ready)return;const config={...state},rows=orderRows(config),dialog=$('#design-dialog'),status=$('#order-status'),image=$('#order-image');
 try{localStorage.setItem('hidebook-design',JSON.stringify(config))}catch{}
 $('#save-design').disabled=true;$('#download-design').disabled=true;image.hidden=true;status.textContent='正在生成';status.hidden=false;dialog.showModal();
 try{
  const [front,back]=captureOrderViews(),blob=await createCustomizationSheet({front,back,rows});if(orderImageURL)URL.revokeObjectURL(orderImageURL);orderImageURL=URL.createObjectURL(blob);
  image.src=orderImageURL;image.alt='hidebook 定制单；'+rows.map(r=>r.label+'：'+[r.value,r.amount].filter(Boolean).join(' ')).join('；');image.hidden=false;status.hidden=true;$('#download-design').disabled=false;
 }catch(error){console.error(error);status.textContent='图片生成失败，请关闭后重试'}finally{$('#save-design').disabled=false}
};
$('#download-design').onclick=()=>{if(!orderImageURL)return;const a=document.createElement('a');a.href=orderImageURL;a.download='hidebook-customization.png';a.click()};
renderOptions();
// Geometry authoring uses mm; the renderer uses a fixed conversion to world units.
function makePiece(part){
 const group=new THREE.Group(),material=new THREE.MeshPhysicalMaterial({color:color(state[part]).hex,metalness:0,ior:1.46,specularIntensity:.55,side:THREE.FrontSide});
 group.name=part;leatherMaterials[part]=material;
 for(const back of [false,true]){const face=new THREE.Mesh(makeLeatherSurface(part,back),material);face.name=part+(back?'-inside':'-face');face.userData.surface=true;setPressedGeometry(face.geometry,state.crease==='single');face.castShadow=face.receiveShadow=true;group.add(face)}
 const fold=new THREE.Mesh(foldedTopGeometry(part),material);fold.name=part+'-fold-R0.5mm';fold.castShadow=fold.receiveShadow=true;group.add(fold);root.add(group);meshes[part]=group;
}
const edgeMaterial=new THREE.MeshPhysicalMaterial({roughness:.42,clearcoat:.16,clearcoatRoughness:.36,side:THREE.DoubleSide});
function sealEdges(){const m=new THREE.Mesh(edgePaintGeometry(),edgeMaterial);m.name='single-continuous-edge-coat';root.add(m)}
const threadMaterial=new THREE.MeshStandardMaterial({roughness:.84});
const fiberData=new Uint8Array(256*128*4),fiberColor=new Uint8Array(256*128*4);
for(let y=0;y<128;y++)for(let x=0;x<256;x++){
 const a=2*Math.PI*LINEN_PLIES*(y/128-x/256),b=2*Math.PI*(y/128*9-x/256*3),i=(y*256+x)*4;
 const dx=.09*Math.cos(a)+.012*Math.cos(b),dy=.16*Math.cos(a)+.016*Math.cos(b),n=Math.sqrt(1+dx*dx+dy*dy);
 fiberData.set([128-dx/n*127,128-dy/n*127,128+127/n,255],i);
 const tone=220+20*Math.cos(a)+3*Math.sin(b);fiberColor.set([tone,tone,tone,255],i);
}
const fiberMap=new THREE.DataTexture(fiberData,256,128);fiberMap.wrapS=fiberMap.wrapT=THREE.RepeatWrapping;fiberMap.magFilter=THREE.LinearFilter;fiberMap.minFilter=THREE.LinearMipmapLinearFilter;fiberMap.generateMipmaps=true;fiberMap.needsUpdate=true;threadMaterial.normalMap=fiberMap;threadMaterial.normalScale.set(.8,.8);
const fiberAlbedo=new THREE.DataTexture(fiberColor,256,128);fiberAlbedo.wrapS=fiberAlbedo.wrapT=THREE.RepeatWrapping;fiberAlbedo.magFilter=THREE.LinearFilter;fiberAlbedo.minFilter=THREE.LinearMipmapLinearFilter;fiberAlbedo.generateMipmaps=true;fiberAlbedo.needsUpdate=true;threadMaterial.map=fiberAlbedo;
const holeMaterial=new THREE.MeshStandardMaterial({color:'#241d17',roughness:1});
function makeStitches(){
 const {curves,holes,count,pitchMM}=seamCurves(),positions=[],normals=[],uvs=[],indices=[];let offset=0;
 for(const c of curves){const g=linenGeometry(c.points);for(const v of g.attributes.position.array)positions.push(v);for(const v of g.attributes.normal.array)normals.push(v);for(const v of g.attributes.uv.array)uvs.push(v);for(const i of g.index.array)indices.push(i+offset);offset+=g.attributes.position.count;g.dispose()}
 const merged=new THREE.BufferGeometry();merged.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));merged.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));merged.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));merged.setIndex(indices);const m=new THREE.Mesh(merged,threadMaterial);m.name='continuous-saddle-seam-and-mouth-wraps';root.add(m);
 for(const back of [false,true]){
  const g=new THREE.SphereGeometry(.13*MM,6,4),mesh=new THREE.InstancedMesh(g,holeMaterial,holes.length),dummy=new THREE.Object3D();
  holes.forEach((p,i)=>{dummy.position.set(p.x,p.y,(back?surfaceZ('rear',p.x,p.y,true,false):seamSurfaceZ(p.x,p.y))+(back?-.012:.012)*MM);dummy.scale.set(1,.7,.25);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});root.add(mesh);
 }
 root.userData.seam={count,pitchMM,returnStitches:4,continuousTopWraps:curves.filter(c=>c.kind==='continuous-top-return').length,foldBridges:curves.filter(c=>c.kind==='fold-bridge').length,lowerReturnsPerSide:1,linenPlies:LINEN_PLIES,diameterMM:.45};
}
function glyphShapes(text,size){
 const all=[];let offset=0;
 for(const c of text){const glyph=fontData.glyphs[c];if(!glyph)continue;const p=new THREE.ShapePath(),a=glyph.o.split(' '),scale=size/fontData.resolution;let i=0;
  while(i<a.length){const cmd=a[i++],n=()=>Number(a[i++])*scale;
   if(cmd==='m'){const x=n(),y=n();p.moveTo(x+offset,y)}
   else if(cmd==='l'){const x=n(),y=n();p.lineTo(x+offset,y)}
   else if(cmd==='q'){const x=n(),y=n(),cx=n(),cy=n();p.quadraticCurveTo(cx+offset,cy,x+offset,y)}
   else if(cmd==='b'){const x=n(),y=n(),x1=n(),y1=n(),x2=n(),y2=n();p.bezierCurveTo(x1+offset,y1,x2+offset,y2,x+offset,y)}
  }all.push(...p.toShapes());offset+=(glyph.ha*scale+.22*MM);
 }return all;
}
const foilMaterial=new THREE.MeshPhysicalMaterial({color:'#e3bd60',metalness:1,roughness:.25,clearcoat:.14,envMapIntensity:1.35});
const stampWall=new THREE.MeshStandardMaterial({color:'#493721',roughness:.8,side:THREE.DoubleSide});
function offsetContour(points,d){
 const ps=points.filter((p,i)=>!i||p.distanceTo(points[i-1])>1e-8);if(ps[0].distanceTo(ps.at(-1))<1e-8)ps.pop();
 let area=0;for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];area+=a.x*b.y-b.x*a.y}
 const sign=area>0?1:-1;return ps.map((p,i)=>{const a=p.clone().sub(ps[(i-1+ps.length)%ps.length]).normalize(),b=ps[(i+1)%ps.length].clone().sub(p).normalize(),n1=new THREE.Vector2(a.y,-a.x).multiplyScalar(sign),n2=new THREE.Vector2(b.y,-b.x).multiplyScalar(sign),n=n1.clone().add(n2).normalize();return p.clone().addScaledVector(n,d/Math.max(.4,n.dot(n1)))})
}
function updateLetters(){
 if(!ready||!fontData)return;needsRender=true;
 for(const m of [...letterGroup.children]){m.geometry.dispose();letterGroup.remove(m)}
 if(!state.monogram){const face=meshes.front.children.find(m=>m.userData.surface&&!m.geometry.userData.back);if(face.userData.stamped){face.geometry.dispose();face.geometry=makeLeatherSurface('front');setPressedGeometry(face.geometry,state.crease==='single');face.userData.stamped=false}return;}
 const leather=leatherMaterials.front,finish=color(state.foil,foilColors),heat=state.foil==='heat';
 foilMaterial.color.copy(heat?leather.color:new THREE.Color(finish.hex));if(heat)foilMaterial.color.multiplyScalar(.50);
 foilMaterial.metalness=heat?0:1;foilMaterial.roughness=heat?leather.roughness:.32;foilMaterial.clearcoat=heat?0:.08;foilMaterial.envMapIntensity=heat?.72:1.15;
 foilMaterial.map=heat?leather.map:null;foilMaterial.normalMap=leather.normalMap;foilMaterial.normalScale.copy(leather.normalScale).multiplyScalar(.16);foilMaterial.roughnessMap=leather.roughnessMap;foilMaterial.needsUpdate=true;
 const shapes=glyphShapes(state.monogram,3.8*MM),g=new THREE.ExtrudeGeometry(shapes,{depth:.035*MM,bevelEnabled:true,bevelSize:.025*MM,bevelThickness:.018*MM,bevelSegments:2,curveSegments:10});g.computeBoundingBox();
 const width=g.boundingBox.max.x-g.boundingBox.min.x,x=HALF-9*MM-width-g.boundingBox.min.x,y=BOTTOM+11*MM-g.boundingBox.min.y;
 const stampDepth=.22*MM;
 // Cut actual glyph-shaped openings in the leather face, including counters.
 const rimPositions=[],rimIndices=[],translated=shapes.map(s=>{
  const shape=new THREE.Shape();
  function shoulder(path,d){
   const inner=path.getPoints(12).filter((p,i,a)=>!i||p.distanceTo(a[i-1])>1e-8);if(inner[0].distanceTo(inner.at(-1))<1e-8)inner.pop();
   const outer=offsetContour(inner,d),start=rimPositions.length/3;
   for(let i=0;i<inner.length;i++)for(const [p,depth] of [[outer[i],0],[inner[i],stampDepth]]){const px=p.x+x,py=p.y+y;rimPositions.push(px,py,surfaceZ('front',px,py)-depth)}
   for(let i=0;i<inner.length;i++){const k=start+2*i,j=start+2*((i+1)%inner.length);rimIndices.push(k,j,k+1,j,j+1,k+1)}
   return outer.map(p=>new THREE.Vector2(p.x+x,p.y+y));
  }
  const outer=shoulder(s,.11*MM);shape.setFromPoints(outer);shape.holes=s.holes.map(h=>new THREE.Path(shoulder(h,-.11*MM)));return shape;
 });
 const face=meshes.front.children.find(m=>m.userData.surface&&!m.geometry.userData.back);
 face.userData.stamped=true;face.geometry.dispose();face.geometry=makeLeatherSurface('front',false,translated);setPressedGeometry(face.geometry,state.crease==='single');
 const wallG=new THREE.BufferGeometry();wallG.setAttribute('position',new THREE.Float32BufferAttribute(rimPositions,3));wallG.setIndex(rimIndices);wallG.computeVertexNormals();
 stampWall.color.copy(leatherMaterials.front.color).multiplyScalar(.56);const walls=new THREE.Mesh(wallG,stampWall);walls.name='stamp-recess-beveled-leather-shoulders';letterGroup.add(walls);
 // Conform real metal glyph geometry to the subtly bowed leather surface.
 const positions=g.attributes.position.array;for(let i=0;i<positions.length;i+=3){positions[i]+=x;positions[i+1]+=y;positions[i+2]+=surfaceZ('front',positions[i],positions[i+1])-stampDepth+.015*MM}g.attributes.position.needsUpdate=true;
 // Preserve a shallow impression of the selected leather at the same atlas coordinates.
 const uv=g.attributes.uv.array;for(let i=0;i<positions.length/3;i++){uv[2*i]=positions[3*i]/(ATLAS_MM*MM)+.5-.04;uv[2*i+1]=positions[3*i+1]/(ATLAS_MM*MM)+.5+.06}g.attributes.uv.needsUpdate=true;g.computeVertexNormals();
 const m=new THREE.Mesh(g,[foilMaterial,stampWall]);m.name='Freeman-recessed-'+state.foil;m.castShadow=m.receiveShadow=true;letterGroup.add(m);
}
function applyMaterials(part=null){
 if(!ready)return;needsRender=true;
 for(const p of parts){if(part&&part!==p.id)continue;const l=spec(state[p.id+'Material']),m=leatherMaterials[p.id];m.color.set(color(state[p.id]).hex);Object.assign(m,materialMaps[l.id]);m.normalScale.set(...({epsom:[1.28,1.28],togo:[1.15,1.15],evercolor:[1.40,1.40],swift:[1.60,1.60],mysore:[1.25,1.25]}[l.id]||[1,1]));m.roughness=l.roughness;m.specularIntensity=l.id==='epsom'?.42:l.id==='swift'?.40:l.id==='mysore'?1:l.id==='evercolor'?.95:l.id==='togo'?.50:.55;m.envMapIntensity=l.id==='epsom'?.62:l.id==='swift'?.60:l.id==='mysore'?1.05:l.id==='evercolor'?1.10:l.id==='togo'?.66:.72;m.clearcoat=l.id==='swift'?.015:0;m.clearcoatRoughness=.5;m.needsUpdate=true}
 edgeMaterial.color.set(color(state.edge).hex);threadMaterial.color.set(color(state.thread,threads).hex).multiplyScalar(.85);updateLetters();
}
// Presets follow an arc at the current radius, never the chord through the model.
function moveCamera(pos,target=[0,0,0]){
 if(!ready)return;
 const from=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)),to=new THREE.Spherical().setFromVector3(new THREE.Vector3(...pos).sub(new THREE.Vector3(...target)));
 cameraMotion={start:performance.now(),phi:from.phi,theta:from.theta,toPhi:to.phi,deltaTheta:THREE.MathUtils.euclideanModulo(to.theta-from.theta+Math.PI,Math.PI*2)-Math.PI,radius:from.radius,center:controls.target.clone(),duration:reducedMotion?0:650};
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));
}
function clearPartHighlight(){
 if(!partHighlight)return;for(const m of partHighlight.materials)m.emissiveIntensity=0;
 if(partHighlight.overlay){for(const line of partHighlight.overlay.children){line.geometry.dispose();line.material.dispose()}root.remove(partHighlight.overlay)}partHighlight=null;needsRender=true;
}
function highlightPart(id){
 if(!ready)return;clearPartHighlight();const materials=[],overlay=id==='crease'?new THREE.Group():null;
 if(overlay){
  for(const p of parts){const pts=ringPoints(PART_TOP[p.id],CREASE_INSET).map(q=>new THREE.Vector3(q.x,q.y,surfaceZ(p.id,q.x,q.y,false,state.crease==='single')+.012*MM));
   overlay.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false,toneMapped:false})))}root.add(overlay);
 }else{
  const material=leatherMaterials[id]||(id==='thread'?threadMaterial:id==='edge'?edgeMaterial:id==='monogram'&&state.monogram?foilMaterial:leatherMaterials.front);
  material.emissive.set('#ffffff');material.emissiveIntensity=0;materials.push(material);
 }
 partHighlight={id,start:null,settleAt:null,materials,overlay,duration:reducedMotion?350:1200};needsRender=true;
}
function focusPart(id){
 const preset={rear:{p:[-1.3,.65,-5.7],t:[0,.05,0]},body:{p:[1.0,2.1,5.6],t:[0,.38,0]},accent:{p:[.65,1.0,5.15],t:[0,.19,.07]},front:{p:[.8,.45,5.2],t:[0,-.26,.08]},thread:{p:[-.6,.25,4.8],t:[-.16,-.10,.07]},edge:{p:[4.4,1.4,4.2],t:[0,-.1,0]},crease:{p:[.5,.6,4.5],t:[0,-.1,0]},monogram:{p:[.55,-.24,3.25],t:[.57,-.51,.07]}}[id];moveCamera(preset.p,preset.t);
}
function resetView(){moveCamera([1.2,.8,6.0],[0,0,0])}
const views={front:[0,0,5.8],back:[0,0,-5.8],side:[6.2,3.5,2.1]};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{clearPartHighlight();moveCamera(views[b.dataset.view]);b.setAttribute('aria-pressed','true')});
function init(){
 const host=$('#scene');scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(32,1,.08,50);renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.toneMapping=THREE.LinearToneMapping;renderer.toneMappingExposure=.70;renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(renderer.domElement);
 scene.environment=createStudioEnvironment(renderer);studio=createStudioLighting(scene,camera);
 const key=studio.lights[0];key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-2.4;key.shadow.camera.right=2.4;key.shadow.camera.top=2;key.shadow.camera.bottom=-2;key.shadow.camera.near=.1;key.shadow.camera.far=16;key.shadow.bias=-.000035;key.shadow.normalBias=.0001;
 root=new THREE.Group();scene.add(root);parts.forEach(p=>makePiece(p.id));sealEdges();makeStitches();root.add(letterGroup);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;controls.minDistance=MIN_VIEW_DISTANCE;controls.maxDistance=DEFAULT_VIEW_DISTANCE;controls.rotateSpeed=.7;controls.zoomSpeed=1.0;
 controls.addEventListener('change',()=>{needsRender=true});
 controls.addEventListener('start',()=>{cameraMotion=null;clearPartHighlight();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'))});
 ready=true;applyMaterials();$('#save-design').disabled=false;camera.position.set(1.2,.8,6).normalize().multiplyScalar(DEFAULT_VIEW_DISTANCE);controls.update();
 function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.fov=w/h<1.1?THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(43)/2)/(w/h))):32;camera.updateProjectionMatrix();renderer.setSize(w,h);needsRender=true}new ResizeObserver(resize).observe(host);resize();
 host.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key))return;e.preventDefault();cameraMotion=null;clearPartHighlight();const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')s.theta-=.12;if(e.key==='ArrowRight')s.theta+=.12;if(e.key==='ArrowUp')s.phi-=.12;if(e.key==='ArrowDown')s.phi+=.12;if(['+','='].includes(e.key))s.radius-=.3;if(e.key==='-')s.radius+=.3;s.phi=Math.max(.05,Math.min(Math.PI-.05,s.phi));s.radius=Math.max(MIN_VIEW_DISTANCE,Math.min(DEFAULT_VIEW_DISTANCE,s.radius));camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(controls.target));controls.update()});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#loading').textContent='预览已中断，请刷新';$('#loading').hidden=false});$('#loading').hidden=true;
 function frame(){
  const now=performance.now();let changed=!!cameraMotion;
  if(cameraMotion){const a=cameraMotion,t=a.duration?Math.min(1,(now-a.start)/a.duration):1,u=t*t*(3-2*t);camera.position.setFromSpherical(new THREE.Spherical(a.radius,THREE.MathUtils.lerp(a.phi,a.toPhi,u),a.theta+a.deltaTheta*u)).add(a.center);controls.target.copy(a.center);if(t===1)cameraMotion=null}
  const controlsMoved=controls.update();changed=controlsMoved||changed;
  if(partHighlight){
   changed=true;const a=partHighlight;
   if(a.start===null){if(cameraMotion||controlsMoved)a.settleAt=null;else if(a.settleAt===null)a.settleAt=now;else if(now-a.settleAt>60)a.start=now}
   if(a.start!==null){
    const elapsed=now-a.start,fadeIn=reducedMotion?150:500,fadeOut=reducedMotion?200:700;
    const pulse=elapsed<fadeIn?THREE.MathUtils.smoothstep(elapsed,0,fadeIn):1-THREE.MathUtils.smoothstep(elapsed-fadeIn,0,fadeOut);
    for(const m of a.materials)m.emissiveIntensity=.20*pulse;if(a.overlay)for(const line of a.overlay.children)line.material.opacity=.85*pulse;
    if(elapsed>=a.duration)clearPartHighlight();
   }
  }
  if(changed||needsRender){studio.update();renderer.render(scene,camera);needsRender=false}
 }
 renderer.setAnimationLoop(frame);document.addEventListener('visibilitychange',()=>renderer.setAnimationLoop(document.hidden?null:frame));
 // A read-only diagnostics surface supports model QA without reaching into WebGL.
 window.hidebook={get configuration(){return {...state}},get model(){return {seam:root.userData.seam,renderCalls:renderer.info.render.calls,renderedFrames:renderer.info.render.frame,triangles:renderer.info.render.triangles,edgeCoats:root.children.filter(m=>m.name==='single-continuous-edge-coat').length,layers:parts.map(p=>({name:p.name,part:p.id,foldRadiusMM:.5,vertices:meshes[p.id].children[0].geometry.attributes.position.count})),atlasMM:ATLAS_MM}},get camera(){return {position:camera.position.toArray(),target:controls.target.toArray()}}};
}
try{[materialMaps,fontData]=await Promise.all([loadPhotoMaterials(THREE),fetch('./freeman.typeface.json').then(r=>{if(!r.ok)throw Error('Freeman 读取失败');return r.json()})]);init()}catch(e){console.error(e);$('#loading').textContent='预览加载失败，请刷新';}
