import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCatalogService} from '../../web/server/catalog-core.js';
import {cleanItems} from '../../web/server/order-core.js';
const specification=JSON.parse(await readFile(new URL('menu-update-2026-10-20.json',import.meta.url)));
const active=MENU.filter(d=>d.active!==false),find=key=>active.find(d=>d.id.endsWith('-'+key));
// 店主 2026-10-20 最新菜单图的价格（大份是另一道菜，见配菜大小份）。
void specification;
for(const [key,price] of Object.entries({'mince-scallion-noodles':9.8,'mince-chilli-noodles':9.8,'shaanxi-hot-oil-noodles':10.8,'century-egg-noodles':11.8,'mince-red-oil-noodles':9.8,'pork-rice':5.8,'braised-tofu':6.2,'braised-pork-belly':7.2,'pork-cutlet':7.2,'chicken-wings':6.2,'fried-wontons':6.2,'cold-veg-shreds':5.8,'choy-sum':6.8,'oyster-lettuce':6.8,'century-egg-tofu':5.2,'onsen-egg':1.5,'pickled-radish':1.5,'peanut-sesame-sauce':0.5,'chilli-oil':0.5,'cucumber-tofu-soup':1.2,'barley':3.5,'lemon-tea':4.2,'sour-plum':3.9,'soft-drink':3,'water':1}))assert.equal(find(key).price,price,key);
for(const [key,price] of Object.entries({'pork-rice':9.8,'braised-tofu':10.8,'braised-pork-belly':12.5,'pork-cutlet':12.5,'chicken-wings':11.5,'fried-wontons':11.5}))assert.equal(find(key+'-large').price,price,key+' large');
assert.deepEqual(LUNCH_SINGLE_PREPARATIONS,['boiled','soup','red-oil','peanut','fried','dry','soy']);
assert.equal(LUNCH_CHOOSE_FILLING_FIRST,false);
const singles=active.filter(d=>d.singleChoice===true);assert.equal(singles.length,6);
for(const d of singles)for(const prep of (d.kind==='wonton'?['soup','red-oil','peanut']:['boiled','soup','red-oil','peanut']))for(const pieces of (d.kind==='wonton'?[5,10]:[5,9]))assert(Object.values(d.variants).some(v=>v.prep===prep&&v.pieces===pieces),`${d.cn} ${prep} ${pieces}`);
for(const d of singles)assert(!Object.values(d.variants).some(v=>v.prep==='fried'),`${d.cn} 单点不提供煎`);
const chicken=find('chicken-cabbage');assert.equal(chicken.singleChoice,false);assert.equal(chicken.section,'recommended');assert(Object.values(chicken.variants).every(v=>v.prep==='fried'));
assert(LUNCH_RECOMMENDATIONS.some(r=>r.dishId===chicken.id&&r.prep==='fried'));
assert.deepEqual(LUNCH_RECOMMENDATIONS.map(r=>r.cn),['韭菜虾仁猪肉煎饺','鸡肉包菜煎饺','红油抄手','清汤鲜肉云吞','肉末辣椒板面','销魂皮蛋面','鲜虾蟹籽云吞面','水煮饺子']);
assert.throws(()=>cleanItems([{id:chicken.id,style:'水煮 · 5颗',qty:1}]),/做法/);
for(const key of ['pork-wonton','prawn-roe-wonton']){const d=find(key),style=d.styles.find(s=>d.variants[s].prep==='soup'&&d.variants[s].pieces===10);assert.equal(cleanItems([{id:d.id,style,qty:1}])[0].price,d.portionPrices[10],'单点做法不加价')}
const catalog=createCatalogService({async read(){return null},async write(){},isConflict(){return false}});assert.equal((await catalog.menu()).filter(d=>d.singleChoice).length,6);
console.log('PASS latest menu: owner 2026-10-20 prices incl. large sides, no single fried, no preparation surcharge, filling-first flow and six preparation-specific fillings, fried-only recommended chicken, all-eight recommendations, wonton selections and server style validation.');
