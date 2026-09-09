// Isolated browser profile and mocked payment API. Never writes restaurant orders.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out=new URL('./test-output/ui-hotfix/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 for(const width of [320,390,768]) {
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);let quote,saved,cancelled=0,prepared=false,failCancel=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/online*',async route=>{
   const r=route.request(),input=r.method()==='POST'?r.postDataJSON():null;
   if(!input&&!new URL(r.url()).searchParams.has('id'))return route.continue();
   if(input?.action==='quote') {const response=await route.fetch();quote=(await response.json()).order;return route.fulfill({response});}
   let result;
   if(input?.action==='checkout') {prepared=false;await new Promise(r=>setTimeout(r,1200));prepared=true;saved={...quote,id:input.requestId,status:'awaiting_payment'};result={ok:true,order:saved};}
   else if(input?.action==='cancel') {if(failCancel)return route.fulfill({status:409,json:{ok:false,error:'付款正在确认，请稍后查询'}});cancelled++;result={ok:true,cancelled:true};}
   else if(!input)result={ok:true,order:saved};
   else throw new Error('Unexpected payment mutation: '+input.action);
   await route.fulfill({json:result});
  });
  await page.goto('http://127.0.0.1:7898/');
  await page.locator('[data-fulfilment="takeaway"]').click();
  assert(await page.locator('#dineinControls').isHidden());
  const header=await page.locator('.masthead').boundingBox();assert(header.height<79);
  await page.locator('.dish-add[data-recommendation="chicken-fried"]').click();
  await page.locator('[data-action="add-detail"]').click();
  await page.locator('.dish-add[data-add="lunch-v2-mince-red-oil-noodles"]').click();
  const lettuce=page.getByRole('button',{name:'加一份 蚝油生菜',exact:true});await lettuce.click();
  await page.locator('#trayPictures img').first().evaluate(i=>i.decode());
  const images=await page.locator('#trayPictures img').evaluateAll(nodes=>nodes.map(i=>({src:i.getAttribute('src'),mask:getComputedStyle(i).maskImage})));
  assert(images.some(i=>i.src.includes('red-oil')&&i.mask.includes('noodle-silhouette')));
  assert(images.some(i=>i.src.includes('lettuce')&&i.mask.includes('lettuce-silhouette')));
  assert.equal(await page.locator('#trayPictures').getAttribute('tabindex'),null);
  await page.locator('.table-tray').screenshot({path:`${out}${width}-tray.png`});
  await page.locator('#tray').click();
  await page.locator('[data-action="review"]').click();
  await page.locator('.addon-dialog[open]').waitFor().catch(async e=>{console.log('CHECKOUT',await page.locator('#sheetBody').innerText(),'ERRORS',errors);throw e;});
  assert.equal(prepared,false,'Prompt visible before slow payment initialization finishes');
  assert(await page.locator('.addon-skip').isEnabled());
  await page.locator('.addon-dialog').screenshot({path:`${out}${width}-addons.png`});
  await page.locator('.addon-skip').click();assert.equal(cancelled,0);
  await page.locator('[data-checkout-pay]:enabled').waitFor();
  const total=await page.locator('[data-stripe-total]').innerText();
  await page.locator('[data-checkout-cancel]').click();
  await page.locator('.cancel-payment-dialog').screenshot({path:`${out}${width}-cancel.png`});
  await page.locator('[data-cancel-keep]').click();assert.equal(cancelled,0);
  assert.equal(await page.locator('[data-stripe-total]').innerText(),total);
  failCancel=true;
  await page.locator('[data-checkout-cancel]').click();await page.locator('[data-cancel-confirm]').click();
  await page.locator('[data-checkout-cancel]:enabled').waitFor();
  assert(await page.locator('#sheet[open]').isVisible());assert.equal(cancelled,0);
  failCancel=false;
  await page.locator('[data-checkout-cancel]:enabled').click();await page.locator('[data-cancel-confirm]').click();
  await page.locator('#sheet[open]').waitFor({state:'hidden'});assert.equal(cancelled,1);
  assert.equal(await page.locator('#trayPictures img').count(),3,'Cancelling preserves all selected dishes');
  await page.getByRole('button',{name:'加一份 水',exact:true}).click();
  assert.equal(await page.locator('#trayPictures img').count(),4,'Can add another item without paying');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`${out}${width}-menu.png`});
  assert.deepEqual(errors,[]);await context.close();
  const headContext=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'}),head=await headContext.newPage();head.setDefaultTimeout(12000);
  await head.goto('http://127.0.0.1:7898/?table=A1');
  if(await head.getByRole('button',{name:'关闭 / Close',exact:true}).isVisible())await head.getByRole('button',{name:'关闭 / Close',exact:true}).click();
  assert(await head.locator('#dineinControls').isHidden());
  assert((await head.locator('#fulfilmentButton').innerText()).includes('A1'));
  const bounds=await head.locator('.masthead button').evaluateAll(nodes=>nodes.filter(n=>!n.hidden).map(n=>({x:n.getBoundingClientRect().x,right:n.getBoundingClientRect().right,height:n.getBoundingClientRect().height})));
  assert(bounds.every(b=>b.x>=0&&b.right<=width&&b.height>=44),'Header controls fit and retain touch size');
  await head.screenshot({path:`${out}${width}-header.png`});
  await head.locator('#categoryButton').click();
  const box=await head.locator('#sheet').boundingBox(),title=await head.locator('#sheetTitle').boundingBox();
  assert(title.y-box.y<=28,'Category title starts near the top');
  await head.locator('#sheet').screenshot({path:`${out}${width}-categories.png`});
  await head.locator('#closeSheet').click();
  await head.locator('#fulfilmentButton').click();assert(await head.locator('.entry-change-table').isVisible());
  await head.locator('.entry-change-table').click();assert(await head.locator('#sheet').isVisible());
  await headContext.close();
  console.log(`PASS ${width}px: tray alpha/masks, early optional add-ons, keep/cancel failure/success, preserved cart and continued ordering. Mock payments only.`);
 }
}finally{await browser.close();}
