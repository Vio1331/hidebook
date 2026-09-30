import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { makeLeatherSurface, updateLeatherSurface, MM, LAYER, BOTTOM, BODY_TOP, HALF, BOTTOM_RADIUS, POCKET_SAG, STITCH_INSET } from './leather-geometry.js';
import { loadPhotoMaterials, photoSources } from './photo-materials.js';
import { createStudioLighting, createStudioEnvironment } from './studio-lighting.js';

// Customization data is independent of geometry. Replace these lists with actual leather samples.
const palette = [
 {id:'forest',name:'森林绿',hex:'#176447'}, {id:'mustard',name:'芥末黄',hex:'#dca72b'},
 {id:'cognac',name:'干邑棕',hex:'#a45c35'}, {id:'burgundy',name:'酒红',hex:'#783e44'},
 {id:'navy',name:'午夜蓝',hex:'#2d425b'}, {id:'ivory',name:'燕麦白',hex:'#d7cdb8'},
 {id:'black',name:'曜石黑',hex:'#282d2b'}
];
const threads=[...palette,{id:'cream',name:'米白',hex:'#eee0b9'}];
const leathers=[
 {id:'togo',name:'Togo',en:'自然颗粒 · 柔和哑光',description:'饱满、不规则的颗粒与深浅沟壑，转动模型观察柔和的颗粒高光。',cells:27,jitter:.86,strength:2.6,roughness:.82,coat:0},
 {id:'epsom',name:'Epsom',en:'细密压纹 · 利落挺括',description:'细密、有秩序的压纹，小颗粒的轮廓更清晰，光泽均匀而克制。',cells:39,jitter:.24,strength:2.0,roughness:.74,coat:0},
 {id:'swift',name:'Swift',en:'细腻光面 · 柔润光泽',description:'接近光面的细腻质感。主要通过柔和的宽幅反光表现，不刻意增加粗颗粒。',cells:0,jitter:0,strength:.22,roughness:.64,coat:0},
 {id:'evercolor',name:'Evercolor',en:'均匀细粒 · 温润半哑光',description:'均匀、较扁平的细颗粒，凹凸比 Togo 更收敛，呈现温润的半哑光。',cells:35,jitter:.48,strength:1.6,roughness:.78,coat:0},
 {id:'mysore',name:'Chèvre Mysore',en:'爱马仕山羊皮 · 细密光泽',description:'带方向感的细密不规则纹理，细小脊线与起伏让侧光更有变化。',cells:34,jitter:.94,strength:2.8,roughness:.71,coat:0}
];
const parts=[{id:'body',name:'背板 · 主体'},{id:'accent',name:'上层 · 卡槽'},{id:'front',name:'下层 · 卡槽'}];
const initial={bodyMaterial:'togo',accentMaterial:'epsom',frontMaterial:'togo',body:'forest',accent:'mustard',front:'forest',edge:'forest',thread:'forest',monogram:'',finish:'gold',crease:'single'};
let state={...initial},activePart='front';
const $=s=>document.querySelector(s);
const color=(id,list=palette)=>list.find(x=>x.id===id);
let renderer,scene,camera,controls,root,meshes={},stitchMaterial,letterMesh,edgeMaterial,ready=false;
let photoMaterials;
try {photoMaterials=await loadPhotoMaterials(THREE)} catch(error){
 $('#loading').textContent='皮料实拍加载失败，请刷新页面重试。';throw error;
}
const {heights,normals,albedos,roughnessMaps,samples,photos}=photoMaterials;

