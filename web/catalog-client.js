// Shared live catalogue; never writes to cart storage or the production API.
(()=>{
 const base=structuredClone(globalThis.MENU),recommendations=structuredClone(globalThis.LUNCH_RECOMMENDATIONS||[]);
 let revision=null;
 // The 推荐 cards customers see, in the owner's order. The back office lists the same cards to reorder them.
 globalThis.liveRecommendations=(items,settings)=>{
   const list=recommendations.filter(r=>r.pending|| (r.chooseFilling?items.some(d=>d.kind==='dumpling'&&d.active!==false&&d.preparations?.includes('boiled')):items.some(d=>d.id===r.dishId&&d.active!==false&&d.recommended&&(!d.variants||!r.prep||d.preparations.includes(r.prep))))).map(r=>{
    const d=items.find(d=>d.id===r.dishId),original=base.find(d=>d.id===r.dishId);if(!d)return r;
    return {...r,cn:original?.cn!==d.cn?d.cn:r.cn,name:original?.name!==d.name?d.name:r.name,...(r.ownPhoto?{}:{imageUrl:d.imageUrl,preparationImageUrls:d.preparationImageUrls}),pending:r.pending||d.soldOut||d.active===false,soldOut:!r.pending&&!!d.soldOut};
   });
   const represented=new Set(list.map(r=>r.dishId+'|'+(r.prep||'')));
   for(const d of items.filter(d=>d.recommended&&d.active!==false)){
    const prep=d.fixedPreparation?.id||(d.preparations?.includes('boiled')?'boiled':d.preparations?.includes('soup')?'soup':d.preparations?.[0]);
    if(represented.has(d.id+'|'+(prep||'')))continue;
    list.push({id:'merchant-'+d.id,dishId:d.id,cn:d.cn,name:d.name,prep,img:d.preparationImages?.[prep]||d.img,imageUrl:d.imageUrl,preparationImageUrls:d.preparationImageUrls,pending:d.soldOut,soldOut:d.soldOut});
   }
   const order=settings?.recommendOrder||[],rank=r=>{const i=order.indexOf(r.id);return i<0?order.length:i};
   return list.map((r,i)=>[r,i]).sort((a,b)=>rank(a[0])-rank(b[0])||a[1]-b[1]).map(([r])=>r);
 };
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
  globalThis.LUNCH_RECOMMENDATIONS=globalThis.liveRecommendations(data.items,globalThis.DL_SETTINGS);
  globalThis.dispatchEvent(new CustomEvent('catalog-updated'));
 }catch{globalThis.dispatchEvent(new CustomEvent('catalog-unavailable'))}}
 // The back office loads this file only for liveRecommendations; it keeps its own catalogue.
 if(document.currentScript?.hasAttribute('data-recommendations-only'))return;
 globalThis.CatalogClient={refresh,ready:refresh()};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 setInterval(()=>{if(!document.hidden)refresh()},30000);
})();
