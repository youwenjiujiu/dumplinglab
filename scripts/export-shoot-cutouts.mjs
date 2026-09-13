// Keep the established photograph canvas and export actual alpha, never a matte.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const ids=process.argv.slice(2);
if(!ids.length||ids.some(id=>!/^\d{4}$/.test(id))) throw Error('Provide four-digit reviewed shoot IDs');
const root=new URL('../web/img/',import.meta.url);
const review=new URL('candidates/sam3/review/',root);
await mkdir(review,{recursive:true});
for(const id of ids){
  const name=`shoot-20260908-${id}-cutout`;
  const input=new URL(`${name}.png`,root).pathname;
  const meta=await sharp(input).metadata();
  if(!meta.hasAlpha||meta.width!==1440||meta.height!==960) throw Error(`Invalid cutout canvas ${id}`);
  for(const [size,width] of [['s',720],['l',1440]]){
    await sharp(input).resize({width}).webp({lossless:true,effort:5}).toFile(new URL(`${size}/${name}.webp`,root).pathname);
  }
  for(const [tone,background] of [['white','#ffffff'],['dark','#343a40']]){
    await sharp(input).resize({width:720}).flatten({background}).jpeg({quality:94}).toFile(new URL(`${id}-${tone}.jpg`,review).pathname);
  }
  console.log(`${id}: transparent WebP small/large + white/dark edge proofs`);
}
if(ids.length>1){
  const tiles=[];
  for(const [i,id] of ids.entries()){
    const x=i%3*360,y=Math.floor(i/3)*260;
    tiles.push({input:await sharp(new URL(`${id}-dark.jpg`,review).pathname).resize(360,240).toBuffer(),left:x,top:y});
    tiles.push({input:Buffer.from(`<svg width="360" height="20"><text x="10" y="16" font-family="sans-serif" font-size="15">${id}</text></svg>`),left:x,top:y+240});
  }
  await sharp({create:{width:1080,height:Math.ceil(ids.length/3)*260,channels:3,background:'#fff'}}).composite(tiles).jpeg({quality:94}).toFile(new URL('contact.jpg',review).pathname);
}
