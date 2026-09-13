(()=>{"use strict";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const src=document.getElementById("asciiSource");
const canvas=document.getElementById("asciiCanvas");
const stage=document.getElementById("asciiStage");
const ctx=canvas?.getContext("2d");
let mix=.86;
function drawAscii(){
  if(!src||!canvas||!ctx||!src.complete||!src.naturalWidth)return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const rect=stage.getBoundingClientRect();
  canvas.width=Math.max(1,Math.round(rect.width*dpr));
  canvas.height=Math.max(1,Math.round(rect.height*dpr));
  canvas.style.width=rect.width+"px";canvas.style.height=rect.height+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  const off=document.createElement("canvas"),oc=off.getContext("2d",{willReadFrequently:true});
  const cols=clamp(Math.floor(rect.width/9),46,150),cell=rect.width/cols,rows=Math.ceil(rect.height/(cell*1.65));
  off.width=cols;off.height=rows;
  const ir=src.naturalWidth/src.naturalHeight,rr=rect.width/rect.height;
  let sx=0,sy=0,sw=src.naturalWidth,sh=src.naturalHeight;
  if(ir>rr){sw=sh*rr;sx=(src.naturalWidth-sw)/2}else{sh=sw/rr;sy=(src.naturalHeight-sh)/2}
  oc.drawImage(src,sx,sy,sw,sh,0,0,cols,rows);
  const data=oc.getImageData(0,0,cols,rows).data,chars=" .,:;irsXA253hMHGS#9B&@";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=`${Math.max(7,cell*.98)}px "IBM Plex Mono", monospace`;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const i=(y*cols+x)*4,r=data[i],g=data[i+1],b=data[i+2],lum=.2126*r+.7152*g+.0722*b;
    const ch=chars[Math.floor((lum/255)*(chars.length-1))];
    const alpha=(.22+.78*(lum/255))*mix;
    ctx.fillStyle=`rgba(${r},${g},${b},${alpha})`;
    ctx.fillText(ch,(x+.5)*cell,(y+.5)*cell*1.65);
  }
}
src?.addEventListener("load",drawAscii);if(src?.complete)drawAscii();
new ResizeObserver(drawAscii).observe(stage);
stage?.addEventListener("pointermove",e=>{const r=stage.getBoundingClientRect();mix=.42+.58*(e.clientX-r.left)/r.width;drawAscii()});
stage?.addEventListener("pointerleave",()=>{mix=.86;drawAscii()});
async function average(url){
  const im=new Image();im.crossOrigin="anonymous";im.src=url;await im.decode();
  const c=document.createElement("canvas"),x=c.getContext("2d",{willReadFrequently:true});c.width=24;c.height=24;x.drawImage(im,0,0,24,24);
  const d=x.getImageData(0,0,24,24).data;let r=0,g=0,b=0,n=0;
  for(let i=0;i<d.length;i+=4){const rr=d[i],gg=d[i+1],bb=d[i+2],lum=(rr+gg+bb)/3;if(d[i+3]<128||lum<24||lum>242)continue;r+=rr;g+=gg;b+=bb;n++}
  r=Math.round(r/Math.max(1,n));g=Math.round(g/Math.max(1,n));b=Math.round(b/Math.max(1,n));
  return {r,g,b,hex:"#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("")};
}
document.querySelectorAll("#colorList article").forEach(async row=>{try{const c=await average(row.dataset.src);row.style.setProperty("--c",c.hex);row.querySelector("code").textContent=`${c.hex} · rgb(${c.r} ${c.g} ${c.b})`}catch{row.querySelector("code").textContent="unavailable"}});
})();