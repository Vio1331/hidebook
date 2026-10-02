const PAPER='#f7f5f0',INK='#282420',MUTED='#797167',LINE='#d6cfc5';
export const RENDER_NOTE='*渲染结果与实际观感可能存在细微差异，最终效果以实物为准。';
function imageFrom(source){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=source})}
function drawModel(ctx,image,x,y,w,h){
 const probe=document.createElement('canvas');probe.width=image.width;probe.height=image.height;const p=probe.getContext('2d');p.drawImage(image,0,0);
 const data=p.getImageData(0,0,probe.width,probe.height).data;let left=image.width,right=0,top=image.height,bottom=0;
 for(let py=0;py<image.height;py++)for(let px=0;px<image.width;px++)if(data[(py*image.width+px)*4+3]>12){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py)}
 if(right<=left||bottom<=top)throw new Error('预览图为空');
 const sw=right-left+1,sh=bottom-top+1,scale=Math.min(w/sw,h/sh);ctx.drawImage(image,left,top,sw,sh,x+(w-sw*scale)/2,y+(h-sh*scale)/2,sw*scale,sh*scale);
}
export async function createCustomizationSheet({front,back,rows}){
 const text=rows.map(r=>r.label+r.value+(r.amount||'')).join('')+RENDER_NOTE+'定制单正面背面';
 const [frontImage,backImage]=await Promise.all([imageFrom(front),imageFrom(back),document.fonts.load('600 56px Manrope','hidebook'),document.fonts.load('400 32px "Hidebook Order Sans"',text)]);
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=1440;const ctx=canvas.getContext('2d');
 ctx.fillStyle=PAPER;ctx.fillRect(0,0,960,1440);ctx.fillStyle=INK;ctx.font='600 56px Manrope, sans-serif';ctx.fillText('hidebook',70,108);
 ctx.font='400 32px "Hidebook Order Sans", sans-serif';ctx.textAlign='right';ctx.fillText('定制单',890,105);ctx.textAlign='left';
 const rule=y=>{ctx.strokeStyle=LINE;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(70,y);ctx.lineTo(890,y);ctx.stroke()};rule(153);
 ctx.fillStyle=MUTED;ctx.font='400 18px "Hidebook Order Sans", sans-serif';ctx.fillText(RENDER_NOTE,70,185);
 drawModel(ctx,frontImage,62,212,400,280);drawModel(ctx,backImage,498,212,400,280);
 ctx.fillStyle=MUTED;ctx.font='400 26px "Hidebook Order Sans", sans-serif';ctx.textAlign='center';ctx.fillText('正面',262,546);ctx.fillText('背面',698,546);ctx.textAlign='left';
 rows.forEach((row,i)=>{
  const y=568+i*76;rule(y+66);ctx.fillStyle=row.total?INK:MUTED;ctx.font='400 30px "Hidebook Order Sans", sans-serif';ctx.fillText(row.label,70,y+40);
  if(row.hex){ctx.fillStyle=row.hex;ctx.beginPath();ctx.arc(282,y+29,13,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#00000020';ctx.stroke()}
  ctx.fillStyle=INK;ctx.font='400 32px Manrope, "Hidebook Order Sans", sans-serif';
  if(ctx.measureText(row.value).width>(row.amount?400:570))ctx.font='400 29px Manrope, "Hidebook Order Sans", sans-serif';
  ctx.fillText(row.value,318,y+40);
  if(row.amount){ctx.font=`${row.total?'600 36':'400 32'}px Manrope, "Hidebook Order Sans", sans-serif`;ctx.textAlign='right';ctx.fillText(row.amount,890,y+40);ctx.textAlign='left'}
 });
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('图片生成失败')),'image/png'));
}
