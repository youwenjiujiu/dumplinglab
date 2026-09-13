// Mechanical sprite-sheet packaging: crop the four supplied sprites and turn
// their neutral checkerboard matte into alpha. No artwork is drawn here.
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
const source=process.argv[2];if(!source)throw new Error('Pass the exact source sprite PNG');
const out=new URL('./media/',import.meta.url);await mkdir(out,{recursive:true});
const boxes=[['dumpling',0,0,750,530],['plate',760,0,776,505],['sauce',0,530,740,494],['chopsticks',740,505,796,519]];
for(const [name,left,top,width,height]of boxes){
 const {data}=await sharp(source).extract({left,top,width,height}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const mask=new Uint8Array(width*height);
 for(let i=0;i<mask.length;i++){const r=data[i*3],g=data[i*3+1],b=data[i*3+2];mask[i]=(Math.max(r,g,b)-Math.min(r,g,b)>12&&r>b+5)?255:0;}
 // Fill enclosed neutral highlights / sauce without preserving exterior matte.
 const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length);let start=0,end=0;
 function visit(i){if(i>=0&&i<mask.length&&!seen[i]&&!mask[i]){seen[i]=1;queue[end++]=i}}
 for(let x=0;x<width;x++){visit(x);visit((height-1)*width+x)}
 for(let y=0;y<height;y++){visit(y*width);visit(y*width+width-1)}
 while(start<end){const i=queue[start++],x=i%width;visit(i-width);visit(i+width);if(x)visit(i-1);if(x<width-1)visit(i+1);}
 for(let i=0;i<mask.length;i++)if(!seen[i])mask[i]=255;
 const alpha=await sharp(mask,{raw:{width,height,channels:1}}).blur(.5).toColourspace('b-w').raw().toBuffer();
 const rgba=Buffer.alloc(width*height*4);
 for(let i=0;i<mask.length;i++){rgba[i*4]=data[i*3];rgba[i*4+1]=data[i*3+1];rgba[i*4+2]=data[i*3+2];rgba[i*4+3]=alpha[i]}
 await sharp(rgba,{raw:{width,height,channels:4}}).trim({threshold:10}).webp({quality:92,alphaQuality:100}).toFile(new URL(`pick-${name}-v1.webp`,out).pathname);
 console.log(name,await sharp(new URL(`pick-${name}-v1.webp`,out).pathname).metadata());
}
