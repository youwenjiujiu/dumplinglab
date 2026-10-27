// Shared live catalogue; never writes to cart storage or the production API.
(()=>{
 const base=structuredClone(globalThis.MENU),recommendations=structuredClone(globalThis.LUNCH_RECOMMENDATIONS||[]);
 let revision=null;
 async function refresh(){try{
  const response=await fetch('/api/catalog',{cache:'no-store'});if(!response.ok)throw new Error('Catalogue unavailable');const data=await response.json();
  if(!Array.isArray(data.items)||!Number.isInteger(data.revision))throw new Error('Invalid catalogue');
  // A promotion that reaches its end time changes prices without a new revision.
  const key=data.revision+'|'+data.items.filter(d=>d.promo).map(d=>d.id).join();
  if(revision===key)return;revision=key;
  // Keep inactive IDs available for old cart/receipt rendering; hide in browsing.
  globalThis.MENU=data.items;
  globalThis.DL_SETTINGS=data.settings||{tableDiscounts:{}};
  if(Array.isArray(data.lunchSets))globalThis.LUNCH_SETS=data.lunchSets;
  // Category order and staff-added categories come from the back office; lunch sets and 推荐 stay on top.
  if(Array.isArray(data.sections)){
   globalThis.SECTIONS=[...globalThis.SECTIONS.filter(k=>k==='lunchsets'||k==='recommended'),...data.sections.map(x=>x.key).filter(k=>k!=='recommended')];
   for(const x of data.sections.filter(x=>!x.builtin)){globalThis.SECTION_LABELS[x.key]=x.en;if(typeof I18N!=='undefined')I18N.sections[x.key]=x.cn}
  }
  globalThis.LUNCH_RECOMMENDATIONS=recommendations.filter(r=>r.pending|| (r.chooseFilling?data.items.some(d=>d.kind==='dumpling'&&d.active!==false&&d.preparations?.includes('boiled')):data.items.some(d=>d.id===r.dishId&&d.active!==false&&d.recommended&&(!d.variants||!r.prep||d.preparations.includes(r.prep))))).map(r=>{
   const d=data.items.find(d=>d.id===r.dishId),original=base.find(d=>d.id===r.dishId);if(!d)return r;
   return {...r,cn:original?.cn!==d.cn?d.cn:r.cn,name:original?.name!==d.name?d.name:r.name,imageUrl:d.imageUrl,preparationImageUrls:d.preparationImageUrls,pending:r.pending||d.soldOut||d.active===false,soldOut:!r.pending&&!!d.soldOut};
  });
  const represented=new Set(globalThis.LUNCH_RECOMMENDATIONS.map(r=>r.dishId));
  for(const d of data.items.filter(d=>d.recommended&&d.active!==false&&!represented.has(d.id))){
   const prep=d.fixedPreparation?.id||(d.preparations?.includes('boiled')?'boiled':d.preparations?.includes('soup')?'soup':d.preparations?.[0]);
   globalThis.LUNCH_RECOMMENDATIONS.push({id:'merchant-'+d.id,dishId:d.id,cn:d.cn,name:d.name,prep,img:d.preparationImages?.[prep]||d.img,imageUrl:d.imageUrl,preparationImageUrls:d.preparationImageUrls,pending:d.soldOut,soldOut:d.soldOut});
  }
  globalThis.dispatchEvent(new CustomEvent('catalog-updated'));
 }catch{globalThis.dispatchEvent(new CustomEvent('catalog-unavailable'))}}
 globalThis.CatalogClient={refresh,ready:refresh()};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 setInterval(()=>{if(!document.hidden)refresh()},30000);
})();