function setTab(id){
 document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1});
 document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==`panel-${id}`);
}
document.querySelectorAll('[data-tab]').forEach(b=>{b.addEventListener('click',()=>setTab(b.dataset.tab));b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')];let i=tabs.indexOf(b);i=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:-1)+3)%3;setTab(tabs[i].dataset.tab);tabs[i].focus()}})});
$('#to-colors').onclick=()=>{setTab('color');$('#tab-color').focus()};
$('#part-selector').innerHTML=parts.map(p=>`<button data-select-part="${p.id}" aria-pressed="false">${p.name}<small id="part-material-${p.id}"></small></button>`).join('');
$('#materials').innerHTML=leathers.map(l=>`<button class="material-button" data-material="${l.id}" aria-pressed="false"><img class="material-sample" src="${samples[l.id]}" alt=""><span><span class="name">${l.name}</span><span class="caption">${l.en}</span></span><span class="check">✓</span></button>`).join('');
function swatches(part,title,list){return `<div class="color-group"><div class="color-label">${title}<span id="label-${part}"></span></div><div class="swatches" role="group" aria-label="${title}">${list.map(c=>`<button class="swatch" data-part="${part}" data-color="${c.id}" style="--swatch:${c.hex}" title="${c.name}" aria-label="${title}：${c.name}" aria-pressed="false"></button>`).join('')}</div></div>`}
$('#color-controls').innerHTML=swatches('body','背板 · 主体',palette)+swatches('accent','上层 · 卡槽',palette)+swatches('front','下层 · 卡槽',palette);
$('#thread-controls').innerHTML=swatches('thread','手缝线',threads);
$('#edge-controls').innerHTML=swatches('edge','边油颜色',palette);
const presets=[{name:'森野',body:'forest',accent:'mustard',front:'forest',thread:'forest'},{name:'日落',body:'cognac',accent:'ivory',front:'cognac',thread:'cream'},{name:'夜航',body:'navy',accent:'burgundy',front:'navy',thread:'ivory'}];
$('#presets').innerHTML=presets.map((p,i)=>`<button class="preset" data-preset="${i}"><span class="preset-dot" style="--a:${color(p.body).hex};--b:${color(p.accent).hex}"></span>${p.name}</button>`).join('');
function sync(){
 document.querySelectorAll('[data-material]').forEach(b=>b.setAttribute('aria-pressed',String(state[activePart+'Material']===b.dataset.material)));
 $('#material-description').textContent=leathers.find(l=>l.id===state[activePart+'Material']).description;
 document.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-pressed',String(state[b.dataset.part]===b.dataset.color)));
 for(const p of ['body','accent','front','thread','edge'])$(`#label-${p}`).textContent=color(state[p],threads).name;
 $('#monogram').value=state.monogram;$('#letter-count').textContent=`${state.monogram.length} / 6`;
 document.querySelectorAll('[name=finish]').forEach(r=>r.checked=r.value===state.finish);
 $('#crease-style').value=state.crease;
 $('#summary').textContent=parts.map(p=>`${p.name}：${leathers.find(l=>l.id===state[p.id+'Material']).name} / ${color(state[p.id]).name}`).join('\n')+`\n装饰线：${{none:'无',single:'单线 · 1 mm'}[state.crease]}\n边油：${color(state.edge).name} · 缝线：${color(state.thread,threads).name}`+(state.monogram?`\n烫印：${state.monogram} / ${{gold:'烫金',silver:'烫银',blind:'素压'}[state.finish]}`:'\n烫印：无');
 $('#summary-colors').innerHTML=['body','accent','front','edge','thread'].map(p=>`<span style="background:${color(state[p],threads).hex}"></span>`).join('');
 document.querySelectorAll('[data-select-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.selectPart===activePart)));
 for(const p of parts)$('#part-material-'+p.id).textContent=leathers.find(l=>l.id===state[p.id+'Material']).name;
 $('#editing-part').textContent=parts.find(p=>p.id===activePart).name;
 const leatherId=state[activePart+'Material'];$('#photo-preview').src=photos[leatherId];$('#photo-name').textContent=leathers.find(l=>l.id===leatherId).name+' · 实拍纹理';$('#photo-source').textContent=photoSources[leatherId].label;$('#photo-source').href=photoSources[leatherId].url;
 if(ready)applyMaterials();
}
document.querySelectorAll('[data-material]').forEach(b=>b.onclick=()=>{state[activePart+'Material']=b.dataset.material;sync()});
document.querySelectorAll('[data-select-part]').forEach(b=>b.onclick=()=>{activePart=b.dataset.selectPart;sync()});
document.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{state[b.dataset.part]=b.dataset.color;sync()});
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const {name,...p}=presets[+b.dataset.preset];Object.assign(state,p,{edge:p.body});sync()});
$('#monogram').oninput=e=>{state.monogram=e.target.value.replace(/[^a-zA-Z0-9 ]/g,'').toUpperCase().slice(0,6);sync()};
document.querySelectorAll('[name=finish]').forEach(r=>r.onchange=()=>{state.finish=r.value;sync()});
$('#reset-all').onclick=()=>{state={...initial};sync();setView('perspective')};
$('#crease-style').onchange=e=>{state.crease=e.target.value;sync()};
const dialog=$('#reference-dialog');$('#reference-button').onclick=()=>dialog.showModal();$('.close-dialog').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
sync();

