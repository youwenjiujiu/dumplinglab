import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {launchBrowser} from './browser-test-runtime.mjs';
const browser=await launchBrowser();
const out=new URL('test-output/refund-items/',import.meta.url);await mkdir(out,{recursive:true});
try {
 const page=await browser.newPage({viewport:{width:1100,height:900}});
 await page.goto('http://127.0.0.1:7898/catalog-admin.html');
 await page.setContent('<main><section id="reportPanel"></section></main>');
 await page.addStyleTag({content:await readFile(new URL('../../web/catalog-admin.css',import.meta.url),'utf8')});
 await page.addScriptTag({content:await readFile(new URL('../../web/report-admin.js',import.meta.url),'utf8')});
 await page.evaluate(()=>{
  const day=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
  const order={id:'test-order',no:'3852',mode:'dinein',table:'B9',at:new Date().toISOString(),canRefund:true,totalCents:1980,refundCents:0,items:[{name:'鲜虾蟹籽云吞面',style:'清汤 · 5颗云吞',qty:2}],refundItems:{rows:[{line:0,name:'鲜虾蟹籽云吞面',style:'清汤 · 5颗云吞',qty:2,used:0,unitCents:[990,990]}]}};
  globalThis.sent=[];
  ReportAdmin.load(async(url,options)=>{if(options){sent.push(JSON.parse(options.body));return {}}return {report:{range:{from:day,to:day},totals:{orders:1,netCents:1980,averageCents:1980,items:2,foodCents:2000,discountCents:200,serviceCents:180,refundCents:0},byMode:{dinein:{orders:1,netCents:1980}},byDay:[],dishes:[],orders:[order]}}});
 });
 await page.locator('[data-refund-order]').click();
 await page.locator('[data-refund-line]').selectOption('1');
 assert.equal(await page.locator('[name=amount]').inputValue(),'9.90');
 await page.locator('[name=reason]').fill('菜品售罄');
 await page.screenshot({path:new URL('desktop.png',out).pathname,fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.locator('.report-refund-form').screenshot({path:new URL('phone.png',out).pathname});
 await page.locator('.report-refund-form [type=submit]').click();
 await page.waitForFunction(()=>sent.length===1);
 assert.deepEqual(await page.evaluate(()=>({items:sent[0].items,amount:sent[0].amountCents})),{items:[{line:0,qty:1}],amount:990});
 console.log('PASS refund UI: select quantity, automatic S$9.90, selected items submitted; desktop/mobile screenshots saved.');
} finally {await browser.close()}
