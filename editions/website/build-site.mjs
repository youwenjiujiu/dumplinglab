// The website and the ordering app are two Vercel projects sharing one
// catalogue. This assembles the website-only release: the ordering runtime, its
// API and its 50 MB of dish photography stay in the ordering project and are
// reached across the domain boundary, so there is never a second copy to keep
// in step. Deploy the printed directory to the `dumplinglab` project.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const here=dirname(fileURLToPath(import.meta.url));
const ordering='https://order.dumplinglab.sg';
const output=execFileSync(process.execPath,[resolve(here,'build.mjs')],{encoding:'utf8'}).trim();

// Ordering-only payload. A second copy would mean a second catalogue, a second
// set of Stripe and Blob credentials, and two things to keep in step.
for(const name of ['api','server','img','vendor','order.html','staff.html',
 'catalog-admin.html','catalog-admin.js','catalog-admin.css','rewards-admin.js',
 'wallet-admin.js','report-admin.js','package.json','package-lock.json','vercel.json'])
 await rm(resolve(output,name),{recursive:true,force:true});

// `/order` was this project's own path while both sites shared one deployment.
for(const name of ['site/site.js','site/stage.js','site/website-catalog.js']){
 const file=resolve(output,name),text=await readFile(file,'utf8');
 const next=text.replaceAll('/order?lang=',`${ordering}/?lang=`).replaceAll('"/order"',`"${ordering}/"`);
 if(next!==text)await writeFile(file,next);
}

await writeFile(resolve(output,'vercel.json'),JSON.stringify({
 regions:['sin1'],cleanUrls:true,
 rewrites:[
  // Same-origin to the browser, so the homepage needs no CORS and no second
  // catalogue; the ordering project stays the only source of truth.
  {source:'/api/catalog',destination:`${ordering}/api/catalog`},
  // Dish photography, including anything uploaded through the back office
  // after this release was built.
  {source:'/img/:path*',destination:`${ordering}/img/:path*`},
 ],
 redirects:[
  {source:'/order',destination:`${ordering}/`,permanent:false},
  {source:'/order/(.*)',destination:`${ordering}/$1`,permanent:false},
  // The back office and the staff console live with the ordering app. Typing
  // them on this domain is an easy mistake; send them across instead of 404ing.
  {source:'/staff',destination:`${ordering}/staff`,permanent:false},
  {source:'/staff/(.*)',destination:`${ordering}/staff/$1`,permanent:false},
  {source:'/catalog-admin',destination:`${ordering}/catalog-admin`,permanent:false},
  {source:'/admin',destination:`${ordering}/catalog-admin`,permanent:false},
 ],
 headers:[
  {source:'/(.*)',headers:[
   {key:'X-Content-Type-Options',value:'nosniff'},
   {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
   {key:'X-Frame-Options',value:'SAMEORIGIN'},
   {key:'Cache-Control',value:'no-store'},
  ]},
  {source:'/site/(.*)',headers:[{key:'Cache-Control',value:'public, max-age=0, must-revalidate'}]},
  {source:'/fonts/(.*)',headers:[{key:'Cache-Control',value:'public, max-age=0, must-revalidate'}]},
 ],
},null,2));

// The homepage links its scripts with a content hash; rewriting them above
// changed that content, so the hashes have to be taken after the rewrite.
let html=(await readFile(resolve(here,'index.html'),'utf8'))
 .replace('<html lang="en">','<html lang="en" data-environment="production">')
 .replaceAll('"/order"',`"${ordering}/"`);
for(const match of [...html.matchAll(/(?:src|href)="(\/[^"?]+\.(?:js|css))"/g)]){
 const hash=createHash('sha256').update(await readFile(resolve(output,'.'+match[1]))).digest('hex').slice(0,12);
 html=html.replace(match[0],match[0].replace(match[1],`${match[1]}?v=${hash}`));
}
await writeFile(resolve(output,'index.html'),html);

await mkdir(resolve(output,'.vercel'),{recursive:true});
await writeFile(resolve(output,'.vercel/project.json'),JSON.stringify({
 projectId:'prj_FjpPmRiVRTKw2DZhsTGA79gniQ3v',orgId:'team_96tQCHcHZ6GhFaMNlXIrrkYE',projectName:'dumplinglab',
}));
console.log(output);
