// Web-sized copies only: no retouching, synthetic food, background removal or crop.
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
const source=process.argv[2];
if(!source) throw new Error('Provide the original photographer JPG directory');
const context=vm.createContext({});
vm.runInContext(await readFile(new URL('./photography.js',import.meta.url),'utf8'),context);
let bytes=0;
for(const size of ['s','l']) {
  const target=new URL(`../../web/img/${size}/`,import.meta.url);
  await mkdir(target,{recursive:true});
  for(const id of context.DL_PHOTOGRAPHY.shots) {
    const output=await sharp(resolve(source,`Dumpling Lab菜品图${id}.jpg`)).rotate()
      .resize({width:size==='s'?720:1440,withoutEnlargement:true})
      .webp({quality:size==='s'?84:88}).toFile(new URL(context.DL_PHOTOGRAPHY.file(id),target).pathname);
    bytes+=output.size;
  }
}
if(process.argv[3]) await sharp(process.argv[3]).rotate().resize({width:1200,withoutEnlargement:true}).webp({quality:86}).toFile(new URL('../../web/brand/restaurant-front-20260908.webp',import.meta.url).pathname);
console.log(`Prepared ${context.DL_PHOTOGRAPHY.shots.length} photographs in two web sizes (${(bytes/1024/1024).toFixed(2)} MB total). Originals unchanged.`);
