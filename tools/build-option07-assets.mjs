import fs from 'node:fs';
import path from 'node:path';
import {inflateSync,deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=process.cwd(), output=path.join(root,'public/hub');
fs.mkdirSync(output,{recursive:true});
const source=Buffer.concat(Array.from({length:9},(_,i)=>fs.readFileSync(path.join(root,'assets-source/option07/part'+String(i).padStart(2,'0')+'.bin'))));
const signature=Buffer.from('89504e470d0a1a0a','hex');
if(!source.subarray(0,8).equals(signature))throw Error('Incorrect reference asset');
fs.writeFileSync(path.join(output,'option07-reference.png'),source);
function decodePng(bytes){
 let w=0,h=0,bpp=0,off=8,idat=[];
 while(off+12<=bytes.length){const n=bytes.readUInt32BE(off),kind=bytes.toString('ascii',off+4,off+8),part=bytes.subarray(off+8,off+8+n);
  if(kind==='IHDR'){w=part.readUInt32BE(0);h=part.readUInt32BE(4);bpp=part[9]===6?4:3;if(part[8]!==8||![2,6].includes(part[9])||part[12]!==0)throw Error('Unsupported PNG format')}
  if(kind==='IDAT')idat.push(part);off+=n+12;if(kind==='IEND')break;
 }
 const infl=inflateSync(Buffer.concat(idat)),stride=w*bpp,out=Buffer.allocUnsafe(w*h*4);let pos=0,up=Buffer.alloc(stride),row=Buffer.alloc(stride);
 for(let y=0;y<h;y++){const filter=infl[pos++];for(let i=0;i<stride;i++){
  const v=infl[pos++],left=i>=bpp?row[i-bpp]:0,above=up[i],corner=i>=bpp?up[i-bpp]:0;let predictor=0;
  if(filter===1)predictor=left;else if(filter===2)predictor=above;else if(filter===3)predictor=(left+above)>>1;else if(filter===4){const p=left+above-corner,a=Math.abs(p-left),b=Math.abs(p-above),c=Math.abs(p-corner);predictor=a<=b&&a<=c?left:b<=c?above:corner}else if(filter!==0)throw Error('PNG filter not recognized');row[i]=(v+predictor)&255;
 }for(let x=0;x<w;x++){const s=x*bpp,d=(y*w+x)*4;out[d]=row[s];out[d+1]=row[s+1];out[d+2]=row[s+2];out[d+3]=255;}[row,up]=[up,row]}
 return {w,h,out};
}
function resize({w,h,out},dw,dh){
 const mid=Buffer.allocUnsafe(h*dw*3),dst=Buffer.allocUnsafe(dw*dh*3);
 const cols=Array.from({length:dw},(_,x)=>{const f=x*(w-1)/(dw-1),a=Math.floor(f);return [a,Math.min(w-1,a+1),f-a]});
 for(let y=0;y<h;y++)for(let x=0;x<dw;x++){const [a,b,t]=cols[x],d=(y*dw+x)*3,p=(y*w+a)*4,q=(y*w+b)*4;for(let c=0;c<3;c++)mid[d+c]=Math.round(out[p+c]*(1-t)+out[q+c]*t)}
 for(let y=0;y<dh;y++){const f=y*(h-1)/(dh-1),a=Math.floor(f),b=Math.min(h-1,a+1),t=f-a;
  for(let x=0;x<dw*3;x++){dst[y*dw*3+x]=Math.round(mid[a*dw*3+x]*(1-t)+mid[b*dw*3+x]*t)}
 }return dst;
}
const table=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
function chunk(type,data){const b=Buffer.allocUnsafe(data.length+12);b.writeUInt32BE(data.length,0);b.write(type,4,4,'ascii');data.copy(b,8);let crc=0xffffffff;for(let i=4;i<8+data.length;i++)crc=table[(crc^b[i])&255]^(crc>>>8);b.writeUInt32BE((crc^0xffffffff)>>>0,8+data.length);return b}
function encode(rgb,w,h){const stride=w*3,raw=Buffer.allocUnsafe((stride+1)*h);for(let y=0;y<h;y++){const at=y*(stride+1);raw[at]=1;for(let x=0;x<stride;x++)raw[at+1+x]=(rgb[y*stride+x]-(x>=3?rgb[y*stride+x-3]:0))&255}const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;return Buffer.concat([signature,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:4})),chunk('IEND',Buffer.alloc(0))])}
const decoded=decodePng(source);if(decoded.w!==1672||decoded.h!==941)throw Error('Approved dimensions changed');
for(const [label,width] of [['4k',3840],['8k',7680]]){const height=Math.round(decoded.h*width/decoded.w);const resized=resize(decoded,width,height),png=encode(resized,width,height);fs.writeFileSync(path.join(output,'option07-'+label+'.png'),png);console.log(label+' '+width+'x'+height+' '+(png.length/1048576).toFixed(2)+'MB')}
console.log('source sha256',createHash('sha256').update(source).digest('hex'));
