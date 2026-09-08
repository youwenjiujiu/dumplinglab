// Run the current accepted experience, not obsolete visual experiments.
// Requires the loopback preview. Some suites create explicitly simulated local orders.
import {spawn} from 'node:child_process';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {browserEngine} from './browser-test-runtime.mjs';
const here=new URL('./',import.meta.url), origin='http://127.0.0.1:7898';
const config=await fetch(`${origin}/api/online`,{signal:AbortSignal.timeout(5000)}).then(r=>r.json());
if(config.config?.preview!==true)throw Error('Refusing QA: local simulated preview is required.');
const suites=process.argv.includes('--no-browser')?[
  'gst-inclusive-test.mjs','error-copy-test.mjs','lunch-test.mjs','online-service-test.mjs','table-entry-test.mjs','production-test.mjs',
  'stripe-setup-test.mjs','paid-checkout-test.mjs','checkout-http-test.mjs','checkout-ui-test.mjs','checkout-recovery-test.mjs','checkout-design-test.mjs','pickup-progress-test.mjs','two-mode-entry-test.mjs','order-progress-design-test.mjs',
]:browserEngine==='webkit'?[
  'menu-layout-restoration-test.mjs','entry-brand-browser-test.mjs','form-layout-browser-test.mjs',
  'navigation-draft-browser-test.mjs','cart-input-browser-test.mjs','fulfilment-browser-test.mjs',
  'mode-menu-position-browser-test.mjs','surface-paint-browser-test.mjs',
]:[
  'gst-inclusive-test.mjs','error-copy-test.mjs','lunch-test.mjs','online-service-test.mjs','table-entry-test.mjs','shared-test.mjs','production-test.mjs',
  'stripe-setup-test.mjs','paid-checkout-test.mjs','checkout-http-test.mjs','checkout-ui-test.mjs',
  'menu-layout-restoration-test.mjs','entry-brand-browser-test.mjs','typography-browser-test.mjs','preparation-size-browser-test.mjs',
  'browse-efficiency-browser-test.mjs','ingredients-browser-test.mjs','form-layout-browser-test.mjs','empty-cart-browser-test.mjs',
  'order-mode-copy-browser-test.mjs','undo-scope-browser-test.mjs','add-confirmation-browser-test.mjs','cart-input-browser-test.mjs','checkout-race-browser-test.mjs',
  'payment-error-browser-test.mjs','navigation-draft-browser-test.mjs','fulfilment-browser-test.mjs','pickup-staff-browser-test.mjs','mode-menu-position-browser-test.mjs','surface-paint-browser-test.mjs',
];
const runtime=['index.html','atelier.css','shared-table.css','app.js','error-copy.js','cart-store.js','fulfilment.js','checkout-ui.js','shared-table.js','lunch-ui.js','bilingual-fit.js','preview.mjs'];
for(const dir of ['../../web/server/','../../web/api/'])for(const file of await readdir(new URL(dir,here)))if(file.endsWith('.js'))runtime.push(dir+file);
runtime.push('../../web/menu-data.js','../../web/lunch-menu.js','../../web/lunch-archive.js','../../web/i18n.js','../../web/order-pricing.js','../../web/staff.html');
runtime.push('generated/table-view-motion/developer/web-component/table-layout.js','generated/order-feedback/developer/web-component/order-feedback.js','generated/receipt-print/developer/web-component/receipt-print.js','generated/table-sharing/developer/web-component/table-sharing.js');
async function fingerprint(){const hash=createHash('sha256');for(const file of runtime.sort())hash.update(file).update(await readFile(new URL(file,here)));return hash.digest('hex');}
const startedAt=new Date().toISOString(), before=await fingerprint();
const output=new URL(`./test-output/qa-${startedAt.replaceAll(':','-')}/`,here);
await mkdir(output,{recursive:true});
const results=[];let cursor=0;
async function run(file){
  const start=Date.now();let log='',timedOut=false;
  const child=spawn(process.execPath,[fileURLToPath(new URL(file,here))],{cwd:fileURLToPath(here),env:{...process.env,ATELIER_TEST_URL:origin+'/'},stdio:['ignore','pipe','pipe']});
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');},180000);
  child.stdout.on('data',chunk=>{log+=chunk;});child.stderr.on('data',chunk=>{log+=chunk;});
  const exitCode=await new Promise(resolve=>{child.on('error',error=>{log+=error.stack;resolve(-1);});child.on('close',code=>resolve(code));});
  clearTimeout(timer);
  await writeFile(new URL(file+'.log',output),log);
  const result={file,exitCode,timedOut,seconds:Math.round((Date.now()-start)/100)/10,passed:exitCode===0&&!timedOut};
  results.push(result);console.log(`${result.passed?'PASS':'FAIL'} ${file} (${result.seconds}s)`);
  if(!result.passed)console.log(log.slice(-2000));
}
// Two workers limit simultaneous Chrome instances on the developer's machine.
await Promise.all(Array.from({length:2},async()=>{while(cursor<suites.length)await run(suites[cursor++]);}));
const after=await fingerprint();
const report={startedAt,finishedAt:new Date().toISOString(),origin,browserEngine,scope:process.argv.includes('--no-browser')?'Local service and VM checks only; no browser or merchant payment verification':`Local desktop ${browserEngine} simulations; not physical iPhone or merchant payment verification`,sourceFingerprint:before,sourceUnchanged:before===after,results:results.sort((a,b)=>suites.indexOf(a.file)-suites.indexOf(b.file))};
await writeFile(new URL('report.json',output),JSON.stringify(report,null,2));
console.log(`Report: ${fileURLToPath(new URL('report.json',output))}`);
if(!report.sourceUnchanged||results.some(r=>!r.passed))process.exitCode=1;
