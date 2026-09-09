// Build a fresh, allowlisted release. Never overwrite the legacy web/ frontend.
import { mkdtemp, mkdir, copyFile, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, "../.."), web = resolve(root, "web");
const output = await mkdtemp(resolve(tmpdir(), "dumplinglab-release-"));
async function copy(source, target) {
  await mkdir(dirname(resolve(output, target)), { recursive: true });
  await copyFile(source, resolve(output, target));
}
for (const file of ["atelier.css", "shared-table.css", "app.js", "error-copy.js", "cart-store.js", "fulfilment.js", "addons-ui.js", "checkout-ui.js", "shared-table.js", "lunch-ui.js", "bilingual-fit.js"]) await copy(resolve(here, file), file);
await copy(resolve(here, "generated/table-view-motion/developer/web-component/table-layout.js"), "shared-motion.js");
await copy(resolve(here, "generated/order-feedback/developer/web-component/order-feedback.js"), "micro-motion.js");
await copy(resolve(here, "generated/receipt-print/developer/web-component/receipt-print.js"), "receipt-motion.js");
await copy(resolve(here, "generated/table-sharing/developer/web-component/table-sharing.js"), "sharing-motion.js");
for (const file of ["menu-data.js", "lunch-archive.js", "lunch-menu.js", "order-pricing.js", "i18n.js", "staff.html", "package.json", "package-lock.json"]) await copy(resolve(web, file), file);
for (const dir of ["api", "server", "img/s", "img/l"]) {
  for (const file of await readdir(resolve(web, dir))) {
    // Photographer shoot is archived locally, not part of the active menu.
    if (file.startsWith('shoot-20260908-')) continue;
    if (/^dining-(together|separate)-v\d+\.webp$/.test(file) && !/^dining-(together-v5|separate-v7)\.webp$/.test(file)) continue;
    if (/\.(js|webp)$/.test(file)) await copy(resolve(web, dir, file), `${dir}/${file}`);
  }
}
for (const file of ["scto-grotesk-a-regular.woff2", "scto-grotesk-a-medium.woff2"]) await copy(resolve(web, "fonts", file), `fonts/${file}`);
await copy(resolve(web, "brand/dumpling-lab-primary.png"), "brand/dumpling-lab-primary.png");
await copy(resolve(web, "brand/serving-motion-v1.js"), "brand/serving-motion-v1.js");
for(const file of ['takeaway-pickup-v5.js','entry-dinein-v3.svg','entry-takeaway-v5.svg']) await copy(resolve(web,'brand',file),`brand/${file}`);
await copy(resolve(web,'brand/dinein-serving-v3.js'),'brand/dinein-serving-v3.js');
await copy(resolve(web, "brand/menu-depth-v1.js"), "brand/menu-depth-v1.js");
await copy(resolve(web, "brand/menu-appetite-v1.js"), "brand/menu-appetite-v1.js");
await copy(resolve(web, "brand/footer-storefront-v1.webp"), "brand/footer-storefront-v1.webp");
await copy(resolve(web,'brand/storefront-ink-v1.js'),'brand/storefront-ink-v1.js');
await copy(resolve(web,'vendor/three.module.js'),'vendor/three.module.js');
await copy(resolve(web, "brand/dish-serving-v2.js"), "brand/dish-serving-v2.js");
await copy(resolve(web, "brand/pickup-slip-v1.js"), "brand/pickup-slip-v1.js");
for (const file of ['addon-illustration-v3.webp','addon-barley-v4.webp','addon-sour-plum-v3.webp','addon-soft-egg-v4.webp','addon-cucumber-v4.webp','pairing-banner-backdrop-v6.webp']) await copy(resolve(web,'brand',file),`brand/${file}`);
for (const file of ["order-packaging-lockup.svg", "order-complete-seal.svg", "dumpling-symbol.svg"]) await copy(resolve(web, "brand", file), `brand/${file}`);
for (const file of ["entry-dinein-v1.svg", "entry-takeaway-v1.svg", "entry-delivery-v1.svg", "header-dinein-v1.svg", "header-takeaway-v1.svg", "header-delivery-v1.svg"]) await copy(resolve(web, "brand", file), `brand/${file}`);
let html = (await readFile(resolve(here, "index.html"), "utf8"))
  .replace('<html lang="zh-CN">', '<html lang="zh-CN" data-environment="production">')
  .replace(/<div class="preview-notice" id="previewNotice">[\s\S]*?<\/div>/, "");
for (const match of [...html.matchAll(/(?:src|href)="(\/[^"?]+\.(?:js|css))(?:\?[^" ]*)?"/g)]) {
  const hash = createHash("sha256").update(await readFile(resolve(output, `.${match[1]}`))).digest("hex").slice(0, 12);
  html = html.replace(match[0], match[0].replace(/"[^\"]+"$/, `"${match[1]}?v=${hash}"`));
}
await writeFile(resolve(output, "index.html"), html);
await writeFile(resolve(output, "vercel.json"), JSON.stringify({
  regions: ["sin1"], cleanUrls: true,
  functions: { "api/*.js": { maxDuration: 30 } },
  headers: [
    { source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Cache-Control", value: "no-store" },
    ] },
    { source: "/(img|fonts|brand)/(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] },
  ],
}, null, 2));
// A Vercel runtime project binding is not source data or a secret.
await copy(resolve(web, ".vercel/project.json"), ".vercel/project.json");
console.log(output);
