// Isolated website preview: API traffic goes ONLY to its own loopback backend.
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {orderingDocument} from './ordering-document.mjs';
import {catalogueBootstrap} from './catalogue-bootstrap.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..');
const bundle=process.argv[2]||execFileSync(process.execPath,[resolve(here,'build.mjs')],{encoding:'utf8'}).trim();
const previewPort=Number(process.env.PORT||7903),backendPort=Number(process.env.DL_BACKEND_PORT||previewPort+1),previewOrigin=`http://127.0.0.1:${previewPort}`;
const soundReference=resolve(process.env.DL_SOUND_REFERENCE||'/Users/youwen/Desktop/Dumpling Lab.mp4');
const bootstrap=await catalogueBootstrap(bundle);
const data=await mkdtemp(resolve(tmpdir(),'dumplinglab-website-preview-'));
const backend=spawn(process.execPath,[resolve(root,'editions/atelier/preview.mjs')],{env:{...process.env,PORT:String(backendPort),DL_PREVIEW_DATA:data,DL_PREVIEW_ORIGIN:previewOrigin},stdio:['ignore','pipe','inherit']});
await new Promise((ok,no)=>{backend.stdout.once('data',ok);backend.once('error',no);backend.once('exit',code=>no(new Error(`Local backend exited: ${code}`)))});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.mp4':'video/mp4','.wav':'audio/wav','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:7903');
  if(url.pathname.startsWith('/api/')){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const headers={};for(const name of ['content-type','authorization','x-pickup-code','cookie','if-none-match'])if(req.headers[name])headers[name]=req.headers[name];
   const upstream=await fetch(`http://127.0.0.1:${backendPort}`+url.pathname+url.search,{method:req.method,headers,redirect:'error',...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
   const responseHeaders={'content-type':upstream.headers.get('content-type')||'application/json','cache-control':'no-store'};
   if(upstream.headers.getSetCookie().length)responseHeaders['set-cookie']=upstream.headers.getSetCookie();
   res.writeHead(upstream.status,responseHeaders);res.end(Buffer.from(await upstream.arrayBuffer()));return;
  }
  // 本地预览：一键登录成测试会员，方便在自己的浏览器里看券。
  if(url.pathname==='/preview-login'){
   const upstream=await fetch(`http://127.0.0.1:${backendPort}/api/member`,{method:'POST',
     headers:{'content-type':'application/json'},body:JSON.stringify({action:'preview-login'})});
   const cookies=upstream.headers.getSetCookie();
   // 同时清掉浏览器里残留的购物车/待确认订单，本地服务重启后它们会和服务端对不上。
   const next=JSON.stringify(url.searchParams.get('next')||'/order?table=C3');
   res.writeHead(200,{'content-type':'text/html; charset=utf-8',
     ...(cookies.length?{'set-cookie':cookies}:{}),'cache-control':'no-store'});
   return res.end(`<!doctype html><meta charset="utf-8"><script>try{localStorage.clear();sessionStorage.clear()}catch(e){}location.replace(${next})</script>`);
  }
  let path=decodeURIComponent(url.pathname);
  if(path.split('/').some(segment=>segment.startsWith('.'))||!['GET','HEAD'].includes(req.method))throw Object.assign(new Error('Not found'),{code:'ENOENT'});
  if(path==='/site/catalogue-bootstrap.js'){
   res.writeHead(200,{'content-type':mime['.js'],'cache-control':'no-store','content-length':Buffer.byteLength(bootstrap)});
   res.end(req.method==='HEAD'?undefined:bootstrap);return;
  }
  if(path==='/'||path==='/index.html')path='/index.html';
  if(path==='/sound-review'||path==='/sound-review/')path='/sound-review.html';
  if(path==='/review'||path==='/review/')path='/review.html';
  if(path==='/review/35')path='/review-35.html';
  if(path==='/review/49')path='/review-49.html';
  if(path==='/review/61')path='/review-61.html';
  if(path==='/review/80')path='/review-80.html';
  if(path==='/review/100')path='/review-100.html';
  if(path==='/review/105')path='/review-105.html';
  if(path==='/review/110')path='/review-110.html';
  if(path==='/review/111')path='/review-111.html';
  if(path==='/review/114')path='/review-114.html';
  if(path==='/review/120')path='/review-120.html';
  if(path==='/voucher'||path==='/voucher/')path='/voucher.html';
  if(path==='/voucher.html'){const page=await readFile(resolve(here,'voucher.html'),'utf8');res.writeHead(200,{'content-type':mime['.html'],'cache-control':'no-store'});return res.end(req.method==='HEAD'?undefined:page)}
  if(path==='/staff')path='/staff.html';
  if(path==='/catalog-admin')path='/catalog-admin.html';
  if(['/order','/order/','/order.html'].includes(path)){
   const html=orderingDocument(await readFile(resolve(root,'editions/atelier/index.html'),'utf8'));res.writeHead(200,{'content-type':mime['.html'],'cache-control':'no-store'});res.end(req.method==='HEAD'?undefined:html);return;
  }
  // Live website source, assembled shared assets. Never expose repository data.
  let target=resolve(bundle,'.'+path);
  if(!target.startsWith(bundle+sep))throw Object.assign(new Error('Not found'),{code:'ENOENT'});
  if(['/site/site.css','/site/site.js','/site/website-catalog.js','/site/cinema.css','/site/cinema.js','/site/motion-math.mjs','/site/stage.css','/site/stage.js','/site/campaign.css','/site/voucher.css','/site/voucher.js'].includes(path))target=resolve(here,path.split('/').pop());
  if(/^\/site\/fonts\/[a-zA-Z0-9-]+\.(ttf|woff2|txt)$/.test(path))target=resolve(here,'fonts',path.split('/').pop());
  if(/^\/site\/media\/[a-z0-9-]+\.(webp|mp4|wav|png)$/.test(path))target=resolve(here,'media',path.split('/').pop());
  if(path==='/site/media/brand-favicon.png')target=resolve(here,'media/brand-favicon.png');
  if(['/site/media/brand-dinein.svg','/site/media/brand-takeaway.svg'].includes(path))target=resolve(here,'media',path.split('/').pop());
  if(path==='/index.html')target=resolve(here,'index.html');
  // Local-only sound comparison. Neither file is assembled into a release.
  if(path==='/sound-review.html')target=resolve(here,'sound-review.html');
  if(path==='/sound-reference.mp4')target=soundReference;
  if(/^\/sound-review-media\/(?:a3-tail|c1-elements)-exact-fx\.wav$/.test(path))target=resolve(here,'generated/sound-review',path.split('/').pop());
  if(path==='/review.html')target=resolve(here,'review.html');
  if(path==='/review-35.html')target=resolve(here,'review-35.html');
  if(path==='/review-49.html')target=resolve(here,'review-49.html');
  if(path==='/review-61.html')target=resolve(here,'review-61.html');
  if(path==='/review-80.html')target=resolve(here,'review-80.html');
  if(path==='/review-100.html')target=resolve(here,'review-100.html');
  if(path==='/review-105.html')target=resolve(here,'review-105.html');
  if(path==='/review-110.html')target=resolve(here,'review-110.html');
  if(path==='/review-111.html')target=resolve(here,'review-111.html');
  if(path==='/review-114.html')target=resolve(here,'review-114.html');
  if(path==='/review-120.html')target=resolve(here,'review-120.html');
  // Explicit local evidence allowlist. This directory is never assembled into
  // a website release, and this route cannot browse arbitrary workspace files.
  if(/^\/review-media\/120\/(?:(?:desktop|phone)-(?:fried|chilli|broth|film|food|space|visit|footer)\.png|(?:desktop|phone)-en-(?:fried|chilli|broth)\.png|dumpling-lab-(?:browser|phone)-motion\.mp4)$/.test(path))target=resolve(root,'output/website-d46-checkpoint-120',path.split('/').pop());
  if(/^\/review-media\/114\/(?:(?:desktop|phone)-(?:fried|chilli|broth|film|food|space|visit|footer)\.png|(?:desktop|phone)-en-(?:fried|chilli|broth)\.png|dumpling-lab-(?:browser|phone)-motion\.mp4)$/.test(path))target=resolve(root,'output/website-d46-checkpoint-114',path.split('/').pop());
  if(path==='/review-media/105/dumpling-lab-browser-motion.mp4')target=resolve(root,'output/website-d46-checkpoint-105/dumpling-lab-browser-motion.mp4');
  if(/^\/review-media\/110\/dumpling-lab-(?:browser|phone)-motion\.mp4$/.test(path))target=resolve(root,'output/website-d46-checkpoint-110',path.split('/').pop());
  if(/^\/review-media\/111\/(?:(?:desktop|phone)-(?:fried|chilli|broth|film|food|space|visit|footer)\.png|(?:desktop|phone)-en-(?:fried|chilli|broth)\.png|dumpling-lab-(?:browser|phone)-motion\.mp4)$/.test(path))target=resolve(root,'output/website-d46-checkpoint-111',path.split('/').pop());
  if(/^\/review-media\/(?:(?:desktop|phone)-(?:fried|chilli|broth)\.png|dumpling-lab-browser-motion\.mp4)$/.test(path))target=resolve(root,'output/website-d46-checkpoint-35',path.split('/').pop());
  if(/^\/review-media\/49\/(?:(?:desktop|phone)-(?:fried|chilli|broth|food|space|visit)\.png|dumpling-lab-browser-motion\.mp4)$/.test(path))target=resolve(root,'output/website-d46-checkpoint-49',path.split('/').pop());
  if(/^\/review-media\/61\/(?:(?:desktop|phone)-(?:fried|chilli|broth|food|space|visit|footer)\.png|dumpling-lab-browser-motion\.mp4)$/.test(path))target=resolve(root,'output/website-d46-checkpoint-61',path.split('/').pop());
  if(/^\/review-media\/80\/(?:(?:desktop|phone)-(?:fried|chilli|broth|film|food|space|visit|footer)\.png|dumpling-lab-browser-motion\.mp4)$/.test(path))target=resolve(root,'output/website-d46-checkpoint-80',path.split('/').pop());
  if(/^\/review-media\/100\/(?:(?:desktop|phone)-(?:en-)?(?:fried|chilli|broth|film|food|space|visit|footer)\.png|dumpling-lab-browser-motion\.mp4)$/.test(path))target=resolve(root,'output/website-d46-checkpoint-100',path.split('/').pop());
  const body=await readFile(target),headers={'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store','content-length':body.length};
  if(extname(path)==='.mp4'){
   headers['accept-ranges']='bytes';
   if(req.headers.range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    const start=match?(match[1]?Number(match[1]):Math.max(0,body.length-Number(match[2]))):NaN;
    const end=match?(match[1]&&match[2]?Math.min(Number(match[2]),body.length-1):body.length-1):NaN;
    if(!match||(!match[1]&&!match[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=body.length){res.writeHead(416,{'content-range':`bytes */${body.length}`});res.end();return}
    headers['content-range']=`bytes ${start}-${end}/${body.length}`;headers['content-length']=end-start+1;
    res.writeHead(206,headers);res.end(req.method==='HEAD'?undefined:body.subarray(start,end+1));return;
   }
  }
  res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:body);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:500,{'content-type':'text/plain'});res.end('Preview unavailable');}
});
server.listen(previewPort,'127.0.0.1',()=>console.log(`Dumpling Lab website preview: ${previewOrigin}/`));
const stop=()=>{backend.kill('SIGTERM');server.close(()=>process.exit(0));};
process.on('SIGINT',stop);process.on('SIGTERM',stop);process.on('exit',()=>backend.kill('SIGTERM'));