// Four leather pieces: a new rear base, the original base, and two curved-mouth pockets.
function outline(top,curvedTop=false,bottom=BOTTOM,width=107*MM,r=BOTTOM_RADIUS){
 const shape=new THREE.Shape(),left=-width/2,right=width/2;
 shape.moveTo(left+r,bottom);shape.lineTo(right-r,bottom);shape.quadraticCurveTo(right,bottom,right,bottom+r);
 shape.lineTo(right,top);if(curvedTop)shape.quadraticCurveTo(0,top-2*POCKET_SAG,left,top);else shape.lineTo(left,top);
 shape.lineTo(left,bottom+r);shape.quadraticCurveTo(left,bottom,left+r,bottom);return shape;
}
function piece(part,top,z,{key=part,back=false,curvedTop=false}={}){
 const bevel=.003,geo=new THREE.ExtrudeGeometry(outline(top,curvedTop),{depth:LAYER-2*bevel,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:0,bevelThickness:bevel,curveSegments:32});
 geo.groups=geo.groups.filter(g=>g.materialIndex===1);
 const mat=new THREE.MeshPhysicalMaterial({color:color(state[part]).hex,roughness:.64,metalness:0,ior:1.46,specularIntensity:.42});
 const mesh=new THREE.Mesh(geo,[mat,edgeMaterial]);mesh.position.z=z+bevel;mesh.castShadow=false;mesh.receiveShadow=false;
 mesh.userData.part=part;mesh.userData.surfaces=[];mesh.userData.creaseMaterial=new THREE.MeshPhysicalMaterial();mesh.userData.borderMaterial=new THREE.MeshPhysicalMaterial();mesh.userData.lastSurface='';
 const face=new THREE.Mesh(makeLeatherSurface(top,back?-bevel:LAYER-bevel,back,curvedTop),[mat,mesh.userData.creaseMaterial,mesh.userData.borderMaterial]);
 const uv=face.geometry.attributes.uv,offset=part==='body'?[.026,.015]:part==='accent'?[-.04,.037]:[0,0];for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)+offset[0],uv.getY(i)+offset[1]);face.castShadow=false;face.receiveShadow=false;mesh.add(face);mesh.userData.surfaces.push(face);
 if(curvedTop){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-HALF,top,z+LAYER/2),new THREE.Vector3(0,top-2*POCKET_SAG,z+LAYER/2),new THREE.Vector3(HALF,top,z+LAYER/2));const roundedEdge=new THREE.Mesh(new THREE.TubeGeometry(curve,64,LAYER/2,8,false),edgeMaterial);roundedEdge.castShadow=false;root.add(roundedEdge)}
 root.add(mesh);meshes[key]=mesh;return mesh;
}
function stitchPath(z,top){
 const points=[],left=-HALF+STITCH_INSET,right=HALF-STITCH_INSET,bottom=BOTTOM+STITCH_INSET,r=BOTTOM_RADIUS-STITCH_INSET;
 points.push(new THREE.Vector3(left,top,z),new THREE.Vector3(left,bottom+r,z));
 for(let i=1;i<=12;i++){const a=Math.PI+i/12*Math.PI/2;points.push(new THREE.Vector3(left+r+Math.cos(a)*r,bottom+r+Math.sin(a)*r,z))}
 points.push(new THREE.Vector3(right-r,bottom,z));
 for(let i=1;i<=12;i++){const a=-Math.PI/2+i/12*Math.PI/2;points.push(new THREE.Vector3(right-r+Math.cos(a)*r,bottom+r+Math.sin(a)*r,z))}
 points.push(new THREE.Vector3(right,top,z));
 const curve=new THREE.CurvePath();for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(points[i-1],points[i]));
 const length=curve.getLength(),n=Math.floor(length/.071),geo=new THREE.CapsuleGeometry(.007,.035,3,5);
 const inst=new THREE.InstancedMesh(geo,stitchMaterial,n),dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
 for(let i=0;i<n;i++){const t=(i+.4)/n,p=curve.getPoint(t),d=curve.getTangent(t).normalize();d.x+=.17;d.normalize();dummy.position.copy(p);dummy.quaternion.setFromUnitVectors(up,d);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)}
 inst.castShadow=false;root.add(inst);
}
function updateLetters(){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;const ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,768,160);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 104px Arial';ctx.fillStyle='#ffffff';ctx.translate(384,84);ctx.scale(700/Math.max(1,ctx.measureText(state.monogram).width),1);ctx.fillText(state.monogram,0,0);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 if(letterMesh.material.map)letterMesh.material.map.dispose();letterMesh.material.map=tex;
 letterMesh.material.color.set(state.finish==='gold'?'#d9b357':state.finish==='silver'?'#d2d5d0':color(state.front).hex);
 if(state.finish==='blind')letterMesh.material.color.multiplyScalar(.50);
 letterMesh.material.metalness=state.finish==='blind'?0:.78;letterMesh.material.roughness=state.finish==='blind'?.78:.3;letterMesh.material.needsUpdate=true;letterMesh.visible=!!state.monogram.trim();
 // Keep short monograms compact; more letters grow leftward from the same right inset.
 const w=Math.max(.30,state.monogram.length*.105);letterMesh.scale.x=w;letterMesh.position.x=1.40-w/2;
}
function applyMaterials(){
 for(const meshKey of ['backing','body','accent','front']){
  const mesh=meshes[meshKey],p=mesh.userData.part,mat=mesh.material[0],id=state[p+'Material'],spec=leathers.find(l=>l.id===id);
  mat.color.set(color(state[p]).hex);mat.envMapIntensity=.8;mat.map=albedos[id];mat.normalMap=normals[id];mat.normalScale.set(1,1);mat.roughnessMap=roughnessMaps[id];mat.roughness=spec.roughness;mat.clearcoat=spec.coat;mat.clearcoatRoughness=1;mat.needsUpdate=true;
  const creaseMat=mesh.userData.creaseMaterial;creaseMat.copy(mat);
  creaseMat.color.multiplyScalar(.74);creaseMat.roughness=spec.roughness*.82;
  const borderMat=mesh.userData.borderMaterial;borderMat.copy(mat);borderMat.map=null;borderMat.normalMap=null;borderMat.roughnessMap=null;borderMat.roughness=Math.min(1,spec.roughness+.08);borderMat.needsUpdate=true;
  const key=id+state.crease;
  if(mesh.userData.lastSurface!==key){const c=heights[id].image,field=c.getContext('2d').getImageData(0,0,c.width,c.height);for(const face of mesh.userData.surfaces)updateLeatherSurface(face.geometry,field,state.crease);mesh.userData.lastSurface=key}
 }
 edgeMaterial.color.set(color(state.edge).hex);
 stitchMaterial.color.set(color(state.thread,threads).hex).multiplyScalar(1.0);updateLetters();
}
// One continuous painted skin over the joined side and bottom edges, no visible strata.
function sealEdges(){
 const line=new THREE.CurvePath(),v=(x,y)=>new THREE.Vector3(x,y,0),l=-HALF-.002,r=HALF+.002,b=BOTTOM-.002,rad=BOTTOM_RADIUS;
 line.add(new THREE.LineCurve3(v(l,1.125),v(l,b+rad)));
 line.add(new THREE.QuadraticBezierCurve3(v(l,b+rad),v(l,b),v(l+rad,b)));
 line.add(new THREE.LineCurve3(v(l+rad,b),v(r-rad,b)));
 line.add(new THREE.QuadraticBezierCurve3(v(r-rad,b),v(r,b),v(r,b+rad)));
 line.add(new THREE.LineCurve3(v(r,b+rad),v(r,1.125)));
 const positions=[],indices=[],segments=240,cross=12;
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
 for(let i=0;i<=segments;i++){
  const t=i/segments,p=line.getPoint(t),tan=line.getTangent(t).normalize(),out=new THREE.Vector3(tan.y,-tan.x,0);
  const zBack=-2.5*LAYER,zFront=-.5*LAYER+LAYER*(1-smooth(.78,.792,p.y))+LAYER*(1-smooth(.39,.402,p.y));
  for(let j=0;j<=cross;j++){const u=j/cross,bulge=Math.sin(u*Math.PI)*.002;positions.push(p.x+out.x*bulge,p.y+out.y*bulge,zBack+(zFront-zBack)*u);if(i<segments&&j<cross){const n=i*(cross+1)+j;indices.push(n,n+cross+1,n+1,n+1,n+cross+1,n+cross+2)}}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 const seal=new THREE.Mesh(g,edgeMaterial);seal.name='ContinuousEdgePaint';seal.castShadow=false;root.add(seal);

}
const views={front:[0,0,7],back:[0,0,-7],side:[6.8,.65,1.6],perspective:[2.0,1.1,6.4]};
function setView(name){if(!ready)return;$('.viewer').classList.remove('macro-mode');const position=views[name];camera.position.set(...position);controls.target.set(0,0,0);controls.update();document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===name;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('#reset-view').onclick=()=>setView('perspective');
$('#macro-view').onclick=()=>{if(!ready)return;camera.position.set(.2,-.32,3.35);controls.target.set(0,-.32,0);controls.update();$('.viewer').classList.add('macro-mode');document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'))};
$('#photo-enlarge').onclick=()=>{const id=state[activePart+'Material'];$('#material-photo-large').src=photos[id];$('#material-photo-title').textContent=leathers.find(l=>l.id===id).name+' · 皮面实拍';$('#material-photo-dialog').showModal()};
$('#close-material-photo').onclick=()=>$('#material-photo-dialog').close();
function init(){
 const host=$('#scene');scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.1,100);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2.5));renderer.shadowMap.enabled=false;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;host.appendChild(renderer.domElement);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#loading').textContent='3D 预览暂时中断，请刷新页面重试。';$('#loading').hidden=false});
 const studio=createStudioLighting(scene,camera);
 scene.environment=createStudioEnvironment(renderer);scene.environmentIntensity=1;
 root=new THREE.Group();root.position.set(0,-.1,0);scene.add(root);
 edgeMaterial=new THREE.MeshPhysicalMaterial({color:color(state.edge).hex,roughness:.38,clearcoat:.22,clearcoatRoughness:.30,side:THREE.DoubleSide});
 piece('body',BODY_TOP,-2.5*LAYER,{key:'backing',back:true});piece('body',BODY_TOP,-1.5*LAYER);piece('accent',.78,-.5*LAYER,{curvedTop:true});piece('front',.39,.5*LAYER,{curvedTop:true});sealEdges();
 stitchMaterial=new THREE.MeshStandardMaterial({color:'#37684a',roughness:.86});stitchPath(1.5*LAYER+.002,.29);stitchPath(-2.5*LAYER-.002,BODY_TOP-STITCH_INSET);
 // Short exposed stitches continue through the upper layered margins.
 for(const x of [-HALF+STITCH_INSET,HALF-STITCH_INSET])for(let y=.45;y<1.1;y+=.071){const geo=new THREE.CapsuleGeometry(.007,.035,3,5);const stitch=new THREE.Mesh(geo,stitchMaterial);stitch.position.set(x,y,y>.81?-.5*LAYER+.002:.5*LAYER+.002);stitch.rotation.z=-.14;root.add(stitch)}
 letterMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,.135),new THREE.MeshStandardMaterial({transparent:true,depthWrite:false,alphaTest:.06,polygonOffset:true,polygonOffsetFactor:-1}));letterMesh.position.set(1.1,-.76,1.5*LAYER+.003);root.add(letterMesh);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=false;controls.minDistance=3.0;controls.maxDistance=10;controls.maxPolarAngle=Math.PI;controls.rotateSpeed=.8;controls.zoomSpeed=.65;
 controls.addEventListener('start',()=>document.querySelectorAll('[data-view]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')}));
 ready=true;applyMaterials();setView('perspective');
 function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.fov=w/h<1?42:34;camera.setViewOffset(w,h,0,-h*.075,w,h);camera.updateProjectionMatrix();renderer.setSize(w,h)}new ResizeObserver(resize).observe(host);resize();
 host.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key))return;e.preventDefault();const offset=camera.position.clone().sub(controls.target);const spherical=new THREE.Spherical().setFromVector3(offset);if(e.key==='ArrowLeft')spherical.theta-=.16;if(e.key==='ArrowRight')spherical.theta+=.16;if(e.key==='ArrowUp')spherical.phi-=.13;if(e.key==='ArrowDown')spherical.phi+=.13;if(e.key==='+'||e.key==='=')spherical.radius-=.35;if(e.key==='-')spherical.radius+=.35;spherical.phi=Math.max(.02,Math.min(Math.PI-.02,spherical.phi));spherical.radius=Math.max(controls.minDistance,Math.min(controls.maxDistance,spherical.radius));camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target));controls.update()});
 $('#loading').hidden=true;
 const renderFrame=()=>{controls.update();studio.update();renderer.render(scene,camera)};
 renderer.setAnimationLoop(renderFrame);
 document.addEventListener('visibilitychange',()=>renderer.setAnimationLoop(document.hidden?null:renderFrame));
}
try{init()}catch(error){console.error(error);$('#loading').textContent='当前浏览器无法显示 3D，请开启硬件加速或换用支持 WebGL 的浏览器。';}

