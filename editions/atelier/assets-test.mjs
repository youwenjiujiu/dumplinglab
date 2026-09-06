// Actual local HTTP assets; verifies availability/caching, not visual quality or LCP.
import assert from "node:assert/strict";
import vm from "node:vm";
const origin = process.env.ATELIER_TEST_URL || "http://127.0.0.1:7898";
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const context = vm.createContext({});
vm.runInContext(await (await fetch(`${origin}/menu-data.js`)).text(), context);
vm.runInContext(await (await fetch(`${origin}/lunch-menu.js`)).text(), context);
let totalBytes = 0, files = 0, conditionalBytes = 0;
const illustrated = [...context.MENU, ...context.LUNCH_PREPARATIONS, ...context.LUNCH_RECOMMENDATIONS];
assert.equal(illustrated.filter(d => !d.img).length, 0, "Every menu item and preparation must have an image; do not silently skip missing images");
const media = [...new Set(illustrated.flatMap((d) => ["s", "l"].map((size) => `/img/${size}/${d.img.replace(/\.(png|jpe?g|webp)$/i, ".webp")}`)))];
for (let i = 0; i < media.length; i += 8) {
  await Promise.all(media.slice(i, i + 8).map(async (path) => {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type"), /image\/webp/);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF", `Valid WebP container: ${path}`);
    assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), "WEBP", path);
    const etag = response.headers.get("etag");
    assert(etag, `Revalidation token: ${path}`);
    const unchanged = await fetch(origin + path, { headers: { "if-none-match": etag } });
    assert.equal(unchanged.status, 304, path);
    conditionalBytes += (await unchanged.arrayBuffer()).byteLength;
    totalBytes += bytes.length;
    files++;
  }));
}
assert.equal(conditionalBytes, 0, "Unchanged media does not transfer its body again");
for (const path of ["/", "/app.js", "/atelier.css", "/shared-table.css", "/api/cart?table=QASSET&group=A"]) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get("cache-control"), "no-store", `Live code/cart must not be cached: ${path}`);
}
const retry = await fetch(origin + media[0] + "?retry=1");
assert.equal(retry.status, 200, "Detail image retry URLs stay usable");
console.log(`PASS: ${files} WebP assets (${totalBytes} bytes); conditional requests transfer 0 body bytes; live code/cart remain no-store. Not a browser performance benchmark.`);
