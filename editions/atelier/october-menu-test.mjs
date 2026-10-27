import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCatalogService,catalogView} from '../../web/server/catalog-core.js';
import {cleanItems} from '../../web/server/order-core.js';
const current=MENU.filter(d=>d.active!==false);
assert.equal(current.length,41);
const by=key=>current.find(d=>d.id.endsWith('-'+key));
// 2026-10-20 最新菜单：饺子和固定煎饺 5/9 颗，云吞 5/10 颗，云吞面固定 5 颗。
for(const d of current.filter(d=>d.variants)){
 const counts=d.fixedPieces?['5']:d.kind==='wonton'?['5','10']:['5','9'];
 assert.deepEqual(Object.keys(d.portionPrices),counts,d.cn);
 assert(Object.values(d.variants).every(v=>counts.includes(String(v.pieces))),d.cn);
 assert(!Object.values(d.variants).some(v=>v.noodles&&!v.recommendationOnly));
}
for(const [key,price] of [['mince-chilli-noodles',9.8],['braised-pork-belly',7.2],['century-egg-tofu',5.2],['onsen-egg',1.5],['sour-plum',3.9]])assert.equal(by(key).price,price);
assert.equal(by('pork-corn').cn,'猪肉玉米');
assert.equal(LUNCH_SETS.length,2);
for(const set of LUNCH_SETS){assert.equal(set.price,null);assert.equal(set.orderable,false);assert.throws(()=>cleanItems([{id:set.key,qty:1}]),/菜单/)}
assert.equal(LUNCH_SETS[0].includedColdDish,'cold-veg-shreds');assert.equal(LUNCH_SETS[0].optionalNoodlesExtra,2.5);
assert.equal(LUNCH_SETS[1].sideDumplings,null);
assert.equal(LUNCH_SET_AVAILABILITY.start,'11:00');assert.equal(LUNCH_SET_AVAILABILITY.end,'15:00');assert.equal(LUNCH_SET_AVAILABILITY.requiresRestaurantOpen,true);
const state={schema:1,revision:0,holds:{},audit:[],overrides:{[by('chicken-cabbage').id]:{portionPrices:{5:99,9:999},imageUrl:'https://example.test/photo.png',stock:25},[by('sour-plum').id]:{price:9}}};
const migrated=catalogView(state).items.find(d=>d.id===by('chicken-cabbage').id);
assert.deepEqual(migrated.portionPrices,{5:5.8,9:9.2});assert.equal(migrated.imageUrl,'https://example.test/photo.png');assert.equal(migrated.stock,25);
assert.equal(catalogView(state).items.find(d=>d.id===by('sour-plum').id).price,3.9);
let record={value:state,etag:'0'};
const service=createCatalogService({async read(){return structuredClone(record)},async write(value,etag){assert.equal(etag,record.etag);record={value:structuredClone(value),etag:String(+record.etag+1)}},isConflict(){return false}});
const d=by('chicken-cabbage'),ten=d.styles.find(s=>d.variants[s].pieces===9&&d.variants[s].prep==='fried');
assert.throws(()=>cleanItems([{id:d.id,style:'煎 · 10颗',qty:1}]),/做法/);
await service.reserve({id:randomUUID(),tokenHash:'local-test',items:[{id:d.id,style:ten,qty:2,price:9.2}]});
assert.equal((await service.menu()).find(x=>x.id===d.id).available,7,'Two large portions reserve 18 pieces');
await service.save({id:d.id,revision:(await service.admin()).revision,patch:{cn:'鸡肉包菜'}});
assert.deepEqual((await service.menu()).find(x=>x.id===d.id).portionPrices,{5:5.8,9:9.2},'Editing names cannot revive stale price overrides');
await service.save({id:d.id,revision:(await service.admin()).revision,patch:{portionPrices:{5:6,9:10}}});
assert.equal((await service.menu()).find(x=>x.id===d.id).variants[ten].price,10);
for(const retired of MENU.filter(d=>d.retired))assert.equal((await service.menu()).find(x=>x.id===retired.id).active,false);
console.log('PASS October menu: 41 active dishes, 5/9 dumpling and 5/10 wonton prices, no standalone noodle add-on, unpriced sets rejected, stock and merchant-photo preservation, stale price migration, later merchant price edits.');