// Progressive enhancement: browsers without WebMCP retain the complete normal UI.
if(document.modelContext?.registerTool){const lifecycle=new AbortController();
 const tools=[{name:'read_cardholder_configuration',description:'读取当前卡包皮料、分区颜色、缝线和刻字。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({...state})},
 {name:'configure_cardholder',description:'更新卡包的预览搭配，不下单。',inputSchema:{type:'object',properties:{bodyMaterial:{type:'string',enum:leathers.map(x=>x.id)},accentMaterial:{type:'string',enum:leathers.map(x=>x.id)},frontMaterial:{type:'string',enum:leathers.map(x=>x.id)},edge:{type:'string',enum:palette.map(x=>x.id)},body:{type:'string',enum:palette.map(x=>x.id)},accent:{type:'string',enum:palette.map(x=>x.id)},front:{type:'string',enum:palette.map(x=>x.id)},thread:{type:'string',enum:threads.map(x=>x.id)},monogram:{type:'string',maxLength:6},crease:{type:'string',enum:['none','single']},finish:{type:'string',enum:['gold','silver','blind']}},additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||typeof input!=='object'||Array.isArray(input))throw Error('输入必须为对象');const proposed={...state};for(const [k,v]of Object.entries(input)){if(!Object.hasOwn(initial,k)||typeof v!=='string')throw Error('无效选项');if(k==='monogram'){if(!/^[A-Za-z0-9 ]{0,6}$/.test(v))throw Error('刻字仅支持最多6位英文字母或数字');proposed[k]=v.toUpperCase()}else{const allowed=k.endsWith('Material')?leathers.map(x=>x.id):k==='crease'?['none','single']:k==='finish'?['gold','silver','blind']:(k==='thread'?threads:palette).map(x=>x.id);if(!allowed.includes(v))throw Error('无效选项');proposed[k]=v}}state=proposed;sync();return {...state}}}];
 for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(console.warn)}catch(e){console.warn(e)}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
