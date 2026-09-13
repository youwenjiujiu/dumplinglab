// Assemble the website and unchanged ordering runtime in one release.
// This command does not deploy or modify the original menu release builder.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {orderingDocument} from './ordering-document.mjs';
import {websiteFiles,websiteFonts,websiteMedia} from './release-assets.mjs';
import {catalogueBootstrap} from './catalogue-bootstrap.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..');
const output=execFileSync(process.execPath,[resolve(root,'editions/atelier/build-production.mjs')],{encoding:'utf8'}).trim();
// The existing acceptance suite expects ordering at index.html; run it before
// assigning the homepage. Only a footer home link is added to that document.
execFileSync(process.execPath,[resolve(root,'editions/atelier/lunch-build-test.mjs'),output],{stdio:'pipe'});
await writeFile(resolve(output,'order.html'),orderingDocument(await readFile(resolve(output,'index.html'),'utf8')));
await mkdir(resolve(output,'site'));
await copyFile(resolve(root,'web/fonts/scto-grotesk-a-bold.woff2'),resolve(output,'fonts/scto-grotesk-a-bold.woff2'));
for(const name of websiteFiles)await copyFile(resolve(here,name),resolve(output,'site',name));
await writeFile(resolve(output,'site/catalogue-bootstrap.js'),await catalogueBootstrap(output));
await mkdir(resolve(output,'site/fonts'));
for(const name of websiteFonts)await copyFile(resolve(here,'fonts',name),resolve(output,'site/fonts',name));
await mkdir(resolve(output,'site/media'));
for(const name of websiteMedia)await copyFile(resolve(here,'media',name),resolve(output,'site/media',name));
await sharp(resolve(root,'web/brand/interior-reference.png')).resize({width:1800,withoutEnlargement:true}).webp({quality:88}).toFile(resolve(output,'site/interior.webp'));
await copyFile(resolve(root,'web/brand/restaurant-front-20260908.webp'),resolve(output,'site/front.webp'));
let html=(await readFile(resolve(here,'index.html'),'utf8'))
 .replace('<html lang="en">','<html lang="en" data-environment="production">');
for(const match of [...html.matchAll(/(?:src|href)="(\/[^"?]+\.(?:js|css))"/g)]){
 const hash=createHash('sha256').update(await readFile(resolve(output,'.'+match[1]))).digest('hex').slice(0,12);
 html=html.replace(match[0],match[0].replace(match[1],`${match[1]}?v=${hash}`));
}
await writeFile(resolve(output,'index.html'),html);
console.log(output);
