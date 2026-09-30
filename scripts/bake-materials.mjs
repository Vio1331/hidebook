// Optional authoring tool: NODE_PATH=/path/to/node_modules node scripts/bake-materials.mjs
// Requires @napi-rs/canvas. The published website needs no Node dependencies.
import {createRequire} from 'node:module';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import fs from 'node:fs';
import {photoSources,derivePhotoMaps} from '../dist/photo-materials.js';
for(const [id,spec] of Object.entries(photoSources)){
 if(process.argv[2] && process.argv[2]!==id)continue;
 const img=await loadImage(new URL('../dist/'+spec.file,import.meta.url));
 const maps=derivePhotoMaps(img,spec,createCanvas);
 for(const kind of ['base','normal','rough','height'])fs.writeFileSync(new URL(`../dist/materials/baked/${id}-${kind}.png`,import.meta.url),maps[kind].toBuffer('image/png'));
 fs.writeFileSync(new URL(`../dist/materials/baked/${id}-sample.jpg`,import.meta.url),maps.photo.toBuffer('image/jpeg',95));
 console.log(id,'2048 px material baked');
}
