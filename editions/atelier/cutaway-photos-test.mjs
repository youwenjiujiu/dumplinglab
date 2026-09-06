import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import sharp from "sharp";

const ctx = vm.createContext({});
for (const file of ["menu-data.js", "lunch-menu.js"]) {
  vm.runInContext(await readFile(new URL("../../web/" + file, import.meta.url), "utf8"), ctx);
}
const source = await readFile(new URL("./app.js", import.meta.url), "utf8");
const photoFunction = source.slice(source.indexOf("const photo ="), source.indexOf("const description ="));
vm.runInContext(photoFunction + "globalThis.testPhoto = photo;", ctx);
const expected = {
  "chive-fried": "potstickers-pork-shrimp-chive-cutaway-v1.png",
  "chicken-fried": "potstickers-chicken-cabbage-cutaway-v1.png",
};
for (const [id, filename] of Object.entries(expected)) {
  const rec = ctx.LUNCH_RECOMMENDATIONS.find(r => r.id === id);
  const dish = ctx.MENU.find(d => d.id === rec.dishId);
  assert.equal(rec.prep, "fried");
  assert.equal(rec.img, filename);
  assert.equal(dish.preparationImages.fried, filename);
  for (const [style, variant] of Object.entries(dish.variants)) {
    for (const size of ["s", "l"]) {
      const img = variant.prep === "fried" ? filename : ctx.LUNCH_PREPARATIONS.find(p => p.id === variant.prep).img;
      assert.equal(ctx.testPhoto(dish, size, style), `/img/${size}/${img.replace(".png", ".webp")}`);
    }
  }
  assert(!ctx.testPhoto(dish).includes("cutaway"), "Default boiled filling image stays boiled");
  for (const path of [filename, "s/" + filename.replace(".png", ".webp"), "l/" + filename.replace(".png", ".webp")]) {
    const bytes = await readFile(new URL("../../web/img/" + path, import.meta.url));
    const image = sharp(bytes), metadata = await image.metadata();
    assert(metadata.hasAlpha, "Real alpha, not a painted checkerboard: " + path);
    assert.equal(metadata.width, metadata.height);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const alpha = (x, y) => data[(y * info.width + x) * info.channels + info.channels - 1];
    // Allow at most 2/255 residual alpha from generated edges/WebP quantization.
    for (const x of [0, info.width - 1]) for (const y of [0, info.height - 1]) assert(alpha(x, y) <= 2, "Transparent corner: " + path);
    assert(alpha(Math.floor(info.width / 2), Math.floor(info.height / 2)) > 240, "Plate remains opaque");
  }
}
console.log("PASS: two distinct filling cutaways, real transparent PNG/WebP assets, matching recommended/detail/cart photo resolver, unchanged boiled/tossed photos and fixed fried presets.");
