import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
import '../../web/menu-data.js';
import '../../web/lunch-menu.js';
import '../../web/brand/menu-appetite-v1.js';
const expected=new Set([...MENU.filter(d=>d.active!==false).flatMap(d=>[d.img,...Object.values(d.preparationImages||{})]),...LUNCH_RECOMMENDATIONS.map(r=>r.img),...LUNCH_PREPARATIONS.filter(p=>LUNCH_SINGLE_PREPARATIONS.includes(p.id)).map(p=>p.img)].filter(Boolean));
// Retired dishes keep their mapping so old receipts still show the reviewed photo.
assert.deepEqual([...expected].filter(img=>!DL_MENU_ART[img]),[],'Every current dish/preparation image has a reviewed replacement');
const source=await readFile(new URL('app.js',import.meta.url),'utf8');
const photo=vm.runInNewContext(source.slice(source.indexOf('const combinationPresentation ='),source.indexOf('const description ='))+'\nphoto;',{LUNCH_RECOMMENDATIONS,LUNCH_PREPARATIONS,DL_MENU_ART});
for(const [original,replacement] of Object.entries(DL_MENU_ART)){
  assert.notEqual(original,replacement);
  for(const size of ['s','l'])await access(new URL('../../web/img/'+size+'/'+replacement.replace(/\.[^.]+$/,'.webp'),import.meta.url));
  assert.equal(photo({img:original},'s'),'/img/s/'+replacement.replace(/\.[^.]+$/,'.webp'));
}
for(const r of LUNCH_RECOMMENDATIONS.filter(r=>r.dishId)){
 const d=MENU.find(d=>d.id===r.dishId);
 for(const style of (d.styles||[]).filter(s=>d.variants[s].prep===r.prep&&Boolean(d.variants[s].noodles)===Boolean(r.noodles)))assert.equal(photo(r,'l'),photo(d,'l',style));
}
assert.equal(photo({img:'legacy-photo.png'},'l'),'/img/l/legacy-photo.webp','Unmapped historical artwork remains intact');
const chilli=MENU.find(d=>d.id==='lunch-v2-mince-chilli-noodles'),redOil=MENU.find(d=>d.id==='lunch-v2-mince-red-oil-noodles');
assert.notEqual(chilli.img,redOil.img,'Distinct noodle dishes cannot reuse one base photo');
for(const size of ['s','l'])assert.notEqual(photo(chilli,size),photo(redOil,size),'Both list and detail must use separate noodle artwork');
console.log(`PASS ${Object.keys(DL_MENU_ART).length} artwork mappings, both sizes, recommendation/detail consistency, original fallback`);
