// Extract original Illustrator paths; never redraw the brand marks.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
const pdf = process.argv[2];
if (!pdf) throw Error('Provide the original Dumplinglab 6.6.pdf path');
const scratch = await mkdtemp(resolve(tmpdir(), 'dumpling-progress-brand-'));
const svgFile = resolve(scratch, 'page-4.svg');
execFileSync('pdftocairo', ['-svg', '-f', '4', '-l', '4', pdf, svgFile]);
const source = await readFile(svgFile, 'utf8');
function pathBounds(match) {
  if (/[AHQSTVahqstvlmc]/.test(match[1])) throw Error('Unexpected path commands; review extraction');
  const numbers = match[1].match(/-?\d+(?:\.\d+)?/g).map(Number);
  const xs = numbers.filter((_, i) => i % 2 === 0);
  const ys = numbers.filter((_, i) => i % 2 === 1);
  return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
}
const page4 = [...source.matchAll(/<path\b[^>]*d="([^"]+)"[^>]*\/>/g)];
const paths = page4.filter(m => pathBounds(m).left > 150 && pathBounds(m).right < 900);
if (paths.length !== 2) throw Error('Expected the original seal outline and character');
await writeFile(new URL('../web/brand/order-complete-seal.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="150 160 760 760">\n<!-- Original brand artwork: Dumplinglab 6.6.pdf, page 4. -->\n${paths.map(m => m[0]).join('\n')}\n</svg>\n`);
console.log('Extracted the complete original seal, with padding and no clipped edges.');
const plate = page4.filter(m => pathBounds(m).left > 900);
if (plate.length < 10) throw Error('Missing original plate, dumplings or chopsticks');
await writeFile(new URL('../web/brand/order-dumpling-plate.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="900 125 870 810">\n<!-- Original plate + chopsticks, page 4; red adapted to the current UI palette. -->\n${plate.map(m => m[0].replace(/fill="rgb\(94\.13147%, 23\.725891%, 28\.884888%\)"/g,'fill="#bd3023"')).join('\n')}\n</svg>\n`);
const packagingFile = resolve(scratch, 'page-10.svg');
execFileSync('pdftocairo', ['-svg', '-f', '10', '-l', '10', pdf, packagingFile]);
const packaging = await readFile(packagingFile, 'utf8');
const lockup = [...packaging.matchAll(/<path\b[^>]*d="([^"]+)"[^>]*\/>/g)].filter(m => {
  const b = pathBounds(m);
  return b.left > 280 && b.right < 750 && b.top > 450 && b.bottom < 650;
});
if (lockup.length !== 16) throw Error('Expected original packaging wordmark, chopsticks and seal');
await writeFile(new URL('../web/brand/order-packaging-lockup.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="290 475 420 145">\n<!-- Original paper-bag brand lockup, page 10. -->\n${lockup.map(m => m[0]).join('\n')}\n</svg>\n`);
console.log('Extracted original plate/chopsticks and packaging lockup.');
