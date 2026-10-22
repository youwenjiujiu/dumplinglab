import assert from 'node:assert/strict';
import { summarizeOrders, cleanRange, sgDate } from '../../web/server/report-core.js';
const order = (over) => ({ type:'order', status:'paid', mode:'dinein', paidAt:'2026-10-20T04:00:00Z', total:11, foodTotal:10, serviceCharge:1, items:[], ...over });
const orders = [
  order({ id:'a', total:23.76, foodTotal:21.6, serviceCharge:2.16, items:[{id:'n1',name:'肉末葱油面',qty:1,price:9.8},{id:'n2',name:'销魂皮蛋面',qty:1,price:11.8}] }),
  order({ id:'b', total:19.01, foodTotal:21.6, discount:4.32, serviceCharge:1.73, items:[{id:'n1',name:'肉末葱油面',qty:2,price:9.8},{id:'d1',name:'韭菜虾仁猪肉',style:'水煮 · 9颗',qty:1,price:10.8}] }),
  order({ id:'c', mode:'takeaway', total:10.8, foodTotal:10.8, serviceCharge:0, refundedCents:300, items:[{id:'d1',name:'韭菜虾仁猪肉',style:'清汤 · 5颗',qty:2,price:5.4}] }),
  order({ id:'late', paidAt:'2026-10-20T16:30:00Z', total:5, items:[{id:'n1',name:'肉末葱油面',qty:1,price:5}] }), // 00:30 on the 21st in Singapore
  order({ id:'unpaid', status:'awaiting_payment', total:99, items:[{id:'n1',qty:9,price:11}] }),
  order({ id:'refunded-free', freeRewardRefunded:true, total:0 }),
  { type:'topup', status:'paid', paidAt:'2026-10-20T04:00:00Z', amountCents:5000 },
];
const r = summarizeOrders(orders, { from:'2026-10-20', to:'2026-10-20' });
assert.equal(r.totals.orders, 3, 'only paid orders on the Singapore day');
assert.equal(r.totals.grossCents, 2376 + 1901 + 1080);
assert.equal(r.totals.refundCents, 300);
assert.equal(r.totals.netCents, 2376 + 1901 + 1080 - 300);
assert.equal(r.totals.discountCents, 432); assert.equal(r.totals.serviceCents, 216 + 173);
assert.equal(r.totals.averageCents, Math.round((5357 - 300) / 3));
assert.deepEqual(r.byMode, { dinein:{orders:2,netCents:4277}, takeaway:{orders:1,netCents:780} });
assert.deepEqual(r.dishes.map(d => [d.name, d.qty, d.salesCents]), [['肉末葱油面',3,2940],['韭菜虾仁猪肉',3,2160],['销魂皮蛋面',1,1180]]);
assert.deepEqual(r.dishes[1].styles, [{style:'清汤 · 5颗',qty:2},{style:'水煮 · 9颗',qty:1}]);
const week = summarizeOrders(orders, { from:'2026-10-19', to:'2026-10-21' });
assert.deepEqual(week.byDay.map(d => [d.date, d.orders]), [['2026-10-19',0],['2026-10-20',3],['2026-10-21',1]], 'every day in range, late order on the next Singapore day');
assert.equal(sgDate('2026-10-20T16:30:00Z'), '2026-10-21');
assert.deepEqual(cleanRange({}, new Date('2026-10-20T17:00:00Z')), { from:'2026-10-21', to:'2026-10-21' }, 'default is today in Singapore');
for (const bad of [{from:'2026-10-21',to:'2026-10-20'},{from:'20261020'},{from:'2025-01-01',to:'2026-10-20'}]) assert.throws(() => cleanRange(bad), e => e.status === 400);
console.log('PASS sales summary: paid orders only, Singapore business day, refunds deducted, discount/service totals, per-mode and per-day figures, dishes ranked by portions with preparation breakdown, range validation.');
