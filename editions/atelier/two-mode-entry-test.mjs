// Pure VM test: no real browser storage, orders, payments or network calls.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('./fulfilment.js',import.meta.url),'utf8');
for(const selected of [null,'dinein','takeaway','delivery']) {
  const elements=new Map(), handlers=new Map();
  const data=new Map([['atelier:online:delivery','preserve-history']]);
  if(selected)data.set('atelier-mode',selected);
  const context={
    structuredClone, clearTimeout(){}, clearInterval(){}, setInterval(){return 0;},
    noteTimer:null,noteDraft:null,table:null,group:'A',submitting:false,
    document:{addEventListener:(name,handler)=>handlers.set(name,handler)},
    localStorage:{getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)},
    sessionStorage:{getItem:()=>null},q:new URLSearchParams(),
    tr:zh=>zh,bi:zh=>zh,escapeHTML:text=>text,openModal(){},onCartChange(){},
    renderChrome(){},renderMenu(){},renderTray(){},closeModal(){},
    $:selector=>{if(!elements.has(selector))elements.set(selector,{focus(){},insertAdjacentHTML(){}});return elements.get(selector);},
    store:{removeEventListener(){},pending:[],persist(){}},
    TableCart:class {
      constructor(table){this.table=table;this.items=[];this.orders=[];this.pending=[];}
      addEventListener(){}persist(){}start(){}
    },
  };
  vm.createContext(context);vm.runInContext(source+'\nFulfilment.init();',context);
  const html=elements.get('#sheetBody').innerHTML;
  assert.equal((html.match(/data-fulfilment=/g)||[]).length,2);
  assert(!html.includes('data-fulfilment="delivery"'));
  assert(!html.includes('entry-room'));
  for(const text of ['堂食','Dine-in','打包外带','Takeaway'])assert(html.includes(text));
  const expected=selected==='takeaway'?'takeaway':'dinein';
  assert.equal(vm.runInContext('Fulfilment.mode()',context),expected);
  if(selected==='delivery')assert.equal(data.get('atelier-mode'),'dinein');
  assert.equal(data.get('atelier:online:delivery'),'preserve-history');
  await handlers.get('click')({target:{closest:()=>({dataset:{fulfilment:'delivery'}})}});
  assert.equal(vm.runInContext('Fulfilment.mode()',context),expected,'retired action cannot switch mode');
  console.log('PASS two-mode entry, saved preference, retired action:',selected);
}
