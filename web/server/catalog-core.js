// One CAS-protected catalogue/inventory ledger. No client-owned stock counts.
import './order-core.js';
import {lunchSetsView,lunchSetPatch} from './lunch-sets-core.js';
import {createHash,randomBytes} from 'node:crypto';
import {RequestError, cleanItems, printStationFor} from './order-core.js';
const base=structuredClone(globalThis.MENU);
const money=v=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0.01||v>9999||Math.abs(v*100-Math.round(v*100))>1e-7)throw new RequestError('价格需为 0.01–9999，最多两位小数');return v};
const text=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[<>\x00-\x1f]/.test(v))throw new RequestError('名称或文字格式无效');return v.trim()};
const initial=()=>({schema:1,revision:0,overrides:{},holds:{},audit:[]});
// A table discount applies to every dine-in order from that table until staff cancel it;
// a day discount applies to every dine-in table on that Singapore date.
// builderPhotos: the owner's own photo on each 自选 preparation card.
const BUILDER_CARDS=['soup','boiled','fried','dry'];
const settingsOf=state=>({tableDiscounts:{...state.settings?.tableDiscounts},dayDiscounts:{...state.settings?.dayDiscounts},builderPhotos:{...state.settings?.builderPhotos}});
const DISCOUNT_SECTIONS=['dumplings','noodles','sides','cold','drinks','recommended'];
// Built-in categories keep their names; staff add their own (key sec-xxxxxxxx) and set the order.
const BUILTIN_SECTIONS=[['dumplings','饺子／云吞','Your Choice'],['noodles','面条','Noodles'],['sides','配菜','Sides'],['cold','凉菜','Cold Dishes'],['drinks','饮品','Drinks'],['recommended','固定搭配','Recommended']];
const CUSTOM_SECTION=/^sec-[a-f0-9]{8}$/;
const sectionName=(v,max,label)=>{const t=typeof v==='string'?v.trim():'';if(!t||t.length>max||/[<>&"'\x00-\x1f]/.test(t))throw new RequestError(`请填写${label}（最多 ${max} 个字，不能包含符号 < > & " '）`);return t};
export function sectionsOf(state,items=[]){
 const custom=state.sections?.custom||{},all=[...BUILTIN_SECTIONS.map(([key,cn,en])=>({key,cn,en,builtin:true})),...Object.entries(custom).map(([key,v])=>({key,cn:v.cn,en:v.en,builtin:false}))];
 const order=(state.sections?.order||[]).filter(k=>all.some(x=>x.key===k));
 return [...order.map(k=>all.find(x=>x.key===k)),...all.filter(x=>!order.includes(x.key))].map(x=>({...x,count:items.filter(d=>d.section===x.key).length}));
}
const cleanDiscount=d=>{
 if(!d||typeof d!=='object'||!['percent','amount'].includes(d.type))throw new RequestError('请选择按百分比或固定金额打折');
 // sections: a percent per menu category (0 = no discount); with a fixed amount only 0 (left out) is allowed.
 let sections=null;
 if(d.sections!==undefined&&d.sections!==null){
  if(typeof d.sections!=='object'||Array.isArray(d.sections))throw new RequestError('分类折扣格式无效');
  sections={};
  for(const [k,v] of Object.entries(d.sections)){
   if(!DISCOUNT_SECTIONS.includes(k)&&!CUSTOM_SECTION.test(k))throw new RequestError('分类无效');
   const n=Number(v);
   if(d.type==='amount'?n!==0:(!Number.isFinite(n)||n<0||n>100||Math.abs(n*100-Math.round(n*100))>1e-7))throw new RequestError('分类折扣需为 0–100');
   sections[k]=n;
  }
  if(!Object.keys(sections).length)sections=null;
 }
 const value=d.type==='amount'?money(d.value):Number(d.value);
 if(d.type==='percent'&&(!Number.isFinite(value)||value<0||value>100||Math.abs(value*100-Math.round(value*100))>1e-7||(value===0&&!Object.values(sections||{}).some(n=>n>0))))throw new RequestError('折扣百分比需为 0.01–100');
 if(d.type==='amount'&&sections&&DISCOUNT_SECTIONS.every(k=>sections[k]===0))throw new RequestError('至少要有一个分类参与折扣');
 const note=typeof d.note==='string'?d.note.trim():'';if(note.length>60||/[<>\x00-\x1f]/.test(note))throw new RequestError('备注格式无效');
 return {type:d.type,value,...(sections?{sections}:{}),...(note?{note}:{})};
};
// Relocate metadata that was attached to the formerly shared wonton/noodle SKU.
function migrateWontonProducts(state){
 if(state.migrations?.wontonProducts7)return state;
 const oldId='lunch-v2-prawn-roe-wonton',newId='lunch-v7-prawn-roe-wonton-noodles';
 const old={...state.overrides?.[oldId]};
 if(typeof old.cn==='string'&&old.cn.includes('云吞面')){
  const moved={cn:old.cn};delete old.cn;
  if(old.imageUrl){moved.imageUrl=old.imageUrl;delete old.imageUrl;}
  if(typeof old.name==='string'&&/noodle/i.test(old.name)){moved.name=old.name;delete old.name;}
  if(typeof old.flavor==='string'&&/面|noodle/i.test(old.flavor)){moved.flavor=old.flavor;delete old.flavor;}
  state.overrides={...state.overrides,[oldId]:old,[newId]:{...moved,...state.overrides?.[newId]}};
 }
 state.migrations={...state.migrations,wontonProducts7:true};
 return state;
}
function migrateFixedFriedProducts(state){
 if(state.migrations?.fixedFried10)return state;
 const oldId='lunch-v2-pork-chive-shrimp',newId='lunch-v10-pork-chive-shrimp-fried',old={...state.overrides?.[oldId]};
 const moved={};
 // Copy the former fried price setup and its dedicated photo, never duplicate shared stock.
 for(const key of ['portionPrices','portionSizes','menuRevision','printStation'])if(old[key]!==undefined)moved[key]=structuredClone(old[key]);
 if(old.preparationImageUrls?.fried){moved.imageUrl=old.preparationImageUrls.fried;old.preparationImageUrls={...old.preparationImageUrls};delete old.preparationImageUrls.fried;}
 state.overrides={...state.overrides,[oldId]:old,[newId]:{...moved,...state.overrides?.[newId]}};
 state.migrations={...state.migrations,fixedFried10:true};return state;
}
function restoreSharedFried(state){
 if(state.migrations?.sharedFried11)return state;
 const id='lunch-v2-pork-chive-shrimp',separate=state.overrides?.['lunch-v10-pork-chive-shrimp-fried'],current=state.overrides?.[id]||{};
 const image=separate?.imageUrl||separate?.preparationImageUrls?.fried;
 if(image&&!current.preparationImageUrls?.fried)state.overrides={...state.overrides,[id]:{...current,preparationImageUrls:{...current.preparationImageUrls,fried:image}}};
 state.migrations={...state.migrations,sharedFried11:true};return state;
}
// Shared stock: a dish may draw from another dish's stock (wonton noodles use the
// wonton count; large sides use the small side's count; chive potstickers use
// the chive dumpling count). Units per portion are pieces for dumplings, else stockUnits.
// Each option (a drink, a beer flavour) may carry its own count, held under dishId#optionKey.
export const optionStockKey=(dishId,key)=>`${dishId}#${key}`;
export const stockPoolOf=(d,style)=>{const v=d.variants?.[style];return {owner:(v&&d.stockPoolByPrep?.[v.prep])||d.stockPool||d.id,per:v?.pieces||d.stockUnits||1};};
const held=(state,id)=>Object.values(state.holds).filter(h=>h.status==='reserved').reduce((n,h)=>n+(h.units[id]||0),0);
function effectivePatch(original,patch={}){
 const p={...patch};
 if(original.singleChoice===false)delete p.section;
 if(original.menuRevision&&p.menuRevision!==original.menuRevision){delete p.price;delete p.portionPrices;if(original.retired)delete p.active;}
 if(original.portionPrices?.[9]!==undefined&&p.portionPrices?.[10]!==undefined&&!p.portionSizes){p.portionPrices={...p.portionPrices,9:p.portionPrices[10]};delete p.portionPrices[10];}
 if(original.fixedPieces){delete p.portionSizes;if(p.portionPrices)p.portionPrices={ [original.fixedPieces]:p.portionPrices[original.fixedPieces]??original.portionPrices[original.fixedPieces] };}
 return p;
}
export function catalogView(state=initial()){
 state=restoreSharedFried(migrateFixedFriedProducts(migrateWontonProducts({...state,overrides:{...state.overrides},migrations:{...state.migrations}})));
 const originals=[...base,...Object.values(state.custom||{}).map(entry=>entry.item)];
 const items=originals.map((original,index)=>{
  const patch=effectivePatch(original,state.overrides[original.id]);const d={...structuredClone(original),...patch,sort:patch.sort??index};
  if(d.variants&&patch.portionSizes){
   const prices=patch.portionPrices;d.portionPrices={...original.portionPrices};globalThis.remapMenuPortions(d,patch.portionSizes);if(prices)d.portionPrices=prices;
  }
  if(d.variants){for(const v of Object.values(d.variants))v.price=Math.round((d.portionPrices[v.pieces]+(v.noodles?globalThis.LUNCH_NOODLE_EXTRA:0))*100)/100;d.price=Math.min(...Object.values(d.portionPrices));}
  globalThis.configureMenuPreparations(d);
  if(d.choiceOptions&&!d.variants){d.choiceOptions=structuredClone(d.choiceOptions);for(const o of d.choiceOptions.items||[]){const reserved=held(state,optionStockKey(d.id,o.key)),stock=o.stock??null;Object.assign(o,{stock,reserved,available:stock===null?null:Math.max(0,stock-reserved),soldOut:stock!==null&&stock-reserved<1})}}
  globalThis.applyChoiceOptions(d);
  if(d.imageUrl&&!d.img&&!d.preparations?.length)d.img=d.imageUrl;
  const owner=d.stockPool||d.id,ownerPatch=owner===d.id?patch:effectivePatch(originals.find(o=>o.id===owner)||{},state.overrides[owner]);
  const reserved=held(state,owner),stock=ownerPatch.stock??null,smallest=d.variants?Math.min(...Object.values(d.variants).map(v=>v.pieces)):d.stockUnits||1;
  return {...d,recommended:Boolean(d.recommended),preparationImageUrls:{...d.preparationImageUrls},printStation:printStationFor(d),manualSoldOut:Boolean(patch.soldOut),active:patch.active??original.active??true,stock,reserved,available:stock===null?null:Math.max(0,stock-reserved),stockUnit:d.stockUnitName||(d.variants?'颗':'份'),soldOut:Boolean(patch.soldOut)||Boolean(d.optionsSoldOut)||(stock!==null&&stock-reserved<smallest)};
 }).sort((a,b)=>a.sort-b.sort);
 return {revision:state.revision,items,lunchSets:lunchSetsView(state),sections:sectionsOf(state,items)};
}
// A per-dish promotion: percent off, a fixed special price, or 买一赠一. It may end
// at a set time; the stored list prices are never changed by it.
export const promoActive=(p,now=new Date())=>Boolean(p)&&(!p.endsAt||Date.parse(p.endsAt)>now.getTime());
export function withPromotions(items,now=new Date()){
 return items.map(item=>{
  if(!item.promo)return item;
  const d=structuredClone(item);
  if(!promoActive(d.promo,now)){delete d.promo;return d}
  const {type,value}=d.promo,off=x=>Math.round(x*(100-value))/100;
  if(type==='percent'){
   d.listPrice=d.price;d.price=off(d.price);
   for(const v of Object.values(d.variants||{})){v.listPrice=v.price;v.price=off(v.price)}
   for(const o of d.choiceOptions?.items||[])if(o.price!==null&&o.price!==undefined){o.listPrice=o.price;o.price=off(o.price)}
  }
  if(type==='price'){d.listPrice=d.price;d.price=value}
  return d;
 });
}
function cleanPromo(original,p){
 if(p===null)return null;
 if(!p||typeof p!=='object'||!['percent','price','bogo'].includes(p.type))throw new RequestError('请选择活动方式');
 const out={type:p.type};
 if(p.type==='percent'){if(!Number.isInteger(p.value)||p.value<1||p.value>99)throw new RequestError('打折请填 1–99 的整数，例如 20 = 打 8 折');out.value=p.value}
 if(p.type==='price'){
  if(original.variants)throw new RequestError('有份量规格的菜品请用打折');
  if(original.choiceOptions?.items?.some(o=>o.active&&o.price!==null&&o.price!==undefined))throw new RequestError('这道菜各选项价格不同，请用打折');
  out.value=money(p.value);if(out.value>=original.price)throw new RequestError(`特价要低于原价 S$${original.price.toFixed(2)}`);
 }
 if(p.endsAt!==null&&p.endsAt!==undefined&&p.endsAt!==''){const t=Date.parse(p.endsAt);if(typeof p.endsAt!=='string'||!Number.isFinite(t))throw new RequestError('结束时间无效');out.endsAt=new Date(t).toISOString()}
 return out;
}
function validatePatch(original,input){
 const p=input.patch;if(!p||typeof p!=='object'||Array.isArray(p))throw new RequestError('菜品资料无效');
   const allowed=['cn','name','flavor','section','sort','active','soldOut','recommended','price','portionPrices','portionSizes','enabledPreparations','preparationExtras','stock','imageUrl','preparationImageUrls','printStation','choiceOptions','promo'];
   if(Object.keys(p).some(k=>!allowed.includes(k)))throw new RequestError('包含不支持的字段');
   const patch={};
   for(const key of ['cn','name'])if(key in p)patch[key]=text(p[key],120);
   if('flavor' in p){if(typeof p.flavor!=='string'||p.flavor.length>500||/[<>\x00-\x1f]/.test(p.flavor))throw new RequestError('描述格式无效');patch.flavor=p.flavor.trim()}
   if('section' in p){if(!(['dumplings','noodles','sides','cold','drinks','recommended'].includes(p.section)||CUSTOM_SECTION.test(p.section))||(original.variants&&p.section!==original.section)||(!original.variants&&['dumplings','recommended'].includes(p.section)))throw new RequestError('此分类不适用于该菜品');patch.section=p.section}
   if('printStation' in p){if(!['kitchen','bar'].includes(p.printStation))throw new RequestError('请选择厨房出单或吧台出单');patch.printStation=p.printStation}
   if('sort' in p){if(!Number.isInteger(p.sort)||p.sort<0||p.sort>9999)throw new RequestError('排序必须为 0–9999');patch.sort=p.sort}
   for(const key of ['active','soldOut','recommended'])if(key in p){if(typeof p[key]!=='boolean')throw new RequestError('上下架状态无效');patch[key]=p[key]}
   if('stock' in p&&original.stockPool){const owner=base.find(d=>d.id===original.stockPool);throw new RequestError(`这道菜和「${owner?.cn||original.stockPool}」共用库存，请在「${owner?.cn||original.stockPool}」里盘点`)}
   if('stock' in p){if(p.stock!==null&&(!Number.isInteger(p.stock)||p.stock<0||p.stock>1000000))throw new RequestError('库存须为非负整数，或不限量');patch.stock=p.stock}
   if('price' in p){if(original.variants)throw new RequestError('请修改各份量价格');patch.price=money(p.price)}
   if('portionSizes' in p){if(original.fixedPieces&&(p.portionSizes?.length!==1||p.portionSizes[0]!==original.fixedPieces))throw new RequestError('此菜品固定每份 '+original.fixedPieces+' 颗云吞');if(!p.portionPrices)throw new RequestError('修改颗数时请同时填写各份量售价');const sizes=p.portionSizes;if(!original.variants||!Array.isArray(sizes)||sizes.length!==Object.keys(original.portionPrices).length||sizes.some(n=>!Number.isInteger(n)||n<1||n>100)||new Set(sizes).size!==sizes.length||sizes.some((n,i)=>i>0&&n<=sizes[i-1]))throw new RequestError('份量颗数须为 1–100 的整数，且从小到大、不重复');patch.portionSizes=sizes;}
   if('portionPrices' in p){if(!original.variants||!p.portionPrices||Object.keys(p.portionPrices).sort().join()!==(patch.portionSizes||Object.keys(original.portionPrices)).map(String).sort().join())throw new RequestError('份量规格无效');patch.portionPrices=Object.fromEntries(Object.entries(p.portionPrices).map(([k,v])=>[k,money(v)]))}
   if('enabledPreparations' in p){const ids=p.enabledPreparations;if(!original.availablePreparations||!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!original.availablePreparations.includes(id)))throw new RequestError('请至少开启一种有效做法');patch.enabledPreparations=ids;}
   if('preparationExtras' in p){const extras=p.preparationExtras;if(!original.availablePreparations||!extras||typeof extras!=='object'||Array.isArray(extras)||Object.keys(extras).sort().join()!==[...original.availablePreparations].sort().join())throw new RequestError('做法加价资料无效');patch.preparationExtras=Object.fromEntries(Object.entries(extras).map(([key,value])=>{if(value===0)return [key,0];return [key,money(value)]}));}
   if('preparationImageUrls' in p){
    const photos=p.preparationImageUrls,methods=original.availablePreparations||original.preparations||[];
    if(!photos||typeof photos!=='object'||Array.isArray(photos)||Object.keys(photos).length>20||Object.keys(photos).some(k=>!methods.includes(k)))throw new RequestError('做法图片资料无效');
    patch.preparationImageUrls=Object.fromEntries(Object.entries(photos).map(([method,url])=>[method,validatePatch(original,{patch:{imageUrl:url}}).imageUrl]).filter(([,url])=>url));
   }
   if('choiceOptions' in p){
    const c=p.choiceOptions;
    if(c===null)patch.choiceOptions=null;
    else{
     if(original.variants)throw new RequestError('饺子云吞请用做法和份量，不能另加选项');
     if(!c||typeof c!=='object'||!Array.isArray(c.items)||!c.items.length)throw new RequestError('请至少添加一个选项');
     if(c.items.length>20)throw new RequestError('最多 20 个选项');
     const short=(v,max,label)=>{const t=typeof v==='string'?v.trim():'';if(!t)throw new RequestError(`请填写${label}`);if(t.length>max)throw new RequestError(`${label}最多 ${max} 个字`);if(/[<>\x00-\x1f]/.test(t))throw new RequestError(`${label}不能包含 < > 等符号`);return t};
     // The category label is optional: blank means a plain "选项 / Option" heading.
     const label=(v,max,fallback,name)=>typeof v==='string'&&v.trim()?short(v,max,name):fallback;
     const items=c.items.map((o,i)=>{
      if(!o||typeof o!=='object'||typeof o.key!=='string'||!/^[a-z0-9-]{1,40}$/.test(o.key)||typeof o.active!=='boolean')throw new RequestError('选项资料无效，请刷新后重试');
      const n=`第 ${i+1} 项的`;
      if(o.stock!==null&&o.stock!==undefined&&o.stock!==''&&(!Number.isInteger(o.stock)||o.stock<0||o.stock>1000000))throw new RequestError(n+'库存须为非负整数，留空表示不限量');
      return {key:o.key,cn:short(o.cn,40,n+'中文名称'),en:short(o.en,80,n+'英文名称'),price:o.price===null||o.price===undefined||o.price===''?null:money(o.price),active:o.active,stock:o.stock===undefined||o.stock===''?null:o.stock,imageUrl:o.imageUrl?validatePatch(original,{patch:{imageUrl:o.imageUrl}}).imageUrl:''};
     });
     if(new Set(items.map(o=>o.key)).size!==items.length)throw new RequestError('选项资料无效，请刷新后重试');
     if(new Set(items.map(o=>o.cn)).size!==items.length)throw new RequestError('有两个选项的中文名称相同，请改成不同的名字');
     if(!items.some(o=>o.active))throw new RequestError('至少开启一个选项');
     patch.choiceOptions={label:{cn:label(c.label?.cn,30,'选项','选项类别'),en:label(c.label?.en,60,'Option','选项类别英文')},items};
    }
   }
   if('promo' in p)patch.promo=cleanPromo({...original,...(patch.price!==undefined?{price:patch.price}:{})},p.promo);
   if('imageUrl' in p){if(typeof p.imageUrl!=='string'||p.imageUrl.length>3000)throw new RequestError('图片地址无效');if(/^\/api\/catalog-image\?id=[a-f0-9-]{36}\.(png|jpg|webp)$/.test(p.imageUrl))patch.imageUrl=p.imageUrl;else if(p.imageUrl!==''){let url;try{url=new URL(p.imageUrl)}catch{throw new RequestError('图片地址无效')}if(url.protocol!=='https:'||url.username||url.password||url.search.length>2048)throw new RequestError('图片必须使用 HTTPS 地址');patch.imageUrl=url.href}else patch.imageUrl=''}
 return patch;
}
export function createCatalogService(storage,{now=()=>new Date()}={}){
 async function load(){return (await storage.read())?.value||initial()}
 async function change(fn){for(let n=0;n<16;n++){const current=await storage.read(),state=restoreSharedFried(migrateFixedFriedProducts(migrateWontonProducts(structuredClone(current?.value||initial()))));const result=fn(state);if(result===false)return state;state.revision++;try{await storage.write(state,current?.etag);return state}catch(e){if(!storage.isConflict(e))throw e}}throw new RequestError('其他人正在更新，请刷新重试',409)}
 function audit(s,action,id,details){s.audit=[{at:now().toISOString(),action,id,details},...s.audit].slice(0,200)}
 return {
  async public(){const state=await load(),view=catalogView(state);return {revision:view.revision,lunchSets:view.lunchSets,sections:view.sections.map(({count,...x})=>x),items:withPromotions(view.items,now()).map(({stock,reserved,...d})=>d),settings:settingsOf(state)}},
  async admin(){const state=await load();return {...catalogView(state),settings:settingsOf(state),audit:state.audit}},
  async menu(){return withPromotions(catalogView(await load()).items,now())},
  async tableDiscount(table){return globalThis.OrderPricing.discountFor(settingsOf(await load()),table,now())},
  async saveSettings(input){
   if(input.action==='day-discount'){
    const date=typeof input.date==='string'?input.date:'',today=globalThis.OrderPricing.shopDate(now());
    const day=Date.parse(date+'T00:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(day)||new Date(day).toISOString().slice(0,10)!==date)throw new RequestError('请选择有效的日期');
    if(input.discount!==null&&date<today)throw new RequestError('不能给已经过去的日期设置折扣');
    const discount=input.discount===null?null:cleanDiscount(input.discount);
    // Past days are dropped on every save so the list only shows today and later.
    const state=await change(s=>{const all=Object.fromEntries(Object.entries({...s.settings?.dayDiscounts}).filter(([d])=>d>=today));if(discount)all[date]=discount;else delete all[date];if(Object.keys(all).length>60)throw new RequestError('折扣日期太多，请先取消不用的');s.settings={...s.settings,dayDiscounts:all};audit(s,'settings',date,{dayDiscount:discount})});
    return {...catalogView(state),settings:settingsOf(state),audit:state.audit};
   }
   if(input.action==='builder-photo'){
    if(!BUILDER_CARDS.includes(input.prep))throw new RequestError('做法无效');
    const url=input.url===null?'':validatePatch({},{patch:{imageUrl:input.url}}).imageUrl;
    const state=await change(s=>{const all={...s.settings?.builderPhotos};if(url)all[input.prep]=url;else delete all[input.prep];s.settings={...s.settings,builderPhotos:all};audit(s,'settings',input.prep,{builderPhoto:url||null})});
    return {...catalogView(state),settings:settingsOf(state),audit:state.audit};
   }
   if(input.action!=='table-discount')throw new RequestError('设置项无效');
   const table=typeof input.table==='string'?input.table.trim().toUpperCase():'';if(!/^[A-Z0-9-]{1,12}$/.test(table))throw new RequestError('请填写有效的桌号');
   const discount=input.discount===null?null:cleanDiscount(input.discount);
   const state=await change(s=>{const all={...s.settings?.tableDiscounts};if(discount)all[table]=discount;else delete all[table];if(Object.keys(all).length>100)throw new RequestError('打折的桌子太多，请先取消不用的');s.settings={...s.settings,tableDiscounts:all};audit(s,'settings',table,{tableDiscount:discount})});
   return {...catalogView(state),settings:settingsOf(state),audit:state.audit};
  },
  async saveLunchSet(input){
   if(!Number.isInteger(input.revision))throw new RequestError('请刷新套餐资料',409);
   const patch=lunchSetPatch(input.key,input.patch,await this.menu());
   const state=await change(s=>{
    if(s.revision!==input.revision)throw new RequestError('资料已更新，请刷新套餐后重试',409);
    const current=lunchSetsView(s).find(x=>x.key===input.key),next={...current,...patch};
    if(next.end<=next.start)throw new RequestError('结束时间必须晚于开始时间');
    s.lunchSets||={};s.lunchSets[input.key]={...s.lunchSets[input.key],...patch};audit(s,'lunch-set-edit',input.key,patch);
   });return {...catalogView(state),audit:state.audit};
  },
  async create(input){
   if(!/^custom-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(input.id||''))throw new RequestError('新增菜品编号无效');
   const template=input.templateId?base.find(d=>d.id===input.templateId&&['dumpling','wonton'].includes(d.kind)):null;
   if(input.templateId&&!template)throw new RequestError('菜品规格模板无效');
   const original=template?structuredClone(template):{section:'sides',price:0};
   Object.assign(original,{id:input.id,cn:'',name:'',img:null,flavor:'',portion:'',meat:null,veg:false,allergens:[],ingredientInfo:{items:[],note:['食材信息请向店员确认。','Please check ingredient information with staff.'],completeRecipe:false,source:'merchant'}});
   delete original.recommended;delete original.menuRevision;delete original.retired;delete original.preparationImageUrls;delete original.preparationImages;delete original.imageUrl;delete original.best;delete original.printStation;
   const patch=validatePatch(original,input);
   if(!patch.cn||!patch.name||!(template?patch.portionPrices:patch.price))throw new RequestError('请填写中英文名称和售价');
   const fingerprint=createHash('sha256').update(JSON.stringify({templateId:input.templateId||null,patch:Object.fromEntries(Object.entries(patch).sort(([a],[b])=>a.localeCompare(b)))})).digest('hex');
   const state=await change(s=>{
    s.custom||={};
    if(patch.section&&!sectionsOf(s).some(x=>x.key===patch.section))throw new RequestError('这个分类已删除，请刷新',409);
    if(s.custom[input.id]){if(s.custom[input.id].fingerprint!==fingerprint)throw new RequestError('新增请求内容已更改，请刷新核对',409);return false}
    if(Object.keys(s.custom).length>=500)throw new RequestError('新增菜品数量已达上限');
    original.sort=base.length+Object.keys(s.custom).length;
    s.custom[input.id]={item:original,fingerprint};s.overrides[input.id]={...patch,active:patch.active??false};
    audit(s,'create',input.id,patch);
   });
   return {...catalogView(state),audit:state.audit};
  },
  // Menu categories: add or rename a staff category, delete an empty one, or set the order.
  async saveSection(input){
   if(input.action==='section-order'){
    const keys=input.keys;if(!Array.isArray(keys)||new Set(keys).size!==keys.length)throw new RequestError('分类顺序无效');
    const state=await change(s=>{const all=sectionsOf(s).map(x=>x.key);if(keys.length!==all.length||keys.some(k=>!all.includes(k)))throw new RequestError('分类已更新，请刷新',409);if(keys.join()===all.join())return false;s.sections={...s.sections,order:[...keys]};audit(s,'section-order','sections',{})});
    return {...catalogView(state),audit:state.audit};
   }
   if(input.action==='section-delete'){
    if(!CUSTOM_SECTION.test(input.key||''))throw new RequestError('自带分类不能删除');
    const state=await change(s=>{const view=catalogView(s),x=view.sections.find(x=>x.key===input.key);if(!x)return false;if(x.count)throw new RequestError(`「${x.cn}」里还有 ${x.count} 道菜，先把菜移到别的分类`,409);
     const custom={...s.sections.custom};delete custom[input.key];s.sections={...s.sections,custom,order:(s.sections.order||[]).filter(k=>k!==input.key)};audit(s,'section-delete',input.key,{cn:x.cn})});
    return {...catalogView(state),audit:state.audit};
   }
   const cn=sectionName(input.cn,12,'中文名'),en=sectionName(input.en,30,'英文名');
   if(input.key!==undefined&&!CUSTOM_SECTION.test(input.key))throw new RequestError('自带分类不能改名');
   const key=input.key||'sec-'+randomBytes(4).toString('hex');
   const state=await change(s=>{const custom={...s.sections?.custom};if(input.key&&!custom[key])throw new RequestError('这个分类已删除，请刷新',409);
    if(sectionsOf(s).some(x=>x.key!==key&&x.cn===cn))throw new RequestError(`已经有「${cn}」这个分类`,409);
    custom[key]={cn,en};s.sections={...s.sections,custom};audit(s,input.key?'section-rename':'section-create',key,{cn,en})});
   return {...catalogView(state),audit:state.audit};
  },
  // Drag-and-drop order from the back office: the full list of dish ids, top to bottom.
  async reorder(input){
   const ids=input.ids;
   if(!Array.isArray(ids)||ids.length>2000||new Set(ids).size!==ids.length)throw new RequestError('排序无效');
   const state=await change(s=>{
    const items=catalogView(s).items;
    if(ids.length!==items.length||ids.some(id=>!items.some(d=>d.id===id)))throw new RequestError('菜品列表已更新，请刷新后再拖动',409);
    let moved=0;
    ids.forEach((id,sort)=>{const d=items.find(x=>x.id===id);if(d.sort===sort)return;moved++;s.overrides[id]={...effectivePatch(d,s.overrides[id]),sort,menuRevision:d.menuRevision}});
    if(!moved)return false;
    audit(s,'reorder','menu',{count:moved});
   });
   return {...catalogView(state),audit:state.audit};
  },
  async save(input){
   const original=catalogView(await load()).items.find(d=>d.id===input.id);if(!original)throw new RequestError('菜品不存在',404);
   if(!Number.isInteger(input.revision))throw new RequestError('请刷新菜品列表',409);
   const patch=validatePatch(original,input);
   const state=await change(s=>{
    if(s.revision!==input.revision){
      const current=catalogView(s).items.find(d=>d.id===input.id);
      const value=key=>key==='soldOut'?current.manualSoldOut:key==='imageUrl'?current.imageUrl||'':current[key];
      // Unrelated stock reservations need not discard a staff price/name edit.
      // A field changed by another writer (including stock consumed by payment)
      // still requires the editor to refresh and review before overwriting.
      if(!input.base||Object.keys(patch).some(k=>!Object.hasOwn(input.base,k)||JSON.stringify(input.base[k])!==JSON.stringify(value(k))))throw new RequestError('修改的字段已更新，请刷新后核对再保存',409);
    }
    for(const o of patch.choiceOptions?.items||[]){const holding=held(s,optionStockKey(input.id,o.key));if(o.stock!==null&&o.stock<holding)throw new RequestError(`「${o.cn}」有 ${holding} 份正在付款，库存不能低于这个数`,409)}
    const count=held(s,input.id);
    if(patch.stock!==undefined&&count>0&&(patch.stock===null||patch.stock<count))throw new RequestError(`有 ${count} ${original.variants?'颗':'份'}正在付款，盘点库存不能低于预占数量，也不能改为不限量`,409);
    if(patch.section&&!sectionsOf(s).some(x=>x.key===patch.section))throw new RequestError('这个分类已删除，请刷新',409);
    s.overrides[input.id]={...effectivePatch(original,s.overrides[input.id]),...patch,menuRevision:original.menuRevision};audit(s,'edit',input.id,patch)
   });
   return {...catalogView(state),audit:state.audit};
  },
  async reserve(order){
   await change(s=>{
    const previous=s.holds[order.id];const fingerprint=JSON.stringify({token:order.tokenHash,items:order.items.map(i=>[i.id,i.style,i.qty,i.price])});
    if(previous){if(previous.fingerprint!==fingerprint)throw new RequestError('库存预占与订单不一致',409);if(previous.status==='released')throw new RequestError('此付款已取消，请重新点餐',410);return false}
    const menu=withPromotions(catalogView(s).items,now());const items=cleanItems(order.items,menu);const units={};
    // Compare the food total: 买一赠一 may split the same units into different lines.
    const food=list=>list.reduce((sum,i)=>sum+Math.round(i.price*100)*i.qty,0);
    if(food(items)!==food(order.items))throw new RequestError('价格已更新，请重新核对订单',422);
    for(let n=0;n<items.length;n++){const i=items[n],d=menu.find(d=>d.id===i.id);const pool=stockPoolOf(d,i.style);units[pool.owner]=(units[pool.owner]||0)+i.qty*pool.per;const option=globalThis.choiceOptionFor(d,i.style);if(option&&option.stock!==null&&option.stock!==undefined){const key=optionStockKey(d.id,option.key);units[key]=(units[key]||0)+i.qty}}
    for(const [id,count] of Object.entries(units)){if(id.includes('#')){const [dishId,key]=id.split('#'),d=menu.find(d=>d.id===dishId),o=d?.choiceOptions?.items?.find(o=>o.key===key);if(o&&o.available!==null&&count>o.available)throw new RequestError(`「${d.cn} · ${o.cn}」库存不足，剩余 ${o.available} 份`,409);continue}const d=menu.find(d=>d.id===id);if(d.available!==null&&count>d.available)throw new RequestError(`「${d.cn}」库存不足，剩余 ${d.available} ${d.stockUnit}`,409)}
    s.holds[order.id]={status:'reserved',fingerprint,units,at:now().toISOString()};
   });
  },
  async settle(order,status){
   if(!order.inventoryManaged)return;
   if(!['paid','expired'].includes(status))return;
   await change(s=>{const h=s.holds[order.id];if(!h){if(status==='expired')return false;throw new RequestError('库存预占记录缺失，请联系店员核对',409)}if(h.status==='consumed')return false;if(h.status==='released'){if(status==='paid')throw new RequestError('已释放的库存收到付款，请人工核对',409);return false}
    if(status==='paid')for(const [id,count] of Object.entries(h.units)){if(id.includes('#')){const [dishId,key]=id.split('#'),patch=s.overrides[dishId]||{},o=patch.choiceOptions?.items?.find(o=>o.key===key);if(o&&o.stock!==null&&o.stock!==undefined){if(o.stock<count)throw new RequestError('选项库存盘点异常，请人工核对',409);o.stock-=count;s.overrides[dishId]=patch}continue}const patch=s.overrides[id]||{};if(patch.stock!==undefined&&patch.stock!==null){if(patch.stock<count)throw new RequestError('库存盘点异常，请人工核对',409);patch.stock-=count;s.overrides[id]=patch}}
    h.status=status==='paid'?'consumed':'released';h.settledAt=now().toISOString();audit(s,h.status,order.id,h.units);
   });
  }
 };
}
