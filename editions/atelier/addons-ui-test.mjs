// Pure DOM-boundary fixtures: no browser or external services.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('addons-ui.js',import.meta.url),'utf8');
let dialog, applied=[], release, rejected=false, closed=0;
const catalog=['barley','sour-plum','soft-egg','cucumber'].map((id,i)=>({id:'lunch-v2-'+id,cn:id,name:id,price:i+1,section:i<2?'drinks':'sides',img:id+'.webp'}));
class Node {
  constructor(){this.listeners={};this.nodes=new Map();this.disabled=false;this.open=false;this.isConnected=true;this.textContent='';}
  setAttribute(){} focus(){} showModal(){this.open=true;} close(){this.open=false;} remove(){this.isConnected=false;}
  addEventListener(name,fn){this.listeners[name]=fn;}
  querySelector(key){if(!this.nodes.has(key))this.nodes.set(key,new Node());return this.nodes.get(key);}
  querySelectorAll(){return [this.querySelector('input'),this.querySelector('.addon-dismiss')];}
}
const ctx={document:{activeElement:new Node(),createElement(){return dialog=new Node();}},
  dish:id=>catalog.find(d=>d.id===id),name:d=>d.cn,photo:d=>d.img,itemPrice:d=>d.price,
  tr:a=>a,bi:a=>a,escapeHTML:s=>String(s).replaceAll('<','&lt;'),money:n=>'$'+n.toFixed(2),errorText:e=>e.message,
  order:{items:[]},options:{host:{append(){}},onClose(){closed++;},async onApply(items){applied.push(items);await new Promise(resolve=>release=resolve);if(rejected)throw Error('Not accepted');}},
};
vm.createContext(ctx);vm.runInContext(source,ctx);
const rail=vm.runInContext('AddonUI.section(order)',ctx);
for(const image of ['addon-barley-v4.webp','addon-sour-plum-v3.webp','addon-soft-egg-v4.webp','addon-cucumber-v4.webp','addon-illustration-v3.webp']) assert(rail.includes(image),`Campaign artwork is wired: ${image}`);
assert(!rail.includes('addon-stage-v2'),'No composited placeholder stage');
function open(preselect){ctx.options.preselect=preselect;return vm.runInContext('AddonUI.show(order,options)',ctx);}
function toggle(index,checked){const target={value:catalog[index].id,checked,matches:()=>true};dialog.listeners.change({target});}
const first=open();
assert(dialog.innerHTML.includes('id="addonDialogTitle" tabindex="-1" autofocus'),'Initial focus belongs to the heading, not a scrollable product row');
assert.equal(dialog.querySelector('.addon-popup-list').scrollTop,0,'Opening starts at the first product');
const css=await readFile(new URL('shared-table.css',import.meta.url),'utf8');
assert.match(css,/\.addon-popup-list \{[^}]*padding: 14px 20px 12px/,'Top inset separates the first image from the clipping boundary');
assert.equal(dialog.querySelector('.addon-apply').disabled,true);
toggle(0,true);toggle(1,true);
assert.match(dialog.querySelector('.addon-apply').textContent,/2.*\$3.00/);
assert.equal(applied.length,0,'Selection alone does not mutate the cart');
dialog.querySelector('.addon-dismiss').onclick();assert.equal(applied.length,0);assert.equal(closed,1);
const second=open(catalog[2].id);
assert.equal(dialog.querySelector('.addon-apply').disabled,false,'Inline plus only preselects its item');
toggle(0,true);
const pending=dialog.querySelector('.addon-apply').onclick();
assert.equal(applied.length,1);assert.equal(applied[0].length,2,'All choices passed as a single batch');
assert.equal(dialog.querySelector('.addon-apply').disabled,true);
await dialog.querySelector('.addon-apply').onclick();assert.equal(applied.length,1,'Double click is ignored while applying');
dialog.querySelector('.addon-dismiss').onclick();assert(dialog.isConnected,'Do not dismiss a pending submission');
release();await pending;assert(!dialog.isConnected);assert.equal(closed,2);
open();toggle(1,true);rejected=true;
const failure=dialog.querySelector('.addon-apply').onclick();release();await failure;
assert(dialog.isConnected);assert.equal(dialog.querySelector('.addon-popup-error').textContent,'Not accepted');
assert.equal(dialog.querySelector('.addon-apply').disabled,false);
let prevented=0,stopped=0;
dialog.listeners.cancel({preventDefault(){prevented++;},stopPropagation(){stopped++;}});
assert.equal(prevented,1);assert.equal(stopped,1,'Escape must not also close the parent checkout');
ctx.order.items=[{id:catalog[0].id,qty:1}];catalog[1].soldOut=true;
assert.deepEqual(Array.from(vm.runInContext('AddonUI.available(order)',ctx),d=>d.id),[catalog[2].id,catalog[3].id]);
assert(!/fetch\(|localStorage|\/api\//.test(source),'Picker cannot create orders or contact payment APIs');
console.log('PASS add-on picker: tentative multi-selection, skip, preselection, one batch apply, duplicate click guard, failure recovery and isolated Escape. No browser or live calls.');
