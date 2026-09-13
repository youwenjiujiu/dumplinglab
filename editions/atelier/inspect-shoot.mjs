// Diagnostic contact sheets only; source photography is never modified.
import sharp from 'sharp';
import { readdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const source=process.argv[2];
if(!source) throw new Error('Provide the photographer JPG directory');
const files=(await readdir(source)).filter(f=>/\.jpe?g$/i.test(f)).sort();
const output=await mkdtemp(join(tmpdir(),'dumplinglab-shoot-'));
for(let start=0;start<files.length;start+=12){
  const tiles=[];
  for(const [index,file] of files.slice(start,start+12).entries()){
    const x=(index%4)*320,y=Math.floor(index/4)*250;
    const thumb=await sharp(join(source,file)).rotate().resize(312,215,{fit:'contain',background:'#eee'}).jpeg({quality:85}).toBuffer();
    const label=file.match(/\d+/)?.[0]||String(start+index);
    tiles.push({input:thumb,left:x+4,top:y+4},{input:Buffer.from(`<svg width="320" height="30"><text x="12" y="22" font-family="sans-serif" font-size="20">${label}</text></svg>`),left:x,top:y+218});
  }
  const path=join(output,`sheet-${start/12+1}.jpg`);
  await sharp({create:{width:1280,height:750,channels:3,background:'#fff'}}).composite(tiles).jpeg({quality:90}).toFile(path);
  console.log(path);
}
console.log(`${files.length} original JPGs; originals unchanged`);
