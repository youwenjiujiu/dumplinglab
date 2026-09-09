// Pure rendering checks. Optional local-only preview uses no payment or order API.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('fulfilment.js', import.meta.url), 'utf8');
const renderer = source.slice(source.indexOf('  function pickupTicket(order) {'), source.indexOf('  function refreshTicket() {'));
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base = {id:'design-preview',mode:'takeaway',status:'paid',pickup:{number:'T0061',date:'08 / 09 / 2026',qr:'preview-only'}};
const variants = [
  ['received',{}], ['preparing',{preparingAt:1}], ['ready',{preparingAt:1,readyAt:2}],
  ['collected',{preparingAt:1,readyAt:2,collectedAt:3}],
];
const htmlByStage = new Map();
for (const language of ['zh','en']) for (const [stage, times] of variants) {
  const ctx = {escapeHTML, tr:(a,b)=>language==='zh'?a:b, bi:(a,b)=>language==='zh'?a:b, store:{progressSync:{'design-preview':'synced'}},order:{...base,...times}};
  vm.createContext(ctx);
  const html = vm.runInContext(renderer+'\npickupTicket(order)',ctx);
  assert.equal((html.match(/aria-current="step"/g)||[]).length,1);
  assert.equal((html.match(/class="progress-label"/g)||[]).length,4);
  assert(html.includes(`data-stage="${stage}"`));
  assert(!/progress-docket|progress-check|progress-receipt|entry-takeaway-v1|order-dumpling-plate/.test(html),'Retired alternatives stay removed');
  assert.equal((html.match(/class="progress-generated-icon"/g)||[]).length,4);
  for(const s of ['received','preparing','ready','collected']) assert(html.includes(`/img/s/progress-${s}-${['preparing','collected'].includes(s)?'v3':'v2'}.webp`),'Each real stage uses its reviewed generated icon');
  assert(html.includes('lang="zh-CN"') && html.includes('lang="en"'));
  assert.equal(html.includes('class="pickup-qr"'),stage!=='collected');
  assert(html.indexOf('class="pickup-number"')<html.indexOf('class="pickup-progress"'));
  assert(html.indexOf('class="pickup-progress"')<html.indexOf('class="pickup-code'));
  if (language==='zh') htmlByStage.set(stage,html);
  ctx.order.mode='dinein';
  assert.equal(vm.runInContext('pickupTicket(order)',ctx),'','No fabricated dine-in preparation states');
  ctx.order={...base,status:'pending'};
  assert.equal(vm.runInContext('pickupTicket(order)',ctx),'','No unpaid pickup ticket');
  ctx.order={...base,pickup:{...base.pickup,number:'<script>bad</script>'}};
  assert(!vm.runInContext('pickupTicket(order)',ctx).includes('<script>'));
}
for (const file of ['dumpling-symbol.svg','order-packaging-lockup.svg','order-complete-seal.svg']) {
  assert((await readFile(new URL('../../web/brand/'+file,import.meta.url),'utf8')).includes('<svg'));
}
console.log('PASS illustrated pickup: four real stages, bilingual labels, current step, QR retirement, escaping, unpaid/dine-in guards, artwork assets.');
if (process.argv.includes('--preview')) {
  const demo = htmlByStage.get('ready').replace(/<img class="pickup-qr"[^>]+>/, '<div class="demo-qr">二维码区域<br>PREVIEW ONLY</div>');
  await writeFile(new URL('../../web/brand/order-progress-preview.html',import.meta.url), `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>订单进度 · 本地设计预览</title>
<link rel="stylesheet" href="/atelier.css"><link rel="stylesheet" href="/shared-table.css">
<style>body{display:block;background:#f3f3f1;margin:0;padding:16px 0;color:#262626}main{width:min(100%,440px);margin:auto;background:white;padding:22px;box-sizing:border-box}header{display:flex;align-items:center;justify-content:space-between;gap:12px}header img{width:128px}header span{font-size:12px;color:#777}h1{font:500 20px var(--sans);margin:24px 0 0}.demo-qr{display:grid;place-content:center;text-align:center;width:112px;height:112px;border:1px dashed #bbb;font-size:10px;color:#777;flex-shrink:0}.demo-note{font:11px/1.6 var(--sans);color:#777;margin-top:18px}</style>
<main><header><img src="/brand/dumpling-lab-primary.png" alt="Dumpling Lab"><span>本地设计预览</span></header><h1>订单进度 <small>Order progress</small></h1>${demo}<p class="demo-note">当前展示待取餐示例，不是真实订单，不会付款或发送厨房。实际订单进度由门店操作更新。</p></main>
</html>`);
  const preview = await readFile(new URL('../../web/brand/order-progress-preview.html',import.meta.url),'utf8');
  assert(!preview.includes('demo-tabs') && !preview.includes('data-show'), 'Preview has no status-switch buttons');
  assert.equal((preview.match(/class="pickup-ticket"/g)||[]).length, 1, 'Only one example ticket');
  console.log('Local-only preview: http://127.0.0.1:7898/brand/order-progress-preview.html (not in release allowlist)');
}
