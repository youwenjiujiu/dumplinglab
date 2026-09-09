// Isolated visual fixture: no application cart, order or payment APIs.
import { chromium, webkit } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const root = new URL('../../', import.meta.url);
const file = 'web/brand/storefront-ink-v1.js';
const current = await readFile(new URL(file, root), 'utf8');
const previous = execFileSync('git', ['show', `771284b:${file}`], {cwd:root, encoding:'utf8'});
const out = new URL('./test-output/storefront-ground/', import.meta.url);
await mkdir(out, {recursive:true});
const captures = {};
for (const [engine, type] of [['chrome', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({headless:true, ...(engine==='chrome'?{channel:'chrome'}:{})});
  try {
    for (const width of [390, 724]) for (const [version, source] of [['before', previous], ['after', current]]) {
      const page = await browser.newPage({viewport:{width,height:740}, reducedMotion:'reduce',deviceScaleFactor:2});
      const errors=[]; page.on('pageerror', e=>errors.push(e.message));
      await page.route('**/*', async route=>{
        const path=new URL(route.request().url()).pathname;
        assert(['/brand/footer-storefront-v1.webp','/brand/dumpling-lab-primary.png'].includes(path),path);
        await route.fulfill({body:await readFile(new URL('web'+path,root)),contentType:path.endsWith('.png')?'image/png':'image/webp'});
      });
      await page.setContent(`<base href="http://storefront.test/"><style>body{margin:0;background:#954b3d}dumpling-storefront-ink{display:block;position:relative;width:100%;aspect-ratio:1.4}dumpling-storefront-ink[data-render-state="ready"]>img{visibility:hidden}img{width:100%}</style><dumpling-storefront-ink><img src="/brand/footer-storefront-v1.webp"></dumpling-storefront-ink>`);
      await page.addScriptTag({type:'module',content:source});
      const host=page.locator('dumpling-storefront-ink[data-phase="settled"]');
      await host.waitFor();
      await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
      await page.waitForTimeout(100);
      await host.screenshot({path:new URL(`${engine}-${width}-${version}.png`,out).pathname});
      const clip=await host.locator('svg').evaluate(svg=>{
        const matrix=svg.getScreenCTM();
        const a=new DOMPoint(192,668).matrixTransform(matrix),b=new DOMPoint(1096,758).matrixTransform(matrix);
        return {x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y};
      });
      const ground=await page.screenshot({clip});
      captures[`${engine}-${width}-${version}`]=await sharp(ground).removeAlpha().raw().toBuffer();
      assert.deepEqual(errors,[]);
      await page.close();
    }
  } finally {await browser.close();}
}
const difference=(a,b)=>{assert.equal(a.length,b.length);return a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0)/a.length};
for(const width of [390,724]) {
  const before=captures[`chrome-${width}-before`],after=captures[`chrome-${width}-after`],safari=captures[`webkit-${width}-after`];
  const desktopDifference=difference(before,after),engineDifference=difference(after,safari);
  const previousEngineDifference=difference(before,captures[`webkit-${width}-before`]);
  console.log(JSON.stringify({width,desktopDifference,engineDifference,previousEngineDifference}));
  assert(desktopDifference<2,'Preserve approved desktop pavement tone and linework');
  // Permit up to 3/255 mean channel variance for different SVG rasterizers;
  // also require a large improvement over the actual shipping WebKit bug.
  assert(engineDifference<3,'WebKit pavement must match Chrome, not an opaque light rectangle');
  assert(engineDifference<previousEngineDifference*.2,'Remove at least 80% of the original cross-engine floor difference');
}
assert(!current.includes('mask-type:luminance'),'Pavement no longer depends on luminance masks');
console.log('PASS pavement: approved desktop reference retained; Chrome/WebKit at 390/724; no app or payment requests.');
