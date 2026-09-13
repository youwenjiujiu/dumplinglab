// Compile the homepage's read-only display snapshot from the same assembled
// menu source as ordering. No manually maintained second menu or stock store.
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function catalogueBootstrap(assetRoot){
 const context=vm.createContext({});
 for(const name of ['menu-data.js','lunch-archive.js','lunch-menu.js','brand/menu-appetite-v1.js']){
  vm.runInContext(await readFile(resolve(assetRoot,name),'utf8'),context,{filename:name,timeout:3000});
 }
 const fields=['id','cn','name','price','kind','img','active','soldOut','imageUrl'];
 const menu=Array.from(context.MENU,d=>Object.fromEntries(fields.filter(key=>d[key]!==undefined).map(key=>[key,d[key]])));
 const recommendations=Array.from(context.LUNCH_RECOMMENDATIONS,r=>({...r}));
 const artwork=Object.fromEntries(recommendations.filter(r=>context.DL_MENU_ART[r.img]).map(r=>[r.img,context.DL_MENU_ART[r.img]]));
 const data={MENU:menu,LUNCH_RECOMMENDATIONS:recommendations,LUNCH_NOODLE_EXTRA:context.LUNCH_NOODLE_EXTRA,DL_MENU_ART:artwork};
 // Standalone external JavaScript, safely escaped even if catalogue copy later
 // includes script-like text. The live catalogue reader remains authoritative.
 return '// Generated from the assembled ordering catalogue; do not edit.\nObject.assign(globalThis,'+JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+');\n';
}
