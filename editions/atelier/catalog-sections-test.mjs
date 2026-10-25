import assert from 'node:assert/strict';
import {createCatalogService} from '../../web/server/catalog-core.js';
import {cleanItems} from '../../web/server/order-core.js';
let record=null;const catalog=createCatalogService({async read(){return structuredClone(record)},async write(value,etag){record={value:structuredClone(value),etag:String(Number(etag||0)+1)}},isConflict:()=>false});
const keys=async()=>(await catalog.admin()).sections.map(s=>s.key);
assert.deepEqual(await keys(),['dumplings','noodles','sides','cold','drinks','recommended']);
// Add a category; it shows on the guest catalogue with both names.
let out=await catalog.saveSection({action:'section-save',cn:'甜品',en:'Desserts'});
const key=out.sections.at(-1).key;assert.match(key,/^sec-[a-f0-9]{8}$/);
assert.deepEqual((await catalog.public()).sections.at(-1),{key,cn:'甜品',en:'Desserts',builtin:false});
await assert.rejects(catalog.saveSection({action:'section-save',cn:'甜品',en:'Sweet'}),/已经有/);
await assert.rejects(catalog.saveSection({action:'section-save',cn:'<b>',en:'x'}),/中文名/);
await assert.rejects(catalog.saveSection({action:'section-save',key:'drinks',cn:'喝的',en:'x'}),/不能改名/);
// Move a dish into it: guest menu, ordering and printing all work with the new key.
const dish=(await catalog.admin()).items.find(d=>d.section==='sides'&&!d.variants);
await catalog.save({id:dish.id,revision:(await catalog.admin()).revision,patch:{section:key}});
const menu=await catalog.menu();assert.equal(menu.find(d=>d.id===dish.id).section,key);
assert.equal(cleanItems([{id:dish.id,qty:1}],menu)[0].printStation,'kitchen');
await assert.rejects(catalog.saveSection({action:'section-delete',key}),/还有 1 道菜/);
// Order: put the new category first.
await catalog.saveSection({action:'section-order',keys:[key,...(await keys()).filter(k=>k!==key)]});
assert.equal((await keys())[0],key);
await assert.rejects(catalog.saveSection({action:'section-order',keys:[key]}),/刷新/);
// Rename, then delete once empty; the dish cannot be moved into a deleted category.
await catalog.saveSection({action:'section-save',key,cn:'甜点',en:'Sweets'});
assert.equal((await catalog.admin()).sections[0].cn,'甜点');
await catalog.save({id:dish.id,revision:(await catalog.admin()).revision,patch:{section:'sides'}});
await catalog.saveSection({action:'section-delete',key});
assert.ok(!(await keys()).includes(key));
await assert.rejects(catalog.save({id:dish.id,revision:(await catalog.admin()).revision,patch:{section:key}}),/已删除/);
await assert.rejects(catalog.saveSection({action:'section-delete',key:'drinks'}),/不能删除/);
// Category discounts accept staff categories.
const added=(await catalog.saveSection({action:'section-save',cn:'汤',en:'Soups'})).sections.at(-1).key;
await catalog.saveSettings({action:'day-discount',date:globalThis.OrderPricing.shopDate(new Date()),discount:{type:'percent',value:10,sections:{[added]:0}}});
console.log('PASS catalog sections: staff add, rename, order and delete empty categories; guest catalogue, printing and discounts follow.');
