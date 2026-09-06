import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const css = await readFile(new URL("./atelier.css", import.meta.url), "utf8");
const shared = await readFile(new URL("./shared-table.css", import.meta.url), "utf8");
assert.doesNotMatch(css, /Georgia|font-style:\s*italic/);
assert.match(css, /--serif:\s*Scto,\s*"Songti SC"/);
for (const selector of [".section-heading .translation", ".detail-other", ".paper-heading em"]) {
  const start = css.indexOf(selector + " {"), block = css.slice(start, css.indexOf("}", start));
  assert(start >= 0);
  assert.match(block, /font-family: var\(--sans\)/);
  assert.match(block, /font-style: normal/);
}
for (const weight of ["regular", "medium"]) {
  const bytes = await readFile(new URL(`../../web/fonts/scto-grotesk-a-${weight}.woff2`, import.meta.url));
  assert.equal(bytes.toString("ascii", 0, 4), "wOF2");
}
assert.match(shared, /#sheet\[data-mode="profile"\] \{\s*width: min\(420px, calc\(100% - 24px\)\)/);
assert.match(shared, /#sheet\[data-mode="profile"\] \.nickname-form input:focus \{\s*outline: 2px solid var\(--red\)/);
assert.match(shared, /#sheet\[data-mode="profile"\] \.nickname-form \.primary \{[^}]*min-height: 46px/);
assert.match(shared, /#sheet\[data-mode="profile"\] \.close-button \{ width: 44px; height: 44px;/);
console.log("PASS: upright Scto English, Chinese Songti fallback, packaged fonts, scoped compact profile sheet and visible branded focus. Structural checks, not browser pixels.");
