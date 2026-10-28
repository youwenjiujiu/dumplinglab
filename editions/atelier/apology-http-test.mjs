import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {randomUUID,randomBytes} from 'node:crypto';
const data=await mkdtemp(tmpdir()+'/dl-apology-http-');
const bootstrap=`const OriginalDate=Date;globalThis.Date=class extends OriginalDate{constructor(...a){super(...(a.length?a:['2026-10-28T12:00:00Z']))}static now(){return OriginalDate.parse('2026-10-28T12:00:00Z')}};import(${JSON.stringify(new URL('preview.mjs',import.meta.url).href)});`;
const child=spawn(process.execPath,['--input-type=module','-e',bootstrap],{env:{...process.env,PORT:'0',DL_PREVIEW_DATA:data,DL_PREVIEW_TEST_MEMBER:'1'},stdio:['ignore','pipe','pipe']});
try{
 const base=await new Promise((resolve,reject)=>{let logs='';const timer=setTimeout(()=>reject(Error('Preview timeout')),10000);child.stdout.on('data',b=>{logs+=b;const match=logs.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0])}});child.once('exit',c=>reject(Error('Preview exited '+c)))});
 const staff={authorization:'Basic '+Buffer.from('staff:preview-only').toString('base64')},member={cookie:'dl-preview-member=fixture'};
 async function call(path,body,headers={},expected=200){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...headers,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const out=await r.json();assert.equal(r.status,expected,JSON.stringify(out));return out;}
 await call('/api/apology?admin=1',null,{},401);
 await call('/api/apology',{action:'grant'},{},401);
 await call('/api/apology',{action:'request',orderNo:'0000'},{},401);
 const table='C2';let cart=(await call('/api/cart?table=C2&group=A')).cart;
 cart=(await call('/api/cart',{table,group:'A',tableSession:cart.tableSession,opId:randomUUID(),deviceId:randomUUID(),kind:'delta',dishId:'lunch-v2-barley',delta:1})).cart;
 const payment={requestId:randomUUID(),token:randomBytes(32).toString('hex')};
 const started=await call('/api/online',{...payment,mode:'dinein',table,group:'A',tableSession:cart.tableSession,items:cart.items,cartOpIds:cart.opIds});
 await call('/api/online',{...payment,action:'preview-pay'});
 const request=await call('/api/apology',{action:'request',orderNo:started.order.no},member);
 const catalog=(await call('/api/catalog')).items;const dish=catalog.find(d=>d.id==='lunch-v2-pork-scallion');const style=Object.keys(dish.variants).find(k=>dish.variants[k].prep==='boiled'&&dish.variants[k].pieces===5&&!dish.variants[k].noodles);
 const grant={action:'grant',requestId:request.requestId,dishId:dish.id,style};
 assert.equal((await call('/api/apology',grant,staff)).issued,1);assert.equal((await call('/api/apology',grant,staff)).issued,0);
 const wallet=await call('/api/rewards',null,member);const voucher=wallet.vouchers.find(v=>v.source==='apology');assert.equal(voucher.title,'致歉券 · 5颗水饺');assert.equal(voucher.style,style);
 const anonymous=await call('/api/rewards');assert.equal(anonymous.vouchers,undefined);
 console.log('PASS local HTTP: anonymous issue/read denied; paid guest order -> signed-in request -> staff approval -> voucher in correct account; repeated approval issues zero extra. No production requests.');
}finally{child.kill('SIGTERM')}
