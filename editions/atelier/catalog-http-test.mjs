// Only run against the dedicated, simulated catalogue preview, never production.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
const origin='http://127.0.0.1:7905';
const auth='Basic '+Buffer.from('staff:preview-only').toString('base64');
async function api(path,body,authenticated=false){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(authenticated?{authorization:auth}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,out:await r.json()}}
const config=(await api('/api/online')).out.config;assert.equal(config.preview,true,'Isolated simulated backend required');
assert.equal((await api('/api/catalog?admin=1')).status,401);
assert.equal((await api('/api/catalog',{id:'x',revision:0,patch:{}})).status,401);
const initial=(await api('/api/catalog?admin=1',null,true)).out;assert.equal(initial.items.length,35);
const d=initial.items.find(d=>!d.variants);
async function save(patch){const current=(await api('/api/catalog?admin=1',null,true)).out;const result=await api('/api/catalog',{id:d.id,revision:current.revision,patch},true);assert.equal(result.status,200,JSON.stringify(result.out));return result.out}
await save({cn:'库存接口测试',name:'Inventory HTTP test',price:8,stock:1,active:true,soldOut:false});
let menu=(await api('/api/catalog')).out;assert.equal(menu.items.find(i=>i.id===d.id).price,8);assert(!('audit' in menu));assert(!('stock' in menu.items[0]));
assert.equal((await api('/api/catalog',{id:d.id,revision:initial.revision,patch:{price:1}},true)).status,409);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9QAAAABJRU5ErkJggg==','base64');
const uploaded=await fetch(origin+'/api/catalog-image',{method:'POST',headers:{authorization:auth,'content-type':'image/png'},body:png});assert.equal(uploaded.status,200);const image=await uploaded.json();assert.match(image.url,/^\/api\/catalog-image\?id=/);
assert.deepEqual(Buffer.from(await(await fetch(origin+image.url)).arrayBuffer()),png);
await save({imageUrl:image.url});assert.equal((await api('/api/catalog')).out.items.find(i=>i.id===d.id).imageUrl,image.url);
assert.equal((await fetch(origin+'/api/catalog-image',{method:'POST',headers:{authorization:auth},body:'<svg />'})).status,400);
const order=()=>({action:'checkout',requestId:randomUUID(),token:randomBytes(32).toString('hex'),mode:'takeaway',pickupLocation:config.locations[0].id,items:[{id:d.id,qty:1}],expectedTotal:8});
const inputs=[order(),order()];const outcomes=await Promise.all(inputs.map(input=>api('/api/online',input)));assert.equal(outcomes.filter(r=>r.status===200).length,1);
const index=outcomes.findIndex(r=>r.status===200),winner=inputs[index];
assert.equal((await api('/api/catalog')).out.items.find(i=>i.id===d.id).available,0);
assert.equal((await api('/api/online',{action:'cancel',requestId:winner.requestId,token:winner.token})).status,200);
assert.equal((await api('/api/catalog')).out.items.find(i=>i.id===d.id).available,1);
const retry=order();assert.equal((await api('/api/online',retry)).status,200);
assert.equal((await api('/api/online',{action:'preview-pay',requestId:retry.requestId,token:retry.token})).status,200);
assert.equal((await api('/api/online',{action:'preview-pay',requestId:retry.requestId,token:retry.token})).status,200);
const final=(await api('/api/catalog?admin=1',null,true)).out.items.find(i=>i.id===d.id);assert.equal(final.stock,0);assert.equal(final.reserved,0);
// Cancel any losing draft that made it as far as order creation, then restore
// only this test's dish so the interactive local preview retains its real menu.
await api('/api/online',{action:'cancel',requestId:inputs[1-index].requestId,token:inputs[1-index].token});
await save({cn:d.cn,name:d.name,price:d.price,stock:d.stock,active:d.active,soldOut:d.manualSoldOut,imageUrl:d.imageUrl||''});
for(const path of ['/catalog-admin.html','/catalog-admin.js','/catalog-admin.css','/catalog-client.js'])assert.equal((await fetch(origin+path)).status,200);
console.log('PASS isolated HTTP: staff auth, persistent edits, public catalogue, image upload/read, last-item race, cancel release, verified simulated payment deduction, restore test dish; zero production writes');
