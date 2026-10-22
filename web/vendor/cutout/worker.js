// Self-hosted U2Netp inference: photos stay in this worker; only alpha is changed.
import * as ort from './ort.wasm.min.mjs';
import {plateContour,insideContour} from './plate-contour.mjs?v=4';
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = new URL('./', import.meta.url).href;
let session;
async function engine() {
  session ||= ort.InferenceSession.create(new URL('./u2netp.onnx',import.meta.url).href,{executionProviders:['wasm']}).catch(e=>{session=null;throw e});
  return session;
}
self.onmessage = async ({data:{id,blob}}) => {
  let bitmap;
  try {
    if(typeof OffscreenCanvas==='undefined'||!self.createImageBitmap)throw Error('此浏览器暂不支持抠图，请使用新版 Chrome 或 Safari');
    self.postMessage({id,stage:'正在加载抠图模型，首次使用稍久…'});
    const model=await engine();
    bitmap=await createImageBitmap(blob);
    const ratio=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    const width=Math.max(1,Math.round(bitmap.width*ratio)),height=Math.max(1,Math.round(bitmap.height*ratio));
    const original=new OffscreenCanvas(width,height),ctx=original.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(bitmap,0,0,width,height);
    const originalPixels=ctx.getImageData(0,0,width,height);
    const size=320,pixels=size*size,small=new OffscreenCanvas(size,size),sc=small.getContext('2d',{willReadFrequently:true});
    sc.fillStyle='#fff';sc.fillRect(0,0,size,size);sc.drawImage(original,0,0,size,size);
    const rgba=sc.getImageData(0,0,size,size).data,values=new Float32Array(pixels*3);
    let max=1;for(let i=0;i<pixels;i++)for(let ch=0;ch<3;ch++)max=Math.max(max,rgba[i*4+ch]);
    const means=[.485,.456,.406],std=[.229,.224,.225];
    for(let ch=0;ch<3;ch++)for(let i=0;i<pixels;i++)values[ch*pixels+i]=(rgba[i*4+ch]/max-means[ch])/std[ch];
    self.postMessage({id,stage:'正在识别菜品和餐具边缘…'});
    const output=await model.run({[model.inputNames[0]]:new ort.Tensor('float32',values,[1,3,size,size])});
    const result=output[model.outputNames[0]].data;
    let low=Infinity,high=-Infinity;
    for(let i=0;i<pixels;i++){low=Math.min(low,result[i]);high=Math.max(high,result[i])}
    if(high-low<.00001)throw Error('未能识别菜品边缘，请换一张背景更清楚的照片');
    const mask=new Uint8Array(pixels);for(let i=0;i<pixels;i++)mask[i]=Math.round(255*(result[i]-low)/(high-low));
    // Drop isolated background specks, keeping the largest connected subject.
    const visited=new Uint8Array(pixels),queue=new Int32Array(pixels);let largest=[];
    for(let start=0;start<pixels;start++){
      if(visited[start]||mask[start]<32)continue;
      let head=0,tail=1;queue[0]=start;visited[start]=1;
      while(head<tail){const i=queue[head++],x=i%size,y=Math.floor(i/size);
        for(const n of [x>0?i-1:-1,x<size-1?i+1:-1,y>0?i-size:-1,y<size-1?i+size:-1])if(n>=0&&!visited[n]&&mask[n]>=32){visited[n]=1;queue[tail++]=n}}
      if(tail>largest.length)largest=Array.from(queue.subarray(0,tail));
    }
    if(largest.length<pixels*.01||largest.length>pixels*.98)throw Error('未能可靠区分菜品与背景，请换一张照片');
    const plate=plateContour(rgba,mask,largest,size);
    if(plate){
      const included=new Set(largest);
      for(let i=0;i<pixels;i++)if(!included.has(i)&&insideContour(i%size,Math.floor(i/size),plate.hull,plate.padding+1))largest.push(i);
    }
    const keep=new Uint8Array(pixels);let minX=size,minY=size,maxX=0,maxY=0;
    for(const i of largest){const x=i%size,y=Math.floor(i/size);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx>=0&&x+dx<size&&y+dy>=0&&y+dy<size)keep[(y+dy)*size+x+dx]=1;}
    const alpha=sc.createImageData(size,size);
    for(let i=0;i<pixels;i++){alpha.data[i*4+3]=keep[i]?(mask[i]<5?0:mask[i]>245?255:mask[i]):0;}
    sc.putImageData(alpha,0,0);
    const fullMask=new OffscreenCanvas(width,height),mc=fullMask.getContext('2d');mc.drawImage(small,0,0,width,height);
    if(plate){
      if(plate.curved)mc.clearRect(0,0,width,height);
      mc.save();mc.scale(width/size,height/size);mc.fillStyle='#fff';mc.strokeStyle='#fff';mc.lineWidth=plate.padding*2;mc.lineJoin='round';
      mc.beginPath();plate.hull.forEach(([x,y],i)=>i?mc.lineTo(x+.5,y+.5):mc.moveTo(x+.5,y+.5));mc.closePath();mc.fill();mc.stroke();mc.restore();
    }
    ctx.globalCompositeOperation='destination-in';ctx.drawImage(fullMask,0,0);
    // For an evenly lit pale backdrop, refine only the background connected to
    // the frame. White rice enclosed by a dark bowl is never selected by colour alone.
    const src=originalPixels.data,samples=[];
    for(let x=0;x<width;x+=16){samples.push(x*4,((height-1)*width+x)*4)}
    for(let y=0;y<height;y+=16){samples.push(y*width*4,(y*width+width-1)*4)}
    const bg=[0,1,2].map(ch=>samples.map(i=>src[i+ch]).sort((a,b)=>a-b)[Math.floor(samples.length/2)]);
    const distance=i=>Math.max(Math.abs(src[i*4]-bg[0]),Math.abs(src[i*4+1]-bg[1]),Math.abs(src[i*4+2]-bg[2]));
    const consistent=samples.filter(i=>Math.max(...bg.map((v,ch)=>Math.abs(src[i+ch]-v)))<24).length/samples.length;
    if(!plate&&consistent>.8&&Math.min(...bg)>160&&Math.max(...bg)-Math.min(...bg)<40){
      const count=width*height,background=new Uint8Array(count),todo=new Int32Array(count);let head=0,tail=0;
      const add=i=>{if(!background[i]&&(src[i*4+3]===0||distance(i)<48)){background[i]=1;todo[tail++]=i}};
      for(let x=0;x<width;x++){add(x);add((height-1)*width+x)}
      for(let y=0;y<height;y++){add(y*width);add(y*width+width-1)}
      while(head<tail){const i=todo[head++],x=i%width,y=Math.floor(i/width);if(x)add(i-1);if(x<width-1)add(i+1);if(y)add(i-width);if(y<height-1)add(i+width)}
      const combined=ctx.getImageData(0,0,width,height).data;
      for(let i=0;i<count;i++)src[i*4+3]=background[i]?0:combined[i*4+3];
      ctx.putImageData(originalPixels,0,0);
    }

    const x=Math.max(0,Math.floor((minX-2)*width/size)),y=Math.max(0,Math.floor((minY-2)*height/size));
    const w=Math.min(width-x,Math.ceil((maxX-minX+5)*width/size)),h=Math.min(height-y,Math.ceil((maxY-minY+5)*height/size));
    const side=Math.ceil(Math.max(w,h)*1.1),canvas=new OffscreenCanvas(side,side);
    canvas.getContext('2d').drawImage(original,x,y,w,h,Math.round((side-w)/2),Math.round((side-h)/2),w,h);
    let cutout=await canvas.convertToBlob({type:'image/png'});
    if(cutout.size>2*1024*1024)cutout=await canvas.convertToBlob({type:'image/webp',quality:.95});
    if(cutout.size>2*1024*1024)throw Error('透明图片过大，请先选择较小的原图');
    self.postMessage({id,blob:cutout,width:side,height:side,source:{width,height,x,y,offsetX:Math.round((side-w)/2),offsetY:Math.round((side-h)/2)},plateRecovered:Boolean(plate),curved:Boolean(plate?.curved)});
  } catch(e) {self.postMessage({id,error:e.message||'自动抠图失败，请稍后重试'});}
  finally {bitmap?.close();}
};
