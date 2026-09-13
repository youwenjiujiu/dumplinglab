// Cacheable, read-only copy of an already assembled release for BFCache tests.
// Ephemeral loopback port; no production proxy, no cart/order/admin writes.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
export async function cacheableFixture(directory){
 const root=resolve(directory);if(!(await stat(root)).isDirectory())throw new Error('Bundle directory required');
 const catalogueResponse=await fetch('http://127.0.0.1:7903/api/catalog');
 if(!catalogueResponse.ok)throw new Error('Local catalogue fixture unavailable');
 const catalogue=JSON.stringify(await catalogueResponse.json());
 const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4'};
 const server=createServer(async(req,res)=>{
  try{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
   let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(path==='/api/catalog'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(req.method==='HEAD'?undefined:catalogue);return}
   if(path.startsWith('/api/')){res.writeHead(404);res.end();return}
   if(path==='/review'){
    const html='<!doctype html><title>Local history target</title><p>Read-only history test.</p>';
    res.writeHead(200,{'content-type':types['.html'],'cache-control':'public, max-age=0, must-revalidate'});res.end(req.method==='HEAD'?undefined:html);return;
   }
   if(path==='/')path='/index.html';
   if(path.split('/').some(s=>s.startsWith('.')))throw new Error('Not found');
   const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw new Error('Not found');
   const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'public, max-age=0, must-revalidate','content-length':body.length});res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end()}
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return{origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(ok=>server.close(ok))};
}
