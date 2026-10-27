import {RequestError} from './order-core.js';
const defaults=structuredClone(globalThis.LUNCH_SETS);
const text=(v,max=160)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[<>\x00-\x1f]/.test(v))throw new RequestError('套餐文字格式无效');return v.trim()};
const cash=v=>{if(typeof v!=='number'||!Number.isFinite(v)||v<.01||v>9999||Math.abs(v*100-Math.round(v*100))>1e-7)throw new RequestError('价格须为 0.01–9999，最多两位小数');return v};
// 小菜 (sideChoices): dish IDs from 配菜/凉菜. One is included as is; several let the customer pick one.
// Before the back office chose them, the dumpling set came with its one cold dish.
const legacySides=s=>{const id=s.key==='dumpling-set'&&(globalThis.MENU||[]).find(d=>d.id.endsWith('-'+s.includedColdDish))?.id;return id?[id]:[]};
export function lunchSetsView(state={}){
 return defaults.map(s=>({...structuredClone(s),sideChoices:legacySides({...s,...state.lunchSets?.[s.key]}),cn:s.key==='dumpling-set'?'饺子午市套餐':'面条午市套餐',description:'',descriptionEn:'',visible:false,imageUrl:'',start:'11:00',end:'15:00',...structuredClone(state.lunchSets?.[s.key]||{}),orderable:false,options:{fillingChoices:s.fillingChoices,noodleChoices:s.noodleChoices,drinkChoices:s.drinkChoices,sideDumplings:s.sideDumplings,preparationChoices:s.preparationChoices}}));
}
export function lunchSetPatch(key,patch,menu){
 const original=defaults.find(s=>s.key===key);if(!original||!patch||typeof patch!=='object'||Array.isArray(patch))throw new RequestError('午市套餐不存在或资料无效');
 const allowed=['cn','name','description','descriptionEn','price','visible','imageUrl','start','end','fillingChoices','noodleChoices','drinkChoices','sideFillingChoices','includedColdDish','sideChoices','optionalNoodlesExtra','preparationKeys'];
 if(Object.keys(patch).some(k=>!allowed.includes(k)))throw new RequestError('包含不支持的套餐字段');
 const p={};
 for(const k of ['cn','name'])if(k in patch)p[k]=text(patch[k]);
 for(const k of ['description','descriptionEn'])if(k in patch)p[k]=patch[k]===''?'':text(patch[k],500);
 if('price' in patch)p.price=patch.price===null?null:cash(patch.price);
 if('optionalNoodlesExtra' in patch){if(key!=='dumpling-set')throw new RequestError('仅饺子套餐可加面');p.optionalNoodlesExtra=cash(patch.optionalNoodlesExtra)}
 if('visible' in patch){if(typeof patch.visible!=='boolean')throw new RequestError('展示状态无效');p.visible=patch.visible}
 if('imageUrl' in patch){const url=patch.imageUrl;if(typeof url!=='string'||url.length>3000)throw new RequestError('套餐图片地址无效');if(url===''||/^\/api\/catalog-image\?id=[a-f0-9-]{36}\.(png|jpg|webp)$/.test(url))p.imageUrl=url;else{let u;try{u=new URL(url)}catch{throw new RequestError('套餐图片地址无效')}if(u.protocol!=='https:'||u.username||u.password)throw new RequestError('套餐图片必须使用 HTTPS');p.imageUrl=u.href}}
 for(const k of ['start','end'])if(k in patch){if(typeof patch[k]!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(patch[k]))throw new RequestError('供应时间无效');p[k]=patch[k]}
 const has=key=>menu.some(d=>d.active!==false&&d.id.endsWith('-'+key));
 for(const field of ['fillingChoices','noodleChoices','drinkChoices','sideFillingChoices','preparationKeys'])if(field in patch){
  const values=patch[field],pool=field==='sideFillingChoices'?original.sideDumplings?.fillingChoices:field==='preparationKeys'?original.preparationChoices?.map(p=>p.key):original[field];
  if(!pool||!Array.isArray(values)||!values.length||values.length>pool.length||new Set(values).size!==values.length||values.some(v=>!pool.includes(v)||(field!=='preparationKeys'&&!has(v))))throw new RequestError('请至少选择一个有效的套餐选项');
  if(field==='sideFillingChoices')p.sideDumplings={...original.sideDumplings,fillingChoices:values};
  else if(field==='preparationKeys')p.preparationChoices=original.preparationChoices.filter(x=>values.includes(x.key));
  else p[field]=values;
 }
 if('sideChoices' in patch){const v=patch.sideChoices;if(!Array.isArray(v)||v.length>20||new Set(v).size!==v.length||v.some(id=>typeof id!=='string'||!menu.some(d=>d.id===id&&d.active!==false&&['sides','cold'].includes(d.section))))throw new RequestError('请选择有效小菜');p.sideChoices=[...v]}
 if('includedColdDish' in patch){if(key!=='dumpling-set'||typeof patch.includedColdDish!=='string'||!menu.some(d=>d.active!==false&&d.section==='cold'&&d.id.endsWith('-'+patch.includedColdDish)))throw new RequestError('请选择有效凉菜');p.includedColdDish=patch.includedColdDish}
 return p;
}
