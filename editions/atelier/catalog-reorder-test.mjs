import assert from 'node:assert/strict';
import {createCatalogService} from '../../web/server/catalog-core.js';
let record=null;const catalog=createCatalogService({async read(){return structuredClone(record)},async write(value,etag){record={value:structuredClone(value),etag:String(Number(etag||0)+1)}},isConflict:()=>false});
const before=(await catalog.admin()).items.map(d=>d.id);
const drinks=(await catalog.menu()).filter(d=>d.section==='drinks').map(d=>d.id);
// Drag the last drink to the top of the drinks.
const want=[...before];const last=drinks.at(-1);want.splice(want.indexOf(last),1);want.splice(want.indexOf(drinks[0]),0,last);
const out=await catalog.reorder({ids:want});
assert.deepEqual(out.items.map(d=>d.id),want);
assert.deepEqual((await catalog.menu()).filter(d=>d.section==='drinks').map(d=>d.id),[last,...drinks.slice(0,-1)],'the guest menu follows');
assert.equal(out.audit[0].action,'reorder');
const revision=(await catalog.admin()).revision;await catalog.reorder({ids:want});assert.equal((await catalog.admin()).revision,revision,'same order writes nothing');
await assert.rejects(catalog.reorder({ids:want.slice(1)}),/刷新/);
await assert.rejects(catalog.reorder({ids:[...want.slice(1),want[1]]}),/排序无效/);
// Other edits keep the new place.
const d=(await catalog.admin()).items.find(x=>x.id===last);await catalog.save({id:last,revision:(await catalog.admin()).revision,patch:{price:d.price+1}});
assert.deepEqual((await catalog.admin()).items.map(x=>x.id),want);
console.log('PASS catalog reorder: drag order saved in one write, guest menu follows, stale lists refused, later edits keep the place.');
