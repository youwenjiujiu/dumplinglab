import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await import('../../web/brand/storefront-ink-v1.js'); // SSR-safe evaluation.
const out=new URL('./generated/storefront-ink-v1/verified/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const errors=[];
async function openFooter(options={},block=false) {
  const page=await browser.newPage({viewport:{width:390,height:844},...options});
  page.on('pageerror',e=>errors.push(e.message));
  const requests=[];page.on('request',r=>requests.push(r.url()));
  if(block)await page.route('**/brand/storefront-ink-v1.js',r=>r.abort());
  await page.goto('http://127.0.0.1:7898/?table=A1');
  const close=page.getByRole('button',{name:'关闭 / Close',exact:true});if(await close.isVisible())await close.click();
  const footer=page.locator('#brandFooter'),host=page.locator('dumpling-storefront-ink');
  await footer.scrollIntoViewIfNeeded();
  if(!block)await page.locator('dumpling-storefront-ink[data-render-state="ready"]').waitFor();
  return {page,footer,host,requests};
}
try {
  const {page,footer,host,requests}=await openFooter();
  await page.locator('dumpling-storefront-ink[data-phase="settled"]').waitFor();
  assert.equal(await host.locator('canvas').count(),0);
  assert.equal(await host.locator('.facade .ink').evaluate(e=>getComputedStyle(e).filter),'none','Storefront retains its original colors, not inverted white lines');
  assert.equal(await host.locator('.scene').evaluate(e=>getComputedStyle(e).mixBlendMode),'normal','No screen blending that washes out the illustration');
  const edges=await host.evaluate(e=>{const right=id=>{const b=e.shadowRoot.querySelector(`#${id} path`).getBBox();return b.x+b.width;};return {facade:right('facade'),awning:right('awning')};});
  assert.equal(edges.facade,1057,'Facade crop ends at the red frame, excluding the adjacent cream wall strip');
  assert(edges.awning>edges.facade,'Preserve the awning overhang instead of a rectangular cutoff');
  assert(!requests.some(u=>/storefront-(model|stage|footer)-v1|vendor\/three.module/.test(u)),'Footer must not load the removed 3D scene');
  assert.equal(await footer.locator('address').count(),1);
  assert.equal(await footer.locator('.footer-signoff address').count(),1,'Map address stays in the bottom-right signoff row');
  assert.equal(await footer.locator('.footer-visit #footerFarewell').count(),1,'Farewell is centered under the storefront');
  assert((await footer.locator('#footerFarewell').boundingBox()).y<(await footer.locator('address').boundingBox()).y,'Farewell and address have exchanged rows');
  assert(!/重播|3D/.test(await footer.innerText()));
  assert.equal(await host.getAttribute('tabindex'),null,'Decorative illustration must not imply drag/click controls');
  await footer.screenshot({path:`${out}footer-mobile.png`});
  const bounds=await host.boundingBox();
  const positions=()=>host.locator('.layer').evaluateAll(els=>els.map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};}));
  const layerBounds=await positions();
  const motionFrames=[];
  for(const t of [0,450,950,1500,2200]) {
    await host.evaluate((e,t)=>e.seek(t),t);
    await page.waitForTimeout(30);
    assert.deepEqual(await host.boundingBox(),bounds,'Animation must not shift layout');
    const current=await positions();
    assert.deepEqual(current[0],layerBounds[0],'Pavement stays anchored while the house moves');
    for(const axis of ['x','y'])assert(Math.abs((current[1][axis]-layerBounds[1][axis])-(current[2][axis]-layerBounds[2][axis]))<.001,'Roof and facade move together, with no seam separation');
    assert((await host.locator('.layer').evaluateAll(els=>els.map(e=>getComputedStyle(e).transform))).every(t=>t==='none'),'No independent building-part transforms');
    motionFrames.push(await host.locator('.building').evaluate(e=>{const s=getComputedStyle(e),m=new DOMMatrix(s.transform);return {x:m.e,y:m.f,clip:s.clipPath,mask:s.maskImage};}));
    await host.screenshot({path:`${out}time-${t}.png`});
  }
  assert(motionFrames.every(p=>p.clip==='none'&&p.mask==='none'),'No animated wipe or cover on the building');
  assert(motionFrames.slice(1).every((p,i)=>p.x>motionFrames[i].x&&p.y<motionFrames[i].y),'The building itself travels upward and to the right');
  assert.deepEqual({x:motionFrames.at(-1).x,y:motionFrames.at(-1).y},{x:0,y:0},'House settles at its original position');
  assert.equal((await host.evaluate(e=>e.inspect())).layers,1,'One connected building timeline, not independently assembling parts');
  await host.evaluate(e=>e.restart());await page.waitForTimeout(180);
  assert((await host.evaluate(e=>e.inspect())).animating);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(100);
  assert(!(await host.evaluate(e=>e.inspect())).animating,'Offscreen playback pauses');
  await footer.scrollIntoViewIfNeeded();await page.locator('dumpling-storefront-ink[data-phase="settled"]').waitFor();
  assert(!(await host.evaluate(e=>e.inspect())).animating,'One-shot animation settles without a loop');
  const reduced=await openFooter({reducedMotion:'reduce'});
  await reduced.page.locator('dumpling-storefront-ink[data-phase="settled"]').waitFor();
  assert(!(await reduced.host.evaluate(e=>e.inspect())).animating);
  await reduced.footer.screenshot({path:`${out}reduced-motion.png`});
  const wide=await openFooter({viewport:{width:1100,height:900}});
  await wide.page.locator('dumpling-storefront-ink[data-phase="settled"]').waitFor();
  await wide.footer.screenshot({path:`${out}footer-desktop.png`});
  const fallback=await openFooter({},true);
  assert(await fallback.page.locator('#footerStorefront').isVisible());
  assert.equal(await fallback.page.locator('#footerStorefront').evaluate(e=>getComputedStyle(e).filter),'none');
  await fallback.footer.screenshot({path:`${out}fallback.png`});
  assert.deepEqual(errors,[]);
  console.log('PASS: connected house moves up/right, stationary ground, no wipe/mask animation or roof separation, no Three.js, one address, fixed layout, offscreen pause, one-shot, reduced motion, static fallback, SSR import.');
} finally { await browser.close(); }
