// Exercise image preparation without network; pixel rendering is browser-owned.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../../web/catalog-admin.js',import.meta.url),'utf8');
const prepare=source.slice(source.indexOf('  function transparentBounds('),source.indexOf('  async function uploadPhoto('));
let revoke=0,creates=0,width=4000,height=3000,decodeError=false,canvas,drawn=0,margin=0;
const ctx=vm.createContext({
 URL:{createObjectURL(){creates++;return 'blob:fixture'},revokeObjectURL(){revoke++}},
 Image:class{constructor(){this.naturalWidth=width;this.naturalHeight=height}set src(v){queueMicrotask(()=>decodeError?this.onerror():this.onload())}},
 document:{createElement(tag){assert.equal(tag,'canvas');const c={width:0,height:0,getContext(){return {fillRect(){},drawImage(){drawn++;assert(c.width<=1600);assert(c.height<=1600)},getImageData(x,y,w,h){const data=new Uint8ClampedArray(w*h*4);for(let j=0;j<h;j++)for(let i=0;i<w;i++)data[(j*w+i)*4+3]=i>=w*margin&&i<w*(1-margin)&&j>=h*margin&&j<h*(1-margin)?255:0;return {data}}}},toBlob(cb,mime){cb({size:180000,type:mime,width:c.width,height:c.height})}};canvas=c;return c}},
});
vm.runInContext(prepare,ctx);
const preparePhoto=vm.runInContext('preparePhoto',ctx);
const large={name:'camera.jpg',size:8*1024*1024,type:'image/jpeg'};
let result=await preparePhoto(large);
assert.equal(result.type,'image/jpeg');assert(result.size<2*1024*1024);assert.equal(drawn,1);
assert.equal(canvas.width,0,'Canvas storage released');assert.equal(revoke,1);
width=800;height=600;const small={name:'small.png',size:120000,type:'image/png'};
assert.equal(await preparePhoto(small),small,'Small eligible images remain byte-exact');
width=4000;height=3000;
result=await preparePhoto({...large,type:'image/png'});assert.equal(result.type,'image/webp','Preserve transparent source with WebP');
result=await preparePhoto({...large,type:'image/heic',name:'phone.heic'});assert.equal(result.type,'image/jpeg');
decodeError=true;
await assert.rejects(preparePhoto(large),/HEIC/);assert.equal(revoke,creates,'Object URLs released on failures too');
const before=creates;
await assert.rejects(preparePhoto({...large,size:21*1024*1024}),/20 MB/);
await assert.rejects(preparePhoto({...small,type:'image/svg+xml'}),/请选择/);
assert.equal(creates,before,'Oversize and unsupported inputs rejected before decode');
decodeError=false;width=10000;height=6000;
await assert.rejects(preparePhoto(large),/尺寸/);
assert.equal(revoke,creates);
// A cut-out with a wide transparent border is trimmed to the dish plus a thin margin.
margin=0.15;width=1200;height=1200;drawn=0;
result=await preparePhoto({name:'cutout.png',size:500000,type:'image/png'});
assert.equal(result.type,'image/webp');assert(result.width<1000&&result.width>=840,'border trimmed, about 3% kept: '+result.width);
margin=0.01;result=await preparePhoto({name:'tight.png',size:120000,type:'image/png'});assert.equal(result.name,'tight.png','an already tight image is uploaded unchanged');
margin=0;
console.log('PASS photo preparation: 8 MB camera photo resize, small image preservation, transparent output, decoded HEIC conversion, decode failures, size/type/pixel limits and resource cleanup.');
