import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const output=new URL('./test-output/preparation-size/',import.meta.url).pathname;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const width of [320,390,724]) {
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
    await page.goto('http://127.0.0.1:7898/');
    await page.locator('[data-fulfilment="dinein"]').click();
    await page.locator('#section-dumplings').scrollIntoViewIfNeeded();
    await page.locator('.preparation-photo img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
    const measures=await page.locator('.lunch-preparations button').evaluateAll(buttons=>buttons.map(b=>{
      const frame=b.querySelector('.preparation-photo').getBoundingClientRect();
      const image=b.querySelector('img').getBoundingClientRect();
      const label=b.querySelector('.preparation-label').getBoundingClientRect();
      return {ratio:image.width/frame.width,center:image.x+image.width/2-frame.x-frame.width/2,gap:label.y-image.bottom};
    }));
    assert.equal(measures.length,4);
    for(const m of measures){assert(Math.abs(m.ratio-.85)<.01);assert(Math.abs(m.center)<1);assert(m.gap>=0);}
    await page.locator('#section-dumplings').screenshot({path:`${output}${width}.png`});
    for(const prep of ['soup','tossed','boiled','fried']) {
      const button=page.locator(`[data-lunch-prep="${prep}"]`);
      assert.equal(await button.count(),1,`${prep} must exist; do not silently skip preparation coverage`);
      await button.click();
      await page.locator('#section-dumplings .dish-add').first().waitFor();
      await page.locator('#section-dumplings .dish-add').first().click();
      const selected=page.locator('[data-lunch-option="prep"][aria-pressed="true"]');
      assert.equal(await selected.getAttribute('data-value'),prep,'detail must keep the preparation selected on the menu');
      assert.equal(await selected.innerText(),{soup:'高汤',tossed:'干拌',boiled:'水煮',fried:'煎'}[prep]);
      await page.locator('#closeSheet').click();
      await page.locator('[data-lunch-back]').click();
    }
    console.log(`PASS four preparation photos 85%, centered, no overlap: ${width}`);
    await page.close();
  }
}finally{await browser.close();}
