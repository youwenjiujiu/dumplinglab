// One CAS-protected catalogue/inventory ledger. No client-owned stock counts.
import './order-core.js';
import {RequestError, cleanItems} from './order-core.js';
const base=structuredClone(globalThis.MENU);
const money=v=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0.01||v>9999||Math.abs(v*100-Math.round(v*100))>1e-7)throw new RequestError('价格需为 0.01–9999，最多两位小数');return v};
const text=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[<>\x00-\x1f]/.test(v))throw new RequestError('名称或文字格式无效');return v.trim()};
const initial=()=>({schema:1,revision:0,overrides:{},holds:{},audit:[]});
const held=(state,id)=>Object.values(state.holds).filter(h=>h.status==='reserved').reduce((n,h)=>n+(h.units[id]||0),0);
export function catalogView(state=initial()){
 const items=base.map((original,index)=>{
  const patch=state.overrides[original.id]||{};const d={...structuredClone(original),...patch,sort:patch.sort??index};
  if(d.variants){for(const v of Object.values(d.variants))v.price=Math.round((d.portionPrices[v.pieces]+(v.noodles?globalThis.LUNCH_NOODLE_EXTRA:0))*100)/100;d.price=Math.min(...Object.values(d.portionPrices));}
  const reserved=held(state,d.id),stock=patch.stock??null;
  return {...d,manualSoldOut:Boolean(patch.soldOut),active:patch.active!==false,stock,reserved,available:stock===null?null:Math.max(0,stock-reserved),stockUnit:d.variants?'颗':'份',soldOut:Boolean(patch.soldOut)||(stock!==null&&stock-reserved<(d.variants?Math.min(...Object.values(d.variants).map(v=>v.pieces)):1))};
 }).sort((a,b)=>a.sort-b.sort);
 return {revision:state.revision,items};
}
export function createCatalogService(storage,{now=()=>new Date()}={}){
 async function load(){return (await storage.read())?.value||initial()}
 async function change(fn){for(let n=0;n<16;n++){const current=await storage.read(),state=structuredClone(current?.value||initial());const result=fn(state);if(result===false)return state;state.revision++;try{await storage.write(state,current?.etag);return state}catch(e){if(!storage.isConflict(e))throw e}}throw new RequestError('其他人正在更新，请刷新重试',409)}
 function audit(s,action,id,details){s.audit=[{at:now().toISOString(),action,id,details},...s.audit].slice(0,200)}
 return {
  async public(){const view=catalogView(await load());return {revision:view.revision,items:view.items.map(({stock,reserved,...d})=>d)}},
  async admin(){const state=await load();return {...catalogView(state),audit:state.audit}},
  async menu(){return catalogView(await load()).items},
  async save(input){
   const original=base.find(d=>d.id===input.id);if(!original)throw new RequestError('菜品不存在',404);
   if(!Number.isInteger(input.revision))throw new RequestError('请刷新菜品列表',409);
   const p=input.patch;if(!p||typeof p!=='object'||Array.isArray(p))throw new RequestError('菜品资料无效');
   const allowed=['cn','name','flavor','section','sort','active','soldOut','price','portionPrices','stock','imageUrl'];
   if(Object.keys(p).some(k=>!allowed.includes(k)))throw new RequestError('包含不支持的字段');
   const patch={};
   for(const key of ['cn','name'])if(key in p)patch[key]=text(p[key],120);
   if('flavor' in p){if(typeof p.flavor!=='string'||p.flavor.length>500||/[<>\x00-\x1f]/.test(p.flavor))throw new RequestError('描述格式无效');patch.flavor=p.flavor.trim()}
   if('section' in p){if(!['dumplings','noodles','sides','drinks','recommended'].includes(p.section)||(original.variants&&p.section!==original.section)||(!original.variants&&['dumplings','recommended'].includes(p.section)))throw new RequestError('此分类不适用于该菜品');patch.section=p.section}
   if('sort' in p){if(!Number.isInteger(p.sort)||p.sort<0||p.sort>9999)throw new RequestError('排序必须为 0–9999');patch.sort=p.sort}
   for(const key of ['active','soldOut'])if(key in p){if(typeof p[key]!=='boolean')throw new RequestError('上下架状态无效');patch[key]=p[key]}
   if('stock' in p){if(p.stock!==null&&(!Number.isInteger(p.stock)||p.stock<0||p.stock>1000000))throw new RequestError('库存须为非负整数，或不限量');patch.stock=p.stock}
   if('price' in p){if(original.variants)throw new RequestError('请修改各份量价格');patch.price=money(p.price)}
   if('portionPrices' in p){if(!original.variants||!p.portionPrices||Object.keys(p.portionPrices).sort().join()!==Object.keys(original.portionPrices).sort().join())throw new RequestError('份量规格无效');patch.portionPrices=Object.fromEntries(Object.entries(p.portionPrices).map(([k,v])=>[k,money(v)]))}
   if('imageUrl' in p){if(typeof p.imageUrl!=='string'||p.imageUrl.length>3000)throw new RequestError('图片地址无效');if(/^\/api\/catalog-image\?id=[a-f0-9-]{36}\.(png|jpg|webp)$/.test(p.imageUrl))patch.imageUrl=p.imageUrl;else if(p.imageUrl!==''){let url;try{url=new URL(p.imageUrl)}catch{throw new RequestError('图片地址无效')}if(url.protocol!=='https:'||url.username||url.password||url.search.length>2048)throw new RequestError('图片必须使用 HTTPS 地址');patch.imageUrl=url.href}else patch.imageUrl=''}
   const state=await change(s=>{
    if(s.revision!==input.revision){
      const current=catalogView(s).items.find(d=>d.id===input.id);
      const value=key=>key==='soldOut'?current.manualSoldOut:key==='imageUrl'?current.imageUrl||'':current[key];
      // Unrelated stock reservations need not discard a staff price/name edit.
      // A field changed by another writer (including stock consumed by payment)
      // still requires the editor to refresh and review before overwriting.
      if(!input.base||Object.keys(patch).some(k=>!Object.hasOwn(input.base,k)||JSON.stringify(input.base[k])!==JSON.stringify(value(k))))throw new RequestError('修改的字段已更新，请刷新后核对再保存',409);
    }
    const count=held(s,input.id);
    if(patch.stock!==undefined&&count>0&&(patch.stock===null||patch.stock<count))throw new RequestError(`有 ${count} ${original.variants?'颗':'份'}正在付款，盘点库存不能低于预占数量，也不能改为不限量`,409);
    s.overrides[input.id]={...s.overrides[input.id],...patch};audit(s,'edit',input.id,patch)
   });
   return {...catalogView(state),audit:state.audit};
  },
  async reserve(order){
   await change(s=>{
    const previous=s.holds[order.id];const fingerprint=JSON.stringify({token:order.tokenHash,items:order.items.map(i=>[i.id,i.style,i.qty,i.price])});
    if(previous){if(previous.fingerprint!==fingerprint)throw new RequestError('库存预占与订单不一致',409);if(previous.status==='released')throw new RequestError('此付款已取消，请重新点餐',410);return false}
    const menu=catalogView(s).items;const items=cleanItems(order.items,menu);const units={};
    for(let n=0;n<items.length;n++){const i=items[n],d=menu.find(d=>d.id===i.id);if(i.price!==order.items[n].price)throw new RequestError('价格已更新，请重新核对订单',422);units[i.id]=(units[i.id]||0)+i.qty*(d.variants?.[i.style]?.pieces||1)}
    for(const [id,count] of Object.entries(units)){const d=menu.find(d=>d.id===id);if(d.available!==null&&count>d.available)throw new RequestError(`「${d.cn}」库存不足，剩余 ${d.available} ${d.stockUnit}`,409)}
    s.holds[order.id]={status:'reserved',fingerprint,units,at:now().toISOString()};
   });
  },
  async settle(order,status){
   if(!order.inventoryManaged)return;
   if(!['paid','expired'].includes(status))return;
   await change(s=>{const h=s.holds[order.id];if(!h){if(status==='expired')return false;throw new RequestError('库存预占记录缺失，请联系店员核对',409)}if(h.status==='consumed')return false;if(h.status==='released'){if(status==='paid')throw new RequestError('已释放的库存收到付款，请人工核对',409);return false}
    if(status==='paid')for(const [id,count] of Object.entries(h.units)){const patch=s.overrides[id]||{};if(patch.stock!==undefined&&patch.stock!==null){if(patch.stock<count)throw new RequestError('库存盘点异常，请人工核对',409);patch.stock-=count;s.overrides[id]=patch}}
    h.status=status==='paid'?'consumed':'released';h.settledAt=now().toISOString();audit(s,h.status,order.id,h.units);
   });
  }
 };
}
