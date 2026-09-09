import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import sharp from 'sharp';
import '../../web/menu-data.js';
import '../../web/lunch-menu.js';
import '../../web/brand/menu-appetite-v1.js';
const source=await readFile(new URL('app.js',import.meta.url),'utf8');
const photo=vm.runInNewContext(source.slice(source.indexOf('const combinationPresentation ='),source.indexOf('const description ='))+'\nphoto;',{LUNCH_RECOMMENDATIONS,LUNCH_PREPARATIONS,DL_MENU_ART,DL_TRAY_ART});
let transparent=0,masked=0;
for(const original of Object.keys(DL_MENU_ART)){
 const expected=DL_TRAY_ART[original]||original;
 const path=photo({img:original},'s',null,true);
 assert.equal(path,'/img/s/'+expected.replace(/\.[^.]+$/,'.webp'));
 assert.equal(photo({img:original},'s'),'/img/s/'+DL_MENU_ART[original].replace(/\.[^.]+$/,'.webp'),'Main menu unchanged');
 if(DL_TRAY_ART[original]){masked++;continue;}
 const {data,info}=await sharp(new URL('../../web'+path,import.meta.url).pathname).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let clear=0;for(let i=3;i<data.length;i+=4)if(data[i]<10)clear++;
 assert(clear/(info.width*info.height)>.08,original+' must have genuine transparent background pixels');transparent++;
}
assert.equal(transparent,48);assert.equal(masked,2);
for(const name of ['noodle','lettuce']){
 const svg=await readFile(new URL(`../../web/brand/tray-${name}-silhouette-v1.svg`,import.meta.url));
 const {data,info}=await sharp(svg).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(const [x,y] of [[0,0],[719,0],[0,719],[719,719]])assert.equal(data[(y*info.width+x)*4+3],0);
 assert.equal(data[(360*info.width+360)*4+3],255);
}
assert.equal((source.match(/photo\(d, "s", style, true\)/g)||[]).length,1,'Transfer gets transparent presentation');
console.log('PASS all 50 tray mappings: 48 genuine alpha originals, 2 vessel masks; main artwork unchanged.');
