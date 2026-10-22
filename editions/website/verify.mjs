// Non-browser integration checks. No production requests or customer writes.
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {orderingDocument} from './ordering-document.mjs';
import {websiteFiles,websiteFonts,websiteMedia} from './release-assets.mjs';
import {catalogueBootstrap} from './catalogue-bootstrap.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..');
const bundle=process.argv[2];assert(bundle,'Pass the exact built release directory');
const verifyOrigin=process.env.VERIFY_ORIGIN||'http://127.0.0.1:7903';
const html=await readFile(resolve(bundle,'index.html'),'utf8');
assert.equal(await readFile(resolve(bundle,'site/catalogue-bootstrap.js'),'utf8'),await catalogueBootstrap(bundle),'Homepage snapshot derives from this exact ordering release');
assert.doesNotMatch(html,/src="\/(?:menu-data|lunch-archive|lunch-menu)\.js/,'Homepage does not download historical ordering bootstrap');
await assert.rejects(stat(resolve(bundle,'review.html')),e=>e.code==='ENOENT','Local review page is not a public release artifact');
const css=await readFile(resolve(bundle,'site/site.css'),'utf8');
assert.match(css,/body\{width:100%;max-width:none;margin:0\}/,'Website canvas must fill wide viewports');
assert.doesNotMatch(css,/body\{[^}]*max-width:\s*\d+px/,'No centered fixed-width page cap');
const order=await readFile(resolve(bundle,'order.html'),'utf8');
assert.match(html,/<title>Dumpling Lab<\/title>/);
assert.match(html,/class="product-story"/,'D45 continuous product stage replaces the D44 film-only opening');
assert.doesNotMatch(html,/<video[^>]+id="brandFilm"/,'Static kitchen process is not presented as a film');
assert.match(html,/id="stageProduct"/);
assert.doesNotMatch(html,/id="courseChoices"|data-course-index|class="stage-meta"|class="scroll-cue"/);
assert.match(html,/id="previousCourse"/);assert.match(html,/id="nextCourse"/);
assert.doesNotMatch(html,/id="depthCanvas"/,'No tilted rectangular photograph masquerading as a food model');
assert.equal((html.match(/src="\/site\/interior.webp"/g)||[]).length,1,'Interior appears once, in the space section');
assert.equal((html.match(/src="\/site\/front.webp"/g)||[]).length,1,'Frontage appears once in the arrival section');
assert.match(html,/\/site\/media\/brand-dinein.svg/);
assert.match(html,/\/site\/media\/brand-takeaway.svg/);
for(const [original,derivative] of [['header-dinein-v1.svg','brand-dinein.svg'],['header-takeaway-v1.svg','brand-takeaway.svg']]){
 const source=await readFile(resolve(root,'web/brand',original),'utf8');
 assert.equal((await readFile(resolve(bundle,'site/media',derivative),'utf8')).trim(),source.replaceAll('#983f32','#9b252d').replaceAll('#7f3024','#671c23').trim(),'Homepage icon palette changes preserve original vector geometry');
}
assert.match(order,/data-environment="production"/);
assert(!order.includes('id="previewNotice"'));
assert.match(order,/<a id="websiteHome" href="\/\?lang=zh" aria-label="Dumpling Lab · 返回官网"[^>]*><span id="footerCopy">/);
assert.throws(()=>orderingDocument('<html></html>'),/footer changed/);
const config=JSON.parse(await readFile(resolve(bundle,'vercel.json')));assert.equal(config.cleanUrls,true);
let assets=0;
for(const match of html.matchAll(/(?:src|href)="(\/[^"?]+\.(?:js|css))\?v=([a-f0-9]+)"/g))assert.equal(createHash('sha256').update(await readFile(resolve(bundle,'.'+match[1]))).digest('hex').slice(0,12),match[2],'asset cache fingerprint');
for(const page of [html,order])for(const match of page.matchAll(/(?:src|href)="(\/[^"?#]+)(?:\?[^"#]*)?"/g)){
 const path=match[1];if(path==='/order'||path==='/')continue;
 assert((await stat(resolve(bundle,'.'+path))).isFile(),path);assets++;
}
for(const name of ['app.js','cart-store.js','fulfilment.js','checkout-ui.js','shared-table.js'])assert.equal(await readFile(resolve(bundle,name),'utf8'),await readFile(resolve(root,'editions/atelier',name),'utf8'));
for(const name of ['menu-data.js','lunch-menu.js','lunch-archive.js','catalog-client.js','catalog-admin.html','catalog-admin.js','catalog-admin.css'])assert.equal(await readFile(resolve(bundle,name),'utf8'),await readFile(resolve(root,'web',name),'utf8'));
for(const name of websiteMedia)assert((await stat(resolve(bundle,'site/media',name))).size>1000,name);
assert((await stat(resolve(bundle,'vendor/three.module.js'))).isFile());
for(const name of websiteFiles)assert.equal(await readFile(resolve(bundle,'site',name),'utf8'),await readFile(resolve(here,name),'utf8'));
for(const name of websiteFonts)assert((await stat(resolve(bundle,'site/fonts',name))).isFile());
for(const path of ['site/cinema.js','site/cinema.css','site/fonts/ZCOOLKuaiLe-Regular.ttf','site/fonts/LilitaOne-Regular.ttf','site/media/campaign-wide-v1.webp','site/media/PROMPTS.md'])await assert.rejects(stat(resolve(bundle,path)),e=>e.code==='ENOENT',`Source-only asset excluded: ${path}`);
assert.match(html,/class="kitchen-section"/);
for(const name of ['dumpling','plate','sauce','chopsticks'])assert(html.includes(`/site/media/pick-${name}-v1.webp`));
assert.doesNotMatch(html,/<dl-storefront-sketch/,'Removed facade sketch stays absent');
for(const step of ['roll','fill','fold','boil','serve'])assert(html.includes(`/site/media/kitchen-${step}-v1.webp`),'Kitchen process is restored');
assert.doesNotMatch(html,/class="process-disclosure"/,'Removed visible process note stays absent');
assert(html.indexOf('id="play"')>html.indexOf('id="visit"'),'The game follows the address section');
assert.match(html,/id="pickReplay"[^>]*hidden/,'Replay is initially hidden');
assert.equal((html.match(/class="pick-piece"/g)||[]).length,8,'Eight accessible pickable dumplings');
assert.doesNotMatch(html,/kitchen-process-3d-v1|id="kitchenFilm"/,'Rejected 3D film is not displayed');
for(const name of ['stage.js','stage.css','campaign.css','motion-math.mjs'])assert.equal(await readFile(resolve(bundle,'site',name),'utf8'),await readFile(resolve(here,name),'utf8'));
for(const name of ['hero-potstickers-v1.webp','hero-chilli-wontons-v1.webp','hero-century-egg-noodles-v3.webp'])assert((await stat(resolve(bundle,'site/media',name))).size>1000,name);
for(const name of ['hero-potstickers-v1-800.webp','hero-chilli-wontons-v1-800.webp','hero-century-egg-noodles-v3-800.webp'])assert((await stat(resolve(bundle,'site/media',name))).size>1000,name);
for(const name of ['LilitaOne-Regular.woff2','KuaiLe-Campaign-subset-v1.woff2','LilitaOne-OFL.txt','ZCOOLKuaiLe-OFL.txt'])assert((await stat(resolve(bundle,'site/fonts',name))).isFile(),name);
assert((await stat(resolve(bundle,'fonts/scto-grotesk-a-bold.woff2'))).isFile());
const redirect=html.match(/<script>(.*?)<\/script>/s)[1];let routes=0;
for(const pathname of ['/','/index.html','/order'])for(const [query,hash,expected] of [['','',null],['?lang=zh','',null],['?table=A1&group=B','',true],['?online_order=test-return&table=A1&group=A','#receipt',true],['?preview_payment=ok','',true],['','#menu',true],['','#cart',true],['','#index',true],['','#table3d',true],['','#food',null],['?lang=zh','#visit',null]]){
 let redirected=null;vm.runInNewContext(redirect,{URLSearchParams,location:{pathname,search:query,hash,replace:url=>redirected=url}});
 assert.equal(redirected,expected&&pathname!=='/order'?'/order'+query+hash:null);routes++;
}
class Element{
 constructor(){this.dataset={};this.attrs={};this.listeners={};this.innerHTML='';this.textContent='';this.classList={toggle(){}}}
 setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}addEventListener(k,f){this.listeners[k]=f}focus(){this.focused=true}
}
assert.doesNotMatch(html,/id="language"|class="site-footer"|class="footer-mark"/,'No language switch or oversized footer');
let variants=0;
for(const [search,saved,initial,blocked] of [['?lang=en','zh','en',false],['?lang=zh','en','zh',false],['','zh','zh',false],['','','en',false],['?lang=xx','zh','zh',false],['','','en',true]]){
 const nodes=Object.fromEntries(['featuredMenu','language','year','navToggle','mainNav','heroImage','heroDishName','heroDishLink','heroDish','catalogNote','logo'].map(id=>[id,new Element()]));
 const text=new Element();text.dataset={en:'The food',zh:'吃点什么'};const link=new Element();link.href='/order';const events={};
  const alt=new Element();alt.dataset={altEn:'Food close-up',altZh:'食物近景'};
  const firstNavigationLink=new Element();nodes.mainNav.querySelector=selector=>selector==='a'?firstNavigationLink:null;
 const document={documentElement:{lang:initial},querySelector:s=>nodes[s.slice(1)],querySelectorAll:s=>s==='.space-layout figure>img,.visit-front>img'?[]:s==='[data-en]'?[text]:s==='[data-alt-en]'?[alt]:[link],addEventListener:(k,f)=>events[k]=f};
 let stored=saved;
 const localStorage={getItem:key=>{assert.equal(key,'atelier-language');if(blocked)throw new Error('Storage unavailable');return stored},setItem:(key,value)=>{assert.equal(key,'atelier-language');if(blocked)throw new Error('Storage unavailable');stored=value}};
 const context=vm.createContext({document,URLSearchParams,URL,localStorage,innerWidth:1440,addEventListener(k,fn){events[k]=fn},location:{search,href:'http://localhost/'+search},history:{replaceState(){}},Date});
 for(const path of ['site/catalogue-bootstrap.js','site/site.js'])vm.runInContext(await readFile(resolve(bundle,path),'utf8'),context,{filename:path});
 for(const lang of ['en']){
  assert.equal(document.documentElement.lang,lang);assert.equal(link.href,'/order?lang='+lang);
  assert.equal(alt.alt,lang==='zh'?'食物近景':'Food close-up');assert(nodes.logo.attrs['aria-label'].includes(lang==='zh'?'回到顶部':'Back to top'));
  assert.equal((nodes.featuredMenu.innerHTML.match(/<article /g)||[]).length,3);
  assert(nodes.featuredMenu.innerHTML.includes('S$8.80'),'Wonton noodles include the SGD 3 noodle supplement and an explicit currency symbol');assert(nodes.featuredMenu.innerHTML.includes('S$5.80'));
  assert.match(nodes.featuredMenu.innerHTML,/Prawn &amp; Crab Roe Wonton Noodles/);
  assert(nodes.heroImage.src.includes('pork-shrimp-chive'),'Signature potstickers remain in the hero, independently of featured selection');
  assert((await stat(resolve(bundle,'.'+nodes.heroImage.src))).isFile());
  for(const m of nodes.featuredMenu.innerHTML.matchAll(/src="([^"]+)"/g))assert((await stat(resolve(bundle,'.'+m[1]))).isFile(),m[1]);
  assert.equal(nodes.language.listeners.click,undefined,'No website language switch');assert.equal(stored,saved,'Ordering language preference is untouched');assert.doesNotMatch(nodes.featuredMenu.innerHTML,/[\u3400-\u9fff]/,'English-only menu cards');variants++;
 }
 nodes.navToggle.listeners.click();assert.equal(nodes.mainNav.dataset.open,'true');assert(firstNavigationLink.focused);
 assert.equal(nodes.navToggle.getAttribute('aria-label'),'Close navigation');
 events.keydown({key:'Escape'});assert.equal(nodes.mainNav.dataset.open,'false');assert(nodes.navToggle.focused);
 nodes.navToggle.listeners.click();nodes.mainNav.listeners.click({target:{closest:()=>true}});assert.equal(nodes.navToggle.getAttribute('aria-expanded'),'false');
 // Catalogue events are simulated in memory; no API or stock writes.
 const baseMenu=context.MENU,baseRecommendations=context.LUNCH_RECOMMENDATIONS;
 const firstId=baseRecommendations.find(r=>r.id==='chive-fried').dishId;
 context.MENU=baseMenu.map(d=>({...d,active:d.id!==firstId}));events['catalog-updated']();
 assert(!nodes.featuredMenu.innerHTML.includes('Pork, Shrimp &amp; Chive Potstickers'));assert(!nodes.heroImage.src.includes('pork-shrimp-chive'));
 assert.equal((nodes.featuredMenu.innerHTML.match(/<article /g)||[]).length,3,'hide inactive and backfill valid dishes');
 context.MENU=baseMenu.map(d=>({...d,active:true,soldOut:true}));events['catalog-updated']();
 assert.equal(nodes.heroImage.src,'/site/interior.webp');assert.match(nodes.featuredMenu.innerHTML,/food-stock/);
 context.MENU=baseMenu.map(d=>({...d,active:false}));events['catalog-updated']();assert.match(nodes.featuredMenu.innerHTML,/menu-empty/);assert(!nodes.featuredMenu.innerHTML.includes('<article '));
 context.MENU=baseMenu.map(d=>({...d,price:15.25,active:true,soldOut:false,imageUrl:'https://example.com/current-dish.webp'}));
 context.LUNCH_RECOMMENDATIONS=baseRecommendations.map(r=>({...r,cn:'改名 & 菜',name:'Updated <dish>'}));events['catalog-updated']();
 assert.match(nodes.featuredMenu.innerHTML,/15.25/);assert.match(nodes.featuredMenu.innerHTML,/https:\/\/example.com\/current-dish.webp/);assert.match(nodes.featuredMenu.innerHTML,/Updated &lt;dish&gt;|改名 &amp; 菜/);
 assert.equal(nodes.heroImage.src,'https://example.com/current-dish.webp');assert(!nodes.featuredMenu.innerHTML.includes('srcset='),'custom images do not mix with original images');
 events['catalog-unavailable']();assert.equal(nodes.catalogNote.hidden,false);assert(nodes.catalogNote.textContent);events['catalog-updated']();assert.equal(nodes.catalogNote.hidden,true);
}
for(const path of ['/','/order','/order?table=A1&group=B','/site/stage.js','/site/stage.css','/site/motion-math.mjs','/fonts/scto-grotesk-a-bold.woff2','/img/l/potstickers-pork-shrimp-chive-cutaway-v1.webp','/img/l/sichuan-red-oil-chaoshou-placeholder.webp','/img/l/wonton-soup-noodles-cutout.webp','/site/interior.webp','/site/front.webp','/api/online','/catalog-client.js','/catalog-admin','/staff','/api/catalog']){
 const response=await fetch(verifyOrigin+path);assert.equal(response.status,200,path);
}
assert.equal((await fetch(verifyOrigin+'/.vercel/project.json')).status,404);
assert.equal((await fetch(verifyOrigin+'/api/catalog?admin=1')).status,401);
for(const range of ['bytes=0-1','bytes=100-','bytes=-128']){
 const response=await fetch(verifyOrigin+'/site/media/boiled-film-mobile-v1.mp4',{headers:{range}});assert.equal(response.status,206);assert.equal(response.headers.get('content-type'),'video/mp4');assert.match(response.headers.get('content-range'),/^bytes /);await response.arrayBuffer();
}
assert.equal((await fetch(verifyOrigin+'/site/media/boiled-film-mobile-v1.mp4',{headers:{range:'bytes=999999999-'}})).status,416);
console.log(JSON.stringify({ok:true,assets,routes,languageVariants:variants,catalogueStatesPerLanguage:5,orderingRuntimeUnchanged:true,productionWrites:0,browserVisualQA:'not performed'},null,2));
