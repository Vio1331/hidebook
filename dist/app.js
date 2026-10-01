import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {MM,LAYER,HALF,BOTTOM,BODY_TOP,PART_TOP,PART_Z,ATLAS_MM,STITCH_INSET,THREAD_DIAMETER,slotTop,makeLeatherSurface,setPressedGeometry,foldedTopGeometry,seamPath,stitchSegments,surfaceZ,seamSurfaceZ} from './leather-geometry.js?v=20261002';
import {loadPhotoMaterials,leatherSpecs} from './photo-materials.js?v=20261002';
import {createStudioLighting,createStudioEnvironment} from './studio-lighting.js';
const $=s=>document.querySelector(s);
const palette=[{id:'forest',name:'森林绿',hex:'#18523c'},{id:'mustard',name:'芥末黄',hex:'#c7982f'},{id:'cognac',name:'干邑棕',hex:'#ae7048'},{id:'burgundy',name:'酒红',hex:'#763c43'},{id:'navy',name:'午夜蓝',hex:'#304657'},{id:'ivory',name:'燕麦白',hex:'#d8cfba'},{id:'black',name:'黑色',hex:'#222621'}];
const threads=[...palette,{id:'cream',name:'米白',hex:'#efe5cb'}];
const parts=[{id:'rear',name:'底皮'},{id:'body',name:'钞位'},{id:'accent',name:'卡位'},{id:'front',name:'下卡位'}];
const steps=[...parts,{id:'thread',name:'缝线'},{id:'edge',name:'边油'},{id:'crease',name:'边缘装饰线'},{id:'monogram',name:'烫金文字'}];
const initial={rearMaterial:'togo',bodyMaterial:'togo',accentMaterial:'epsom',frontMaterial:'togo',rear:'forest',body:'forest',accent:'mustard',front:'forest',edge:'forest',thread:'cream',crease:'single',monogram:''};
let state={...initial},activeStep=0,renderer,scene,camera,controls,root,studio,materialMaps,fontData,ready=false,cameraMotion=null,needsRender=true;
const meshes={},leatherMaterials={},threadObjects=[],letterGroup=new THREE.Group();
const color=(id,list=palette)=>list.find(c=>c.id===id);
const spec=id=>leatherSpecs.find(l=>l.id===id);
const current=()=>steps[activeStep];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function materialCard(l){return `<article class="material-card"><img src="./materials/baked/${l.id}-sample.jpg?v=20261002" alt="${l.name} 皮纹"><header><h3>${l.name}</h3><span>${l.kind}</span></header><dl><dt>外观</dt><dd>${l.appearance}</dd><dt>触感</dt><dd>${l.touch}</dd><dt>手感</dt><dd>${l.feel}</dd><dt>使用</dt><dd>${l.aging}</dd></dl></article>`}
function swatches(id,list){return `<div class="option-label">颜色<span id="color-name">${color(state[id],list).name}</span></div><div class="swatches" role="group" aria-label="${current().name}颜色">${list.map(c=>`<button class="swatch" data-color="${c.id}" data-name="${c.name}" style="--swatch:${c.hex}" aria-label="${c.name}" aria-pressed="${state[id]===c.id}"></button>`).join('')}</div>`}
$('#part-menu').innerHTML=steps.map((s,i)=>`<button data-step="${i}" aria-current="false">${s.name}<span>${String(i+1).padStart(2,'0')}</span></button>`).join('');
function closeMenu(){$('#part-menu').hidden=true;$('#menu-toggle').setAttribute('aria-expanded','false')}
$('#menu-toggle').onclick=()=>{const open=$('#part-menu').hidden;$('#part-menu').hidden=!open;$('#menu-toggle').setAttribute('aria-expanded',String(open))};
document.addEventListener('click',e=>{if(!e.target.closest('#part-menu,#menu-toggle'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>selectStep(+b.dataset.step));
$('#prev-part').onclick=()=>selectStep(Math.max(0,activeStep-1));$('#next-part').onclick=()=>selectStep(Math.min(steps.length-1,activeStep+1));
function selectStep(index){activeStep=index;closeMenu();renderOptions();focusPart(current().id)}
function renderOptions(){
 const {id,name}=current(),part=parts.some(p=>p.id===id);$('#part-title').textContent=name;$('#step-count').textContent=`${String(activeStep+1).padStart(2,'0')} / 08`;
 $('#prev-part').disabled=activeStep===0;$('#next-part').disabled=activeStep===steps.length-1;
 document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-current',String(+b.dataset.step===activeStep)));
 $('#options').classList.toggle('single',!part);
 if(part){$('#options').innerHTML=`<div><div class="option-label">皮料<span id="leather-name">${spec(state[id+'Material']).name}</span></div><div class="leather-options" role="group" aria-label="${name}皮料">${leatherSpecs.map(l=>`<div class="leather-option"><button class="leather-button" data-material="${l.id}" aria-pressed="${state[id+'Material']===l.id}"><img src="./materials/baked/${l.id}-sample.jpg?v=20261002" alt=""><span>${l.name}</span></button>${materialCard(l)}<button class="material-info-button" data-info="${l.id}" aria-label="查看 ${l.name} 皮料信息">详情</button></div>`).join('')}</div></div><div>${swatches(id,palette)}</div>`}
 else if(id==='thread'||id==='edge')$('#options').innerHTML=swatches(id,id==='thread'?threads:palette);
 else if(id==='crease')$('#options').innerHTML=`<div class="detail-options" role="group" aria-label="边缘装饰线"><button class="choice" data-crease="none" aria-pressed="${state.crease==='none'}">无</button><button class="choice" data-crease="single" aria-pressed="${state.crease==='single'}">单线</button></div>`;
 else $('#options').innerHTML=`<label class="option-label" for="monogram">烫金文字</label><div class="input-wrap"><input id="monogram" maxlength="7" pattern="[A-Za-z0-9]*" autocomplete="off" spellcheck="false" value="${state.monogram}" placeholder="VIO" aria-describedby="monogram-note"><span id="letter-count">${state.monogram.length} / 7</span></div><p class="input-note" id="monogram-note">英文或数字，最多 7 字</p>`;
 document.querySelectorAll('[data-material]').forEach(b=>b.onclick=()=>{state[id+'Material']=b.dataset.material;document.querySelectorAll('[data-material]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#leather-name').textContent=spec(b.dataset.material).name;applyMaterials(id)});
 document.querySelectorAll('[data-info]').forEach(b=>b.onclick=()=>{$('#material-dialog-content').innerHTML=materialCard(spec(b.dataset.info));$('#material-dialog-content h3').id='material-dialog-title';$('#material-dialog').showModal()});
 document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{state[id]=b.dataset.color;document.querySelectorAll('[data-color]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#color-name').textContent=color(state[id],threads).name;applyMaterials(id)});
 document.querySelectorAll('[data-crease]').forEach(b=>b.onclick=()=>{state.crease=b.dataset.crease;needsRender=true;document.querySelectorAll('[data-crease]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));for(const m of Object.values(meshes))m.children.filter(x=>x.userData.surface).forEach(x=>setPressedGeometry(x.geometry,state.crease==='single'))});
 if($('#monogram'))$('#monogram').oninput=e=>{const value=e.target.value.replace(/[^a-zA-Z0-9]/g,'').slice(0,7);state.monogram=value;e.target.value=value;$('#letter-count').textContent=`${value.length} / 7`;updateLetters()};
}
for(const d of document.querySelectorAll('dialog')){d.querySelector('.close-dialog').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,2300)}
$('#reset-all').onclick=()=>{state={...initial};applyMaterials();for(const m of Object.values(meshes))m.children.filter(x=>x.userData.surface).forEach(x=>setPressedGeometry(x.geometry,true));selectStep(0);resetView()};
function summaryRows(){return parts.map(p=>[p.name,`${spec(state[p.id+'Material']).name} · ${color(state[p.id]).name}`]).concat([['缝线',color(state.thread,threads).name],['边油',color(state.edge).name],['边缘装饰线',state.crease==='none'?'无':'单线'],['烫金文字',state.monogram||'无']])}
$('#save-design').onclick=()=>{try{localStorage.setItem('hidebook-design',JSON.stringify(state))}catch{}$('#design-summary').innerHTML=summaryRows().map(([a,b])=>`<div class="summary-row"><span>${a}</span><strong>${b}</strong></div>`).join('');$('#design-dialog').showModal()};
$('#download-design').onclick=()=>{const data={...state};const blob=new Blob([JSON.stringify({name:'Hidebook',configuration:data,selection:Object.fromEntries(summaryRows())},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='hidebook-design.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('设计已下载')};
try{const saved=JSON.parse(localStorage.getItem('hidebook-design'));if(saved&&typeof saved==='object'){for(const [k,v] of Object.entries(initial)){if(typeof saved[k]!=='string')continue;const valid=k.endsWith('Material')?leatherSpecs.map(x=>x.id):k==='crease'?['none','single']:k==='monogram'?null:(k==='thread'?threads:palette).map(x=>x.id);if(k==='monogram')state[k]=saved[k].replace(/[^a-zA-Z0-9]/g,'').slice(0,7);else if(valid.includes(saved[k]))state[k]=saved[k]}}}catch{}
renderOptions();
// Geometry authoring uses mm; the renderer uses a fixed conversion to world units.
function makePiece(part){
 const group=new THREE.Group(),material=new THREE.MeshPhysicalMaterial({color:color(state[part]).hex,metalness:0,ior:1.46,specularIntensity:.55,side:THREE.FrontSide});
 group.name=part;leatherMaterials[part]=material;
 for(const back of [false,true]){const face=new THREE.Mesh(makeLeatherSurface(part,back),material);face.name=part+(back?'-inside':'-face');face.userData.surface=true;setPressedGeometry(face.geometry,state.crease==='single');face.castShadow=face.receiveShadow=true;group.add(face)}
 const fold=new THREE.Mesh(foldedTopGeometry(part),material);fold.name=part+'-fold-R0.5mm';fold.castShadow=fold.receiveShadow=true;group.add(fold);root.add(group);meshes[part]=group;
}
const edgeMaterial=new THREE.MeshPhysicalMaterial({roughness:.42,clearcoat:.16,clearcoatRoughness:.36,side:THREE.DoubleSide});
function sealEdges(){
 const path=seamPath(BODY_TOP-.5*MM,0),p=[],ind=[],n=850,cross=10;
 for(let i=0;i<=n;i++){
  const q=path.getPointAt(i/n),t=path.getTangentAt(i/n),out=new THREE.Vector2(-t.y,t.x),front=seamSurfaceZ(q.x,q.y),back=surfaceZ('rear',q.x,q.y,true);
  for(let j=0;j<=cross;j++){const u=j/cross;p.push(q.x+out.x*Math.sin(u*Math.PI)*.035*MM,q.y+out.y*Math.sin(u*Math.PI)*.035*MM,back+(front-back)*u);if(i<n&&j<cross){const k=i*(cross+1)+j;ind.push(k,k+cross+1,k+1,k+1,k+cross+1,k+cross+2)}}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ind);g.computeVertexNormals();const m=new THREE.Mesh(g,edgeMaterial);m.name='side-and-bottom-edge-paint';m.castShadow=m.receiveShadow=true;root.add(m);
}
const threadMaterial=new THREE.MeshStandardMaterial({roughness:.72});
const holeMaterial=new THREE.MeshStandardMaterial({color:'#241d17',roughness:1});
function stitchZ(x,y,back){
 if(back)return surfaceZ('rear',x,y,true)-.1*MM;
 // A saddle thread spans the fold rather than terminating at the layer boundary.
 let z=surfaceZ('body',x,y);
 for(const part of ['accent','front']){const top=slotTop(x,PART_TOP[part]),u=THREE.MathUtils.smoothstep(top+.45*MM-y,0,1.05*MM);z=THREE.MathUtils.lerp(z,surfaceZ(part,x,y),u)}
 return z+.11*MM;
}
function tube(points,r,material,name){const curve=new THREE.CatmullRomCurve3(points),g=new THREE.TubeGeometry(curve,Math.max(12,points.length*2),r,6,false),m=new THREE.Mesh(g,material);m.name=name;m.castShadow=m.receiveShadow=true;root.add(m);return m}
function makeStitches(){
 const {segments,holes,count,pitchMM}=stitchSegments();
 for(const back of [false,true]){
  for(const [i,s] of segments.entries()){
   const pts=[];for(let j=0;j<=18;j++){const t=j/18,x=THREE.MathUtils.lerp(s.a.x,s.b.x,t),y=THREE.MathUtils.lerp(s.a.y,s.b.y,t),lift=Math.sin(Math.PI*t)*.025*MM+(s.backstitch?.12*MM:0);pts.push(new THREE.Vector3(x,y,stitchZ(x,y,back)+(back?-lift:lift)))}
   threadObjects.push(tube(pts,THREAD_DIAMETER/2,threadMaterial,`${back?'rear':'front'}-${s.backstitch?'return':'stitch'}-${i}`));
  }
  const g=new THREE.SphereGeometry(.21*MM,6,4),mesh=new THREE.InstancedMesh(g,holeMaterial,holes.length),dummy=new THREE.Object3D();
  holes.forEach((p,i)=>{dummy.position.set(p.x,p.y,(back?surfaceZ('rear',p.x,p.y,true):seamSurfaceZ(p.x,p.y))+(back?-.012:.012)*MM);dummy.scale.set(1,.7,.25);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.name=back?'rear-awl-holes':'front-awl-holes';root.add(mesh);
 }
 for(const side of [-1,1]){const x=side*(HALF-STITCH_INSET),y=BODY_TOP-.4*MM,zf=surfaceZ('body',x,y),zb=surfaceZ('rear',x,y,true),pts=[];for(let j=0;j<=14;j++){const t=j/14;pts.push(new THREE.Vector3(x,y+Math.sin(t*Math.PI)*.64*MM,THREE.MathUtils.lerp(zf,zb,t)))}threadObjects.push(tube(pts,THREAD_DIAMETER/2,threadMaterial,'mouth-anchor'))}
 // Batch every thread into one draw call, including the return stitches.
 const positions=[],normals=[],indices=[];let offset=0;
 for(const mesh of threadObjects){const g=mesh.geometry;positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);for(const i of g.index.array)indices.push(i+offset);offset+=g.attributes.position.count;root.remove(mesh);g.dispose()}
 const merged=new THREE.BufferGeometry();merged.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));merged.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));merged.setIndex(indices);const threadMesh=new THREE.Mesh(merged,threadMaterial);threadMesh.name='continuous-saddle-seam';threadMesh.castShadow=threadMesh.receiveShadow=true;root.add(threadMesh);
 root.userData.seam={count,pitchMM,returnStitches:4,diameterMM:.45};
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
const stampWall=new THREE.MeshStandardMaterial({color:'#493721',roughness:.8});
function updateLetters(){
 if(!ready||!fontData)return;needsRender=true;
 for(const m of [...letterGroup.children]){m.geometry.dispose();letterGroup.remove(m)}
 if(!state.monogram){const face=meshes.front.children.find(m=>m.userData.surface&&!m.geometry.userData.back);if(face.userData.stamped){face.geometry.dispose();face.geometry=makeLeatherSurface('front');setPressedGeometry(face.geometry,state.crease==='single');face.userData.stamped=false}return;}
 const shapes=glyphShapes(state.monogram,3.8*MM),g=new THREE.ExtrudeGeometry(shapes,{depth:.035*MM,bevelEnabled:true,bevelSize:.025*MM,bevelThickness:.018*MM,bevelSegments:2,curveSegments:10});g.computeBoundingBox();
 const width=g.boundingBox.max.x-g.boundingBox.min.x,x=HALF-9*MM-width-g.boundingBox.min.x,y=BOTTOM+11*MM-g.boundingBox.min.y;
 const stampDepth=.09*MM;
 // Cut actual glyph-shaped openings in the leather face, including counters.
 const translated=shapes.map(s=>{const g=new THREE.Shape(s.getPoints(12).map(p=>new THREE.Vector2(p.x+x,p.y+y)));g.holes=s.holes.map(h=>new THREE.Path(h.getPoints(12).map(p=>new THREE.Vector2(p.x+x,p.y+y))));return g});
 const face=meshes.front.children.find(m=>m.userData.surface&&!m.geometry.userData.back);
 face.userData.stamped=true;face.geometry.dispose();face.geometry=makeLeatherSurface('front',false,translated);setPressedGeometry(face.geometry,state.crease==='single');
 const wallG=new THREE.ExtrudeGeometry(shapes,{depth:stampDepth,bevelEnabled:false,curveSegments:12});wallG.groups=wallG.groups.filter(g=>g.materialIndex===1);
 const wa=wallG.attributes.position.array;for(let i=0;i<wa.length;i+=3){wa[i]+=x;wa[i+1]+=y;wa[i+2]+=surfaceZ('front',wa[i],wa[i+1])-stampDepth}wallG.attributes.position.needsUpdate=true;wallG.computeVertexNormals();
 const walls=new THREE.Mesh(wallG,[stampWall,stampWall]);walls.name='stamp-recess-walls';letterGroup.add(walls);
 // Conform real metal glyph geometry to the subtly bowed leather surface.
 const positions=g.attributes.position.array;for(let i=0;i<positions.length;i+=3){positions[i]+=x;positions[i+1]+=y;positions[i+2]+=surfaceZ('front',positions[i],positions[i+1])-stampDepth+.025*MM}g.attributes.position.needsUpdate=true;g.computeVertexNormals();
 const m=new THREE.Mesh(g,[foilMaterial,stampWall]);m.name='Freeman-recessed-gold';m.castShadow=m.receiveShadow=true;letterGroup.add(m);
}
function applyMaterials(part=null){
 if(!ready)return;needsRender=true;
 for(const p of parts){if(part&&part!==p.id)continue;const l=spec(state[p.id+'Material']),m=leatherMaterials[p.id];m.color.set(color(state[p.id]).hex);Object.assign(m,materialMaps[l.id]);m.normalScale.set(1,1);m.roughness=l.roughness;m.envMapIntensity=.72;m.clearcoat=l.id==='swift'?.045:0;m.clearcoatRoughness=.5;m.needsUpdate=true}
 edgeMaterial.color.set(color(state.edge).hex);threadMaterial.color.set(color(state.thread,threads).hex);updateLetters();
}
function moveCamera(pos,target=[0,0,0]){
 if(!ready)return;cameraMotion={start:performance.now(),from:camera.position.clone(),to:new THREE.Vector3(...pos),targetFrom:controls.target.clone(),targetTo:new THREE.Vector3(...target),duration:reducedMotion?0:800};
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));
}
function focusPart(id){
 const preset={rear:{p:[-1.3,.65,-5.7],t:[0,.05,0]},body:{p:[1.0,2.1,5.6],t:[0,.38,0]},accent:{p:[.65,1.0,5.15],t:[0,.19,.07]},front:{p:[.8,.45,5.2],t:[0,-.26,.08]},thread:{p:[-.6,.25,4.8],t:[-.16,-.10,.07]},edge:{p:[4.4,1.4,4.2],t:[0,-.1,0]},crease:{p:[.5,.6,4.5],t:[0,-.1,0]},monogram:{p:[.55,-.24,3.25],t:[.57,-.51,.07]}}[id];moveCamera(preset.p,preset.t);
}
function resetView(){moveCamera([1.2,.8,6.0],[0,0,0])}
const views={front:[0,0,5.8],back:[0,0,-5.8],side:[6.2,3.5,2.1]};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{moveCamera(views[b.dataset.view]);b.setAttribute('aria-pressed','true')});$('#reset-view').onclick=resetView;$('#macro-view').onclick=()=>moveCamera([.35,.35,3.4],[0,-.05,0]);
function init(){
 const host=$('#scene');scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(32,1,.08,50);renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(renderer.domElement);
 scene.environment=createStudioEnvironment(renderer);studio=createStudioLighting(scene,camera);
 const key=studio.lights[0];key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-2.4;key.shadow.camera.right=2.4;key.shadow.camera.top=2;key.shadow.camera.bottom=-2;key.shadow.camera.near=.1;key.shadow.camera.far=16;key.shadow.bias=-.000035;key.shadow.normalBias=.0001;
 root=new THREE.Group();scene.add(root);parts.forEach(p=>makePiece(p.id));sealEdges();makeStitches();root.add(letterGroup);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;controls.minDistance=2.6;controls.maxDistance=9;controls.rotateSpeed=.7;controls.zoomSpeed=.7;
 controls.addEventListener('start',()=>{cameraMotion=null;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'))});
 ready=true;applyMaterials();camera.position.set(1.2,.8,6);controls.update();
 function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.fov=w/h<1.1?43:32;camera.updateProjectionMatrix();renderer.setSize(w,h);needsRender=true}new ResizeObserver(resize).observe(host);resize();
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
 renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY,time:performance.now()});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5||performance.now()-down.time>500)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(Object.values(meshes),true)[0];if(hit){const part=hit.object.parent.name;selectStep(parts.findIndex(p=>p.id===part))}});
 host.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key))return;e.preventDefault();cameraMotion=null;const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')s.theta-=.12;if(e.key==='ArrowRight')s.theta+=.12;if(e.key==='ArrowUp')s.phi-=.12;if(e.key==='ArrowDown')s.phi+=.12;if(['+','='].includes(e.key))s.radius-=.3;if(e.key==='-')s.radius+=.3;s.phi=Math.max(.05,Math.min(Math.PI-.05,s.phi));s.radius=Math.max(2.6,Math.min(9,s.radius));camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(controls.target));controls.update()});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#loading').textContent='预览已中断，请刷新';$('#loading').hidden=false});$('#loading').hidden=true;
 function frame(){let changed=!!cameraMotion;if(cameraMotion){const a=cameraMotion,t=a.duration?Math.min(1,(performance.now()-a.start)/a.duration):1,u=t*t*(3-2*t);camera.position.lerpVectors(a.from,a.to,u);controls.target.lerpVectors(a.targetFrom,a.targetTo,u);if(t===1)cameraMotion=null}changed=controls.update()||changed;if(changed||needsRender){studio.update();renderer.render(scene,camera);needsRender=false}}renderer.setAnimationLoop(frame);document.addEventListener('visibilitychange',()=>renderer.setAnimationLoop(document.hidden?null:frame));
 // A read-only diagnostics surface supports model QA without reaching into WebGL.
 window.hidebook={get configuration(){return {...state}},get model(){return {seam:root.userData.seam,layers:parts.map(p=>({name:p.name,part:p.id,foldRadiusMM:.5,vertices:meshes[p.id].children[0].geometry.attributes.position.count})),atlasMM:ATLAS_MM}},get camera(){return {position:camera.position.toArray(),target:controls.target.toArray()}}};
}
try{[materialMaps,fontData]=await Promise.all([loadPhotoMaterials(THREE),fetch('./freeman.typeface.json').then(r=>{if(!r.ok)throw Error('Freeman 读取失败');return r.json()})]);init()}catch(e){console.error(e);$('#loading').textContent='预览加载失败，请刷新';}
