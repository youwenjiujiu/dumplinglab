import assert from 'node:assert/strict';
import {createCatalogService,catalogView} from '../../web/server/catalog-core.js';
import {cleanItems} from '../../web/server/order-core.js';
let record=null;const storage={async read(){return structuredClone(record)},async write(value,etag){assert.equal(etag,record?.etag);record={value:structuredClone(value),etag:String(Number(etag||0)+1)}},isConflict(){return false}};
let svc=createCatalogService(storage);const id='lunch-v2-pork-chive-shrimp',get=async()=> (await svc.menu()).find(d=>d.id===id),save=async patch=>svc.save({id,revision:(await svc.admin()).revision,patch});
let d=await get();assert.deepEqual(d.preparations,['boiled','soup','red-oil','dry','soy','peanut'],'单点默认不卖煎；红油花生酱拌、酱油拌跟随红油');assert.deepEqual(d.availablePreparations,['boiled','soup','red-oil','peanut','fried'],'后台可以打开煎');assert.equal(LUNCH_RECOMMENDATIONS.find(r=>r.id==='chive-fried').dishId,'lunch-v10-pork-chive-shrimp-fried');
assert.equal((await svc.menu()).find(d=>d.id==='lunch-v10-pork-chive-shrimp-fried').active,true);
const style=(dish,prep,pieces)=>dish.styles.find(s=>dish.variants[s].prep===prep&&dish.variants[s].pieces===pieces);
for(const [method,extra] of Object.entries({boiled:0,soup:0,'red-oil':0,peanut:0}))for(const pieces of [5,9]){
 const key=style(d,method,pieces),expected=Math.round((d.portionPrices[pieces]+extra)*100)/100;
 assert.equal(d.variants[key].price,expected);assert.equal(cleanItems([{id,style:key,qty:1}],await svc.menu())[0].price,expected);
}
// 后台打开煎并设加价后，单点才出现煎。
await save({enabledPreparations:['boiled','soup','red-oil','peanut','fried'],preparationExtras:{boiled:0,soup:0,'red-oil':0,peanut:0,fried:1.5}});d=await get();
const friedStyle=style(d,'fried',5);assert.equal(d.variants[friedStyle].price,7.3);
await save({enabledPreparations:['boiled','peanut'],preparationExtras:{boiled:0,soup:1,'red-oil':1,peanut:2,fried:1.5},stock:30});
svc=createCatalogService(storage);d=await get();assert.deepEqual(d.preparations,['boiled','peanut']);assert.equal(d.variants[style(d,'peanut',9)].price,12.8);assert.equal(d.stock,30);
assert.throws(()=>cleanItems([{id,style:friedStyle,qty:1}],[d]));
await save({enabledPreparations:['fried'],portionSizes:[6,12],portionPrices:{6:7,12:11}});d=await get();assert.deepEqual(d.preparations,['fried']);assert.equal(d.variants[style(d,'fried',12)].price,12.5);
await save({preparationImageUrls:{soup:'https://example.test/soup.png'}});assert.equal((await get()).preparationImageUrls.soup,'https://example.test/soup.png');
for(const patch of [{enabledPreparations:[]},{enabledPreparations:['unknown']},{preparationExtras:{fried:-1}},{preparationExtras:{boiled:0,soup:1,'red-oil':1,peanut:1,fried:-1}}])await assert.rejects(save(patch));
const legacy=catalogView({revision:0,holds:{},overrides:{[id]:{stock:40},'lunch-v10-pork-chive-shrimp-fried':{imageUrl:'https://example.test/fried.png',stock:20}}});
assert.equal(legacy.items.find(d=>d.id===id).preparationImageUrls.fried,'https://example.test/fried.png');assert.equal(legacy.items.find(d=>d.id===id).stock,40);
assert.equal((await svc.menu()).find(d=>d.id==='lunch-v7-prawn-roe-wonton-noodles').price,8.8,'Independent noodle product is not charged again for its broth');
console.log('PASS independent fried product plus configurable filling, preparation switches, surcharges on both portions and server order validation, restart persistence, configurable counts, disabled method rejection, photo retention and reverse photo migration, independent wonton noodles unchanged.');

const before=await get(),friedId='lunch-v10-pork-chive-shrimp-fried';
await assert.rejects(svc.save({id:friedId,revision:(await svc.admin()).revision,patch:{stock:17}}),/共用库存/,'煎饺库存跟韭菜虾仁猪肉走');
await svc.save({id:friedId,revision:(await svc.admin()).revision,patch:{imageUrl:'https://example.test/separate-fried.png',portionPrices:{5:8,9:12}}});
assert.deepEqual((await get()).portionPrices,before.portionPrices);assert.equal((await get()).stock,before.stock);
const separate=(await svc.menu()).find(d=>d.id===friedId);assert.equal(separate.stock,before.stock,'煎饺显示韭菜虾仁猪肉的库存');assert.equal(separate.variants[style(separate,'fried',5)].price,8,'推荐里的煎饺不另加煎的费用');assert.equal(separate.imageUrl,'https://example.test/separate-fried.png');
console.log('PASS separate fried product price/image updates never change the configurable filling; its stock is the filling stock.');
