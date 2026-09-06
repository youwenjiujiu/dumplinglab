import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import vm from "node:vm";
import sharp from "sharp";

const ctx = vm.createContext({});
for (const file of ["menu-data.js", "lunch-menu.js"]) vm.runInContext(await readFile(new URL("../../web/" + file, import.meta.url), "utf8"), ctx);
const source = await readFile(new URL("./app.js", import.meta.url), "utf8");
vm.runInContext(source.slice(source.indexOf("const photo ="), source.indexOf("const description =")) + "globalThis.testPhoto = photo;", ctx);
const fillings = ctx.MENU.filter(d => d.kind === "dumpling");
assert.equal(fillings.length, 5);
const files = new Set(), hashes = new Set();
for (const d of fillings) {
  assert.deepEqual(Object.keys(d.preparationImages).sort(), ["boiled", "fried", "tossed"]);
  assert.equal(d.img, d.preparationImages.boiled);
  for (const [style, variant] of Object.entries(d.variants)) {
    assert.equal(ctx.testPhoto(d, "s", style), `/img/s/${d.preparationImages[variant.prep].replace(".png", ".webp")}`);
  }
  for (const [prep, file] of Object.entries(d.preparationImages)) {
    assert(!files.has(file), "Different fillings/preparations may not share the same photo");
    files.add(file);
    if (!file.startsWith("potstickers-")) assert.equal(file, `filling-${d.id.replace("lunch-v2-", "")}-${prep}-cutaway-v1.png`);
    for (const path of [file, "s/" + file.replace(".png", ".webp"), "l/" + file.replace(".png", ".webp")]) {
      const bytes = await readFile(new URL("../../web/img/" + path, import.meta.url));
      const hash = createHash("sha256").update(bytes).digest("hex");
      assert(!hashes.has(hash), "Renaming a shared photo does not count as a separate filling image");
      hashes.add(hash);
      const image = sharp(bytes), meta = await image.metadata();
      assert(meta.hasAlpha, "Real transparency: " + path);
      assert.equal(meta.width, meta.height);
      const stats = await image.stats();
      assert.equal(stats.channels[3].min, 0);
      assert(stats.channels[3].max >= 250);
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      for (const x of [0, info.width - 1]) for (const y of [0, info.height - 1]) assert(data[(y * info.width + x) * info.channels + 3] <= 2, "No opaque rectangular corners: " + path);
    }
  }
}
assert.equal(files.size, 15);
assert.equal(ctx.MENU.length, 35);
assert.equal(ctx.MENU_VERSION, "lunch-2026-09-06-v4");
console.log("PASS: five fillings × three preparations, 15 distinct source images and 30 real-alpha WebPs; every variant resolves correctly; prices/catalogue unchanged.");
