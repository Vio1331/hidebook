import * as THREE from 'three';

// An orbiting product viewer needs illumination on the side being inspected.
// Off-axis camera-relative lights preserve relief instead of flattening it.
export const studioLights = [
 { position: [-3.5, 4.0, 5.0], color: 0xfffbf5, intensity: 1.6 },
 { position: [4.5, 1.0, 3.5], color: 0xf3f7ff, intensity: .65 },
 { position: [0, -2.5, 4.5], color: 0xffffff, intensity: .25 }
];
// Broad, continuous studio radiance. No hard rectangular reflection cards,
// visible backdrop, floor, or shadow-catching plane.
export function createStudioEnvironment(renderer){
 const w=512,h=256,data=new Float32Array(w*h*4);
 const key=new THREE.Vector3(-.6,.7,.8).normalize(),fill=new THREE.Vector3(.8,.15,.6).normalize();
 const direction=new THREE.Vector3();
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const phi=(x+.5)/w*2*Math.PI-Math.PI,theta=(y+.5)/h*Math.PI;
  direction.set(Math.cos(phi)*Math.sin(theta),-Math.cos(theta),Math.sin(phi)*Math.sin(theta));
  const k=2.2*Math.exp((direction.dot(key)-1)*7),f=.65*Math.exp((direction.dot(fill)-1)*4);
  const ambient=.32+.12*Math.max(0,direction.y),i=(y*w+x)*4;
  data[i]=ambient+k+f*.96;data[i+1]=ambient+k*.985+f*.98;data[i+2]=ambient+k*.96+f;data[i+3]=1;
 }
 const texture=new THREE.DataTexture(data,w,h,THREE.RGBAFormat,THREE.FloatType);
 texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;
 const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(texture);
 texture.dispose();pmrem.dispose();return target.texture;
}
export function createStudioLighting(scene,camera){
 const target=new THREE.Object3D();target.position.set(0,-.1,0);scene.add(target);
 scene.add(new THREE.HemisphereLight(0xffffff,0xb8b9b6,.55));
 const lights=studioLights.map(spec=>{
  const light=new THREE.DirectionalLight(spec.color,spec.intensity);light.target=target;
  light.castShadow=false;
  scene.add(light);return light;
 });
 const local=new THREE.Vector3();
 return {lights,update(){camera.updateMatrixWorld();lights.forEach((light,i)=>light.position.copy(local.fromArray(studioLights[i].position).applyQuaternion(camera.quaternion)).add(target.position));scene.environmentRotation.setFromQuaternion(camera.quaternion)}};
}
