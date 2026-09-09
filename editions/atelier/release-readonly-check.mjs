// Deployment verification: only GETs to static files and read-only configuration/auth gates.
// Never request /api/cart or create orders, staff events, payment objects or credentials.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const run=promisify(execFile),[url,release]=process.argv.slice(2),protectedDeployment=process.argv.includes('--protected');
assert.match(url||'',/^https:\/\/dumplinglab-menu(?:-[a-z0-9-]+)?\.vercel\.app$/);
assert.match(release||'',/\/dumplinglab-release-[A-Za-z0-9]+$/);
async function request(path){
 if(!protectedDeployment){const r=await fetch(url+path,{signal:AbortSignal.timeout(45000)});return {status:r.status,body:Buffer.from(await r.arrayBuffer())};}
 const {stdout}=await run('npx',['--yes','vercel@59.11.7','curl',path,'--deployment',url,'--','--silent','--show-error','--max-time','45','--write-out','\n%{http_code}'],{cwd:release,encoding:'buffer',maxBuffer:16*1024*1024,timeout:60000});
 const n=stdout.lastIndexOf(10);return {status:Number(stdout.subarray(n+1).toString()),body:stdout.subarray(0,n)};
}
const hash=b=>createHash('sha256').update(b).digest('hex');
const root=await request('/');assert.equal(root.status,200,'Customer page');
const html=root.body.toString();assert(html.includes('data-environment="production"'));assert(!html.includes('id="previewNotice"'));
assert.equal(hash(root.body),hash(await readFile(release+'/index.html')),'Exact built HTML');
const paths=[...new Set([...html.matchAll(/(?:src|href)="(\/[^"?]+\.(?:js|css))(?:\?[^" ]*)?"/g)].map(m=>m[1]))];
paths.push('/img/s/progress-received-v2.webp','/img/s/progress-preparing-v3.webp','/img/s/progress-ready-v2.webp','/img/s/progress-collected-v3.webp','/img/s/preparation-tossed-generated-v3-appetite-v3.webp','/img/s/lunch-mince-red-oil-noodles-generated-v1-appetite-v1.webp','/img/s/dining-separate-v7.webp','/brand/footer-storefront-v1.webp');
paths.push('/brand/tray-noodle-silhouette-v1.svg','/brand/tray-lettuce-silhouette-v1.svg','/img/s/potstickers-chicken-cabbage-cutaway-v1.webp');
let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<paths.length){const p=paths[cursor++],r=await request(p);assert.equal(r.status,200,p);assert.equal(hash(r.body),hash(await readFile(release+p)),`Exact bytes: ${p}`);console.log('MATCH',p);}}));
const feed=await request('/api/feed');assert.equal(feed.status,401,'Anonymous staff feed is protected');
const staff=await request('/staff');assert.equal(staff.status,200,'Staff sign-in page loads');
const online=await request('/api/online');assert.equal(online.status,200,'Read-only online config');assert.notEqual(JSON.parse(online.body.toString()).config?.preview,true,'No simulated production checkout');
console.log(`PASS ${url}: exact HTML and ${paths.length} runtime/asset byte matches, no preview banner, staff auth gate and read-only production config. No production data written.`);
