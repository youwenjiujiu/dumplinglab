import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const ctx = vm.createContext({});
for (const file of ['menu-data.js', 'lunch-menu.js']) {
  vm.runInContext(await readFile(new URL('../../web/' + file, import.meta.url), 'utf8'), ctx);
}
const expected = {
  soup: 'preparation-soup-generated-v3.png',
  tossed: 'preparation-tossed-generated-v3.png',
  boiled: 'preparation-boiled-generated-v3.png',
  fried: 'preparation-fried-generated-v3.png',
};
assert.equal(ctx.LUNCH_PREPARATIONS.length, 4);
for (const p of ctx.LUNCH_PREPARATIONS) {
  assert.equal(p.img, expected[p.id]);
  for (const size of ['s', 'l']) {
    const bytes = await readFile(new URL(`../../web/img/${size}/${p.img.replace('.png', '.webp')}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert(bytes.length > 1000);
  }
}
const css = await readFile(new URL('./shared-table.css', import.meta.url), 'utf8');
assert.match(css, /\.preparation-photo \{[^}]*aspect-ratio: 1\.25;[^}]*overflow: hidden;/);
assert.match(css, /\.preparation-photo img \{[^}]*object-fit: contain;/);
console.log('PASS: four dedicated preparation photos, eight valid local WebP assets, fixed image bounds. Structural checks, not browser visual QA.');
