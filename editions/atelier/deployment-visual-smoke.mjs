// No orders/calls. Only an isolated QA cart, emptied before exit.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const url=process.argv[2],protectedDeployment=process.argv.includes('--protected');
assert.match(url||'',/^https:\/\/dumplinglab-menu(?:-[a-z0-9-]+)?\.vercel\.app$/);
async function request(path,body){
  if(!protectedDeployment){const r=await fetch(url+path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return {status:r.status,text:await r.text()};}
  const config=['silent','show-error','max-time = 45','write-out = "\\n%{http_code}"'];
  if(body)config.push('request = "POST"','header = "Content-Type: application/json"',`data = ${JSON.stringify(JSON.stringify(body))}`);
  const output=await new Promise((resolve,reject)=>{
    const p=spawn('npx',['--yes','vercel@59.11.7','curl',path,'--deployment',url,'--','--config','-'],{cwd:new URL('../../web/',import.meta.url),stdio:['pipe','pipe','pipe']});
    let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',code=>code?reject(Error(`Request failed: ${path}: ${err.slice(-200)}`)):resolve(out));p.stdin.end(config.join('\n')+'\n');
  });const n=output.lastIndexOf('\n');return {status:Number(output.slice(n+1)),text:output.slice(0,n)};
}
const html=await request('/');assert.equal(html.status,200);assert.match(html.text,/data-environment="production"/);assert.doesNotMatch(html.text,/id="previewNotice"/);assert.match(html.text,/<title>Dumpling Lab<\/title>/);
for(const file of ['sharing-motion.js','receipt-motion.js','bilingual-fit.js'])assert(html.text.includes('/'+file));
assert(!html.text.includes('/cooking-motion.js'),'rejected cooking artwork must not load');
const files=await Promise.all(['/app.js','/lunch-ui.js','/sharing-motion.js','/shared-motion.js','/api/feed'].map(p=>request(p)));
assert(files.slice(0,4).every(r=>r.status===200));assert.equal(files[4].status,401);
assert(files[0].text.includes('combinationPresentation'));assert(!files[0].text.includes('What sounds good?'));
assert(html.text.includes('id="cancelSearch"'));
assert(files[0].text.includes('function searchEntries()'));
assert(files[0].text.includes('if (!search.trim()) return [];'));
assert(files[0].text.includes('if (!hasQuery) {'));
assert(files[0].text.includes('function syncVisibleViewport()'));
assert(files[0].text.includes('function lockPageScroll()'));
assert(files[0].text.includes('root.classList.contains("keyboard-open")'));
assert(files[0].text.includes('LunchMenu.ingredients(detail, detailStyle)'));
assert(files[0].text.includes('selectedDish.styles?.[0]'));
assert(!files[0].text.includes('<span>⌄</span>'));
const mobileStyles=await request('/shared-table.css');
assert.equal(mobileStyles.status,200);
assert(mobileStyles.text.includes('html.keyboard-open #sheet[open]'));
assert(mobileStyles.text.includes('body.search-open #main'));
assert(mobileStyles.text.includes('#sheet.table-entry-sheet'));
assert(mobileStyles.text.includes('.detail-ingredients'));
assert(files[1].text.includes('function ingredients(d, style)'));
const ingredientData=await request('/lunch-menu.js');
assert.equal(ingredientData.status,200);
assert(ingredientData.text.includes('ingredientSummaries'));
assert(ingredientData.text.includes('completeRecipe: false'));
assert(ingredientData.text.includes('Check the ingredient label on your chosen drink.'));
assert(!html.text.includes('noodle-turntable-v1'),'experimental turntable must not be published');
assert(!files[1].text.includes('order-progress'));assert(files[1].text.includes('edit-preparation'));
assert(files[2].text.includes('-v4.webp'));assert(!files[1].text.includes('dl-preparation-motion'));assert(!files[3].text.includes('rotateY'));
assert(!files[0].text.includes('Rotate dish photo'));
assert(!files[3].text.includes('attachPlate'));
if(!protectedDeployment){
  const assets=[...html.text.matchAll(/(?:src|href)="(\/[^"?]+\.(?:js|css))(?:\?[^" ]*)?"/g)].map(m=>m[1]);
  assets.push('/img/s/dining-together-v5.webp','/img/s/dining-separate-v5.webp','/img/s/oyster-lettuce-clean-v2.webp','/img/l/oyster-lettuce-clean-v2.webp');
  for(const [path,r] of await Promise.all(assets.map(async p=>[p,await fetch(url+p)])))assert.equal(r.status,200,path);
}
const table=('QA'+crypto.randomUUID().replaceAll('-','').slice(0,8)).toUpperCase();
const operation={opId:crypto.randomUUID(),deviceId:crypto.randomUUID(),table,group:'A',kind:'delta',dishId:'lunch-v2-chicken-cabbage',style:'煎 · 5颗',delta:1,actorName:'QA'};
try {
  const first=await request('/api/cart',operation);assert.equal(first.status,200);
  const duplicate=await request('/api/cart',operation);assert.equal(duplicate.status,200);assert.equal(JSON.parse(duplicate.text).cart.items[0].qty,1);
  const separate=await request(`/api/cart?table=${table}&group=B`);assert.equal(JSON.parse(separate.text).cart.items.length,0);
}finally{
  const cart=JSON.parse((await request(`/api/cart?table=${table}&group=A`)).text).cart;
  if(cart?.items?.length)assert.equal((await request('/api/cart',{...operation,opId:crypto.randomUUID(),delta:-cart.items[0].qty})).status,200);
}
console.log(`PASS ${url}: latest UI/assets, staff auth gate, idempotent isolated cart, group separation. ${table} emptied; no orders or staff calls.`);
