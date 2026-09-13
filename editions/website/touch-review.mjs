// Native Chromium touch gestures in a fresh emulated mobile viewport. These
// are not physical iOS/WeChat tests and do not interact with production orders.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];assert(out);await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
const page=await context.newPage(),cdp=await context.newCDPSession(page),report=[];
async function home(){await page.goto('http://127.0.0.1:7903/?lang=zh');await page.locator('#stageImage').evaluate(e=>e.decode())}
async function drag(from,to){
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from[0],y:from[1],id:1}]});
 for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from[0]+(to[0]-from[0])*i/10,y:from[1]+(to[1]-from[1])*i/10,id:1}]});await new Promise(r=>setTimeout(r,16))}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
try{
 await home();await drag([285,370],[100,370]);
 await page.waitForFunction(()=>document.querySelector('#productStage').dataset.course==='chilli',{},{timeout:3000});
 assert.equal(await page.evaluate(()=>scrollY),0);report.push({horizontalSwipeChangesDish:true,noPageJump:true});await page.screenshot({path:out+'/horizontal-swipe.png'});
 await home();await drag([190,550],[190,270]);await page.waitForFunction(()=>scrollY>100);
 assert.equal(await page.locator('#productStage').getAttribute('data-course'),'fried');report.push({verticalGestureScrolls:true,noDishChange:true});await page.screenshot({path:out+'/vertical-scroll.png'});
 await home();await page.locator('#nextCourse').tap();await page.waitForFunction(()=>document.querySelector('#productStage').dataset.course==='chilli');report.push({touchButtonWorks:true});
 await home();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:150,y:350,id:1},{x:240,y:350,id:2}]});
 for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:150-i*7,y:350,id:1},{x:240+i*7,y:350,id:2}]});await new Promise(r=>setTimeout(r,16))}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>visualViewport.scale>1.1,{},{timeout:3000});
 assert.equal(await page.locator('#productStage').getAttribute('data-course'),'fried');report.push({pinchZoomPreserved:true,multitouchDoesNotSelect:true});
 // After zooming, dragging the magnified page must pan the viewport rather
 // than be mistaken for the ordinary carousel's horizontal swipe.
 const beforePan=await page.evaluate(()=>({scale:visualViewport.scale,x:visualViewport.offsetLeft,y:visualViewport.offsetTop}));
 await drag([280,430],[110,430]);
 await page.waitForFunction(before=>Math.abs(visualViewport.offsetLeft-before.x)>1||Math.abs(visualViewport.offsetTop-before.y)>1,beforePan);
 assert.equal(await page.locator('#productStage').getAttribute('data-course'),'fried');
 const afterPan=await page.evaluate(()=>({scale:visualViewport.scale,x:visualViewport.offsetLeft,y:visualViewport.offsetTop}));
 report.push({zoomedPanningPreserved:true,noDishChange:true,beforePan,afterPan});
}finally{await context.close();await browser.close()}
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,cases:report.length,evidence:out}));
