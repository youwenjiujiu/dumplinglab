// Isolated controller/HTML contract checks; not browser or visual QA.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html = await readFile(new URL('../../web/catalog-admin.html',import.meta.url),'utf8');
const source = await readFile(new URL('../../web/catalog-admin.js',import.meta.url),'utf8');
const css = await readFile(new URL('../../web/catalog-admin.css',import.meta.url),'utf8');
const nodes = new Map(), fields = {};
class Element {
  constructor(key) { this.key=key;this.dataset={};this.listeners={};this.hidden=false;this.disabled=false;this.open=false;this.isConnected=true;this.attrs={};this._value='';this._html=''; }
  set value(v) { this._value=String(v); } get value() { return this._value; }
  set innerHTML(v) { this._html=v; if(this.key==='#prices') for(const m of v.matchAll(/name="([^"]+)"[^>]*value="([^"]+)"/g)){fields[m[1]]=new Element(m[1]);fields[m[1]].value=m[2];} }
  get innerHTML() { return this._html; }
  setAttribute(k,v) { this.attrs[k]=v; }
  addEventListener(k,fn) { this.listeners[k]=fn; }
  focus() { focused=this; }
  showModal() { this.open=true; }
  close() { this.open=false; }
  reset() {}
  querySelectorAll() { return [...Object.values(fields), ...['save','closeEditor','cancelEdit','keepEditing','discardChanges'].map(id=>nodes.get('#'+id))]; }
}
let focused;
for(const [,id] of html.matchAll(/id="([^"]+)"/g)){assert(!nodes.has('#'+id),'unique IDs');nodes.set('#'+id,new Element('#'+id));}
for(const [,name] of html.matchAll(/name="([^"]+)"/g)) fields[name]=new Element(name);
fields.section.options=Object.keys({dumplings:1,noodles:1,sides:1,drinks:1,recommended:1}).map(value=>({value}));
nodes.get('#editForm').elements=fields;
nodes.set('.metrics',new Element('.metrics')); nodes.set('.editor-scroll',new Element('.editor-scroll'));
nodes.get('#workspace').hidden=true;
const nav=['catalog','history'].map(view=>{const e=new Element(view);e.dataset.view=view;return e;});
const editorSections=['basic','price','stock','image'].map(section=>{const e=new Element(section);e.dataset.editorSection=section;return e;});
const metrics=['','available','low','sold'].map(filter=>{const e=new Element(filter);e.dataset.filter=filter;return e;});
const items=[
  {id:'a',cn:'招牌饺子',name:'House dumpling',flavor:'',section:'dumplings',sort:0,active:true,soldOut:false,manualSoldOut:false,stock:17,reserved:3,available:14,stockUnit:'颗',price:5.8,variants:{five:{pieces:5},nine:{pieces:9}},portionPrices:{5:5.8,9:9.8},img:'a.png'},
  {id:'b',cn:'豆腐',name:'Tofu',flavor:'',section:'sides',sort:1,active:true,soldOut:false,manualSoldOut:false,stock:null,reserved:0,available:null,stockUnit:'份',price:5.2,img:'b.png'},
  {id:'c',cn:'米饭',name:'Rice',flavor:'',section:'sides',sort:2,active:true,soldOut:true,manualSoldOut:false,stock:0,reserved:0,available:0,stockUnit:'份',price:2,img:'c.png'},
  {id:'d',cn:'<script>alert(1)</script>',name:'Hidden',flavor:'',section:'drinks',sort:3,active:false,soldOut:false,manualSoldOut:false,stock:1,reserved:0,available:1,stockUnit:'份',price:1,img:'d.png'},
];
let state={revision:1,items,audit:[{at:'2026-09-10T02:00:00Z',action:'edit',id:'b',details:{price:5.2,stock:null}}]},writes=[],failSave=false,unauthorized=false,pending=null;
const win={listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}};
const ctx=vm.createContext({structuredClone,TextEncoder,Date,window:win,
  document:{body:new Element('body'),querySelector(s){assert(nodes.has(s),'known HTML selector '+s);return nodes.get(s)},querySelectorAll(s){if(s==='[data-view]')return nav;if(s==='[data-filter]')return metrics;if(s==='[data-editor-section]')return editorSections;throw Error(s)}},
  sessionStorage:{getItem(){return ''},setItem(){},removeItem(){}},btoa:s=>Buffer.from(s,'binary').toString('base64'),
  FormData:class{get(){return 'preview-only'}},
  fetch:async(url,options)=>{
    if(pending) await pending;
    if(unauthorized)return {ok:false,status:401,json:async()=>({error:'密码不正确'})};
    if(options.method==='POST'){
      if(failSave)return {ok:false,status:409,json:async()=>({error:'字段已更新，请刷新'})};
      const input=JSON.parse(options.body);writes.push(input);const d=state.items.find(d=>d.id===input.id);Object.assign(d,input.patch);state.revision++;
    }
    return {ok:true,json:async()=>structuredClone(state)};
  }
});
vm.runInContext(source,ctx);
const node=id=>nodes.get('#'+id), event={preventDefault(){},target:{reset(){}}};
await node('login').onsubmit(event);
assert.equal(node('workspace').hidden,false);assert.equal(node('countAll').textContent,4);assert.equal(node('countAvailable').textContent,2);assert.equal(node('countLow').textContent,1);assert.equal(node('countSold').textContent,1);
assert.match(node('list').innerHTML,/&lt;script&gt;/);assert.doesNotMatch(node('list').innerHTML,/<script>/);assert.match(node('audit').innerHTML,/价格、实有库存/);
metrics[2].onclick();assert.match(node('list').innerHTML,/招牌饺子/);assert.doesNotMatch(node('list').innerHTML,/Tofu/);
node('search').value='NO MATCH';node('search').listeners.input();assert.equal(node('emptyState').hidden,false);
node('clearEmpty').onclick();assert.equal(node('emptyState').hidden,true);assert.equal(node('status').value,'');
nav[1].onclick();assert.equal(node('historyPanel').hidden,false);assert.equal(node('catalogPanel').hidden,true);assert.equal(nav[1].attrs['aria-current'],'page');nav[0].onclick();
function edit(id){const b=new Element('edit');b.dataset.edit=id;node('list').onclick({target:{closest:()=>b}});}
edit('a');assert.equal(node('editor').open,true);assert.equal(fields.section.disabled,true);assert.equal(fields.stock.disabled,false);assert.equal(fields.price_5.value,'5.8');
fields.cn.value='新版饺子';node('editForm').listeners.input();node('closeEditor').onclick();assert.equal(node('discardPrompt').hidden,false);assert.equal(node('editor').open,true);node('keepEditing').onclick();assert.equal(node('discardPrompt').hidden,true);
let prevented=false;win.listeners.beforeunload({preventDefault(){prevented=true}});assert(prevented);
failSave=true;await node('editForm').onsubmit(event);assert(node('editor').open);assert.match(node('formMessage').textContent,/你的修改仍保留/);assert.equal(fields.cn.value,'新版饺子');assert.equal(fields.section.disabled,true);assert.equal(node('save').disabled,false);
failSave=false;await node('editForm').onsubmit(event);assert.equal(node('editor').open,false);assert.equal(writes.length,1);assert.deepEqual(writes[0].patch,{cn:'新版饺子'});assert.equal(writes[0].base.cn,'招牌饺子');assert.equal(writes[0].revision,1);assert.match(node('message').textContent,/已发布/);
edit('b');assert.equal(fields.stock.disabled,true);assert.equal(fields.section.disabled,false);node('cancelEdit').onclick();assert.equal(node('editor').open,false);assert.equal(writes.length,1);
edit('b');fields.unlimited.checked=false;fields.unlimited.onchange({target:fields.unlimited});assert.equal(fields.stock.required,true);assert.equal(fields.stock.disabled,false);fields.stock.value='20';node('closeEditor').onclick();node('discardChanges').onclick();assert.equal(node('editor').open,false);assert.equal(writes.length,1);
edit('b');fields.price.value='6.2';let release;pending=new Promise(r=>{release=r});const save=node('editForm').onsubmit(event);assert.equal(node('save').disabled,true);assert.equal(fields.price.disabled,true);node('closeEditor').onclick();assert.equal(node('editor').open,true);release();await save;pending=null;assert.equal(fields.price.disabled,false);assert.equal(fields.stock.disabled,true);
node('logout').onclick();assert.equal(node('workspace').hidden,true);assert.equal(node('list').innerHTML,'');assert(nav.every(b=>b.disabled));
unauthorized=true;await node('login').onsubmit(event);assert.equal(node('workspace').hidden,true);assert.equal(node('message').dataset.tone,'error');assert.equal(node('loginButton').disabled,false);
unauthorized=false;let finish;pending=new Promise(r=>{finish=r});const login=node('login').onsubmit(event);node('logout').onclick();finish();await login;pending=null;assert.equal(node('workspace').hidden,true,'late responses cannot restore a signed-out session');
assert.match(html,/<dialog[^>]*aria-labelledby="editorTitle"/);assert.match(html,/role="switch"/);assert.match(css,/@media\(max-width:600px\)/);assert.match(css,/prefers-reduced-motion/);
console.log('PASS admin controller: real-data counts, low-stock units, filters/reset, escaped table/audit, navigation, editor values, dirty guard, failed-save retention, field-only publish, busy locking, auth failures and stale response protection. No browser or production calls.');
