import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createCatalogService} from '../../web/server/catalog-core.js';
import {createTableStore} from '../../web/server/table-state.js';
import {createOnlineService} from '../../web/server/online-core.js';
function memory(){let record=null;return {async read(){await Promise.resolve();return structuredClone(record)},async write(value,etag){if(record?.etag!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});record={value:structuredClone(value),etag:String(Number(record?.etag||0)+1)}},isConflict:e=>e.conflict}}
const store=memory(),catalog=createCatalogService(store);
const originalCount=(await catalog.menu()).length;
const input={id:'custom-'+randomUUID(),patch:{cn:'测试凉菜',name:'Test Cold Dish',section:'cold',printStation:'bar',price:4.5,stock:2,imageUrl:'/api/catalog-image?id='+randomUUID()+'.png'}};
let view=await catalog.create(input);
assert.equal(view.items.length,originalCount+1);let item=view.items.find(d=>d.id===input.id);
assert.equal(item.active,false,'New dishes default to off menu');assert.equal(item.img,item.imageUrl);
assert.equal((await catalog.create(input)).items.length,originalCount+1,'Retries do not duplicate a dish');
await assert.rejects(catalog.create({...input,patch:{...input.patch,price:5}}),e=>e.status===409);
await assert.rejects(catalog.create({...input,id:'custom-'+randomUUID(),patch:{...input.patch,price:-1}}),/价格/);
await assert.rejects(catalog.create({...input,id:'custom-'+randomUUID(),patch:{...input.patch,cn:'<script>'}}),/格式/);
await catalog.save({id:input.id,revision:view.revision,patch:{active:true}});
const template=(await catalog.menu()).find(d=>d.kind==='dumpling');
const dumplingInput={id:'custom-'+randomUUID(),templateId:template.id,patch:{cn:'新饺子',name:'New dumplings',section:'dumplings',portionPrices:{5:6.5,9:10},active:true}};
view=await catalog.create(dumplingInput);item=view.items.find(d=>d.id===dumplingInput.id);
assert.equal(item.stockUnit,'颗');assert.equal(item.variants[item.styles.find(k=>item.variants[k].pieces===9)].price,10);assert(!Object.values(item.variants).some(v=>v.noodles),'New templates do not inherit standalone noodle add-ons');
assert.equal(item.img,null,'New dishes do not reuse template food images');assert.deepEqual(item.ingredientInfo.items,[],'Never inherit a different recipe');
const extra={id:'custom-'+randomUUID(),patch:{cn:'另一道',name:'Another dish',price:3,section:'drinks'}};
await Promise.all([catalog.create(extra),catalog.create(extra)]);
assert.equal((await catalog.menu()).filter(d=>d.id===extra.id).length,1);
assert((await createCatalogService(store).menu()).some(d=>d.id===input.id),'Created items survive service reload');
const records=new Map();const tables=createTableStore({
 async read(path){return structuredClone(records.get(path)||null)},async write(path,value,etag){if((records.get(path)?.etag||null)!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});records.set(path,{value:structuredClone(value),etag:randomUUID()})},isConflict:e=>e.conflict,
 async all(){return [...records.values()].map(r=>r.value)}
},{menu:()=>catalog.menu(),async read(){return {operations:[],orders:[]}},async feed(){return {events:[],activeIds:[]}},async resolve(){}});
const op={opId:randomUUID(),deviceId:randomUUID(),table:'QACREATE',group:'A',kind:'delta',dishId:input.id,delta:1};
let cart=await tables.mutate(op);assert.equal(cart.items[0].id,input.id);
const before=cart.version;
await catalog.save({id:input.id,revision:(await catalog.admin()).revision,patch:{price:4.8}});
cart=await tables.cart(op.table,op.group,before);assert.notEqual(cart.unchanged,true,'Catalogue edits invalidate cached cart response');
const onlineRecords=new Map();
const online=createOnlineService({inventory:catalog,dining:tables,config:{origin:'https://example.test',locations:[]},storage:{
 async read(id){return structuredClone(onlineRecords.get(id)||null)},async write(id,value,etag){if(onlineRecords.get(id)?.etag!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});onlineRecords.set(id,{value:structuredClone(value),etag:randomUUID()})},isConflict:e=>e.conflict,async all(){return [...onlineRecords.values()].map(r=>r.value)}
},payment:{ensureReady(){},async create(o){return {id:'cs_'+o.id,client_secret:'test'}},async expire(){return {status:'expired',payment_status:'unpaid'}}}});
const order={requestId:randomUUID(),token:randomBytes(32).toString('hex'),mode:'dinein',table:op.table,group:op.group,cartOpIds:cart.opIds,items:cart.items,expectedTotal:5.28}; // 4.80 + 10% dine-in service charge
await online.checkout({...order,items:order.items.map(i=>({...i,printStation:'kitchen'}))});
await catalog.save({id:input.id,revision:(await catalog.admin()).revision,patch:{printStation:'kitchen'}});
await online.paymentEvent({id:'cs_'+order.requestId,metadata:{dumpling_order_id:order.requestId},currency:'sgd',amount_total:528,payment_status:'paid'});
await online.paymentEvent({id:'cs_'+order.requestId,metadata:{dumpling_order_id:order.requestId},currency:'sgd',amount_total:528,payment_status:'paid'});
cart=await tables.cart(op.table,op.group);assert.equal(cart.items.length,0);assert.equal(cart.orders.length,1);assert.equal(cart.orders[0].items[0].name,'测试凉菜');
assert.equal(cart.orders[0].items[0].printStation,'bar','Paid receipt retains trusted checkout destination despite forged input and later configuration edits');
assert.equal((await catalog.menu()).find(d=>d.id===input.id).stock,1,'Paid custom SKU consumes inventory once');
assert((await tables.feed()).events.some(e=>e.id===order.requestId));
console.log('PASS create catalogue: validation, default inactive, idempotent concurrent creates, persistent edits, variant pricing, image/recipe isolation, dynamic dining cart, paid receipt/staff feed, inventory exactly once. No production calls.');
