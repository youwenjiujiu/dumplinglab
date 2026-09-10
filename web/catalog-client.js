// Shared live catalogue; never writes to cart storage or the production API.
(()=>{
 const base=structuredClone(globalThis.MENU),recommendations=structuredClone(globalThis.LUNCH_RECOMMENDATIONS||[]);
 let revision=null;
 async function refresh(){try{
  const response=await fetch('/api/catalog',{cache:'no-store'});if(!response.ok)throw new Error('Catalogue unavailable');const data=await response.json();
  if(!Array.isArray(data.items)||!Number.isInteger(data.revision))throw new Error('Invalid catalogue');
  if(revision===data.revision)return;revision=data.revision;
  // Keep inactive IDs available for old cart/receipt rendering; hide in browsing.
  globalThis.MENU=data.items;
  globalThis.LUNCH_RECOMMENDATIONS=recommendations.filter(r=>r.chooseFilling?data.items.some(d=>d.kind==='dumpling'&&d.active!==false):data.items.some(d=>d.id===r.dishId&&d.active!==false)).map(r=>{
   const d=data.items.find(d=>d.id===r.dishId),original=base.find(d=>d.id===r.dishId);if(!d)return r;
   return {...r,cn:original?.cn!==d.cn?d.cn:r.cn,name:original?.name!==d.name?d.name:r.name,imageUrl:d.imageUrl,pending:d.soldOut||d.active===false};
  });
  globalThis.dispatchEvent(new CustomEvent('catalog-updated'));
 }catch{globalThis.dispatchEvent(new CustomEvent('catalog-unavailable'))}}
 globalThis.CatalogClient={refresh,ready:refresh()};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 setInterval(()=>{if(!document.hidden)refresh()},30000);
})();
