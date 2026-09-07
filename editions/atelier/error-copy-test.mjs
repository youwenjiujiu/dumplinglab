import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import './error-copy.js';
const {message}=globalThis.OrderErrors;
const source=await readFile(new URL('./error-copy.js',import.meta.url),'utf8');
// Every declared pair must be available both ways, preserving its specific remedy.
const pairs=[...source.matchAll(/^    \['([^']+)', '([^']+)'\],?$/gm)];
assert(pairs.length>=35);
for(const [,zh,en] of pairs){assert.equal(message(new Error(zh),'en'),en);assert.equal(message(new Error(en),'zh'),zh);}
const error=Object.assign(new Error('价格已更新，请重新核对订单'),{status:422,code:'PRICE_CHANGED',cart:{id:'unchanged'}});
assert.match(message(error,'en'),/updated total/);
assert.equal(error.status,422);assert.equal(error.code,'PRICE_CHANGED');assert.equal(error.message,'价格已更新，请重新核对订单');
assert.deepEqual(error.cart,{id:'unchanged'});
assert.match(message(new Error('原付款状态需门店核实，请勿重新付款'),'en'),/Do not pay again/);
for(const field of ['姓名','手机号码','邮编','配送地址'])assert(!/[\u3400-\u9fff]/.test(message(new Error(`请填写有效的${field}`),'en')));
const catalogue=[{cn:'鸡肉包菜',name:'Chicken & Cabbage Dumplings'}];
for(const raw of ['「鸡肉包菜」已售罄，请返回菜单修改','「鸡肉包菜」的数量无效','请选择「鸡肉包菜」的做法和份量','「鸡肉包菜」的做法无效']) {
  const result=message(new Error(raw),'en',catalogue);
  assert(result.includes(catalogue[0].name));assert(!/[\u3400-\u9fff]/.test(result));
}
for(const raw of ['Failed to fetch','Load failed','NetworkError'])assert.match(message(new Error(raw),'en'),/Check your order status/);
assert.match(message({name:'TimeoutError'},'zh'),/网络连接中断/);
for(const raw of ['Unexpected token < in JSON','secret database stack detail','未知服务错误']) {
  assert(!message(new Error(raw),'en').includes(raw));assert.match(message(new Error(raw),'en'),/contact the restaurant/);
}
console.log(`PASS bilingual error copy: ${pairs.length} precise remedies, dynamic dishes/fields, safe unknown/network fallback, immutable order metadata.`);
