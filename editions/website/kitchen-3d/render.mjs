import {createServer} from 'node:http';
import {readFile,mkdir,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const root=resolve('editions/website'),out=resolve('output/website-kitchen-3d-v1');await mkdir(out,{recursive:true});
const routes={'/scene.html':resolve(root,'kitchen-3d/scene.html'),'/scene.js':resolve(root,'kitchen-3d/scene.js'),'/three.js':resolve('web/vendor/three.module.js'),'/font.woff2':resolve(root,'fonts/LilitaOne-Regular.woff2')};
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname,file=routes[p];if(!file){res.writeHead(404);res.end();return}const body=await readFile(file);res.setHeader('content-type',p.endsWith('.js')?'application/javascript':p.endsWith('.woff2')?'font/woff2':'text/html');res.end(body)}catch{res.writeHead(500);res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});
try{const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});page.on('pageerror',e=>console.error(e));await page.goto(`http://127.0.0.1:${server.address().port}/scene.html?capture=1`);await page.waitForFunction(()=>window.ready);
for(const [name,t]of [['roll',2.5],['fill',6.2],['fold',11],['boil',16],['serve',22]]){await page.evaluate(t=>window.renderFrame(t),t);await page.screenshot({path:resolve(out,name+'.png')})}
console.log('Five scene review frames saved to '+out);
if(!process.argv.includes('--video'))process.exitCode=0;
else{
const target=resolve(out,'dumpling-lab-kitchen-3d-v1.mp4');if(await access(target).then(()=>true,()=>false))throw new Error('Video already exists; use a new version before rendering.');
const ff=spawn('ffmpeg',['-nostdin','-n','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate','24','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',target],{stdio:['pipe','inherit','inherit']});
const done=once(ff,'exit');for(let i=0;i<552;i++){await page.evaluate(t=>window.renderFrame(t),i/24);const frame=await page.screenshot({type:'jpeg',quality:95});if(!ff.stdin.write(frame))await once(ff.stdin,'drain');if(i%48===0)console.log(`Rendered ${i}/552 frames`)}ff.stdin.end();const[code]=await done;if(code!==0)throw new Error('Encoding failed: '+code);console.log(target);
}
}finally{await browser.close();await new Promise(r=>server.close(r))}
