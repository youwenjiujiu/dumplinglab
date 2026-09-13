// Homepage-only catalogue reader. The ordering application's client is unchanged.
// Every request is GET; this module never touches carts, payments or inventory.
(()=>{
 const base=structuredClone(globalThis.MENU),recommendations=structuredClone(globalThis.LUNCH_RECOMMENDATIONS||[]);
 let revision=null,inFlight=null;
 const validItem=d=>d&&typeof d==='object'&&!Array.isArray(d)&&['id','cn','name'].every(k=>typeof d[k]==='string'&&d[k].trim())&&Number.isFinite(d.price)&&d.price>=0&&['active','soldOut'].every(k=>d[k]===undefined||typeof d[k]==='boolean')&&(d.imageUrl==null||typeof d.imageUrl==='string');
 const api={status:'loading',ready:null,refresh};globalThis.CatalogClient=api;
 function refresh(){
  // Visibility, interval and explicit retry can coincide. Share the same read.
  if(inFlight)return inFlight;
  inFlight=Promise.resolve().then(async()=>{
   const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetch('/api/catalog',{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('Catalogue unavailable');
    const data=await response.json();if(!data||!Array.isArray(data.items)||!Number.isInteger(data.revision)||data.revision<0||!data.items.every(validItem)||new Set(data.items.map(d=>d.id)).size!==data.items.length)throw new Error('Invalid catalogue');
    const changed=revision!==data.revision;
    if(changed){
     const nextRecommendations=recommendations.filter(r=>r.chooseFilling?data.items.some(d=>d.kind==='dumpling'&&d.active!==false):data.items.some(d=>d.id===r.dishId&&d.active!==false)).map(r=>{
      const d=data.items.find(d=>d.id===r.dishId),original=base.find(d=>d.id===r.dishId);if(!d)return r;
      return {...r,cn:original?.cn!==d.cn?d.cn:r.cn,name:original?.name!==d.name?d.name:r.name,imageUrl:d.imageUrl,pending:d.soldOut||d.active===false};
     });
     globalThis.MENU=data.items;globalThis.LUNCH_RECOMMENDATIONS=nextRecommendations;revision=data.revision;
    }
    api.status='ready';globalThis.dispatchEvent(new CustomEvent(changed?'catalog-updated':'catalog-available'));
   }catch{api.status='unavailable';globalThis.dispatchEvent(new CustomEvent('catalog-unavailable'))}
   finally{clearTimeout(deadline)}
  }).finally(()=>{inFlight=null});
  return inFlight;
 }
 api.ready=refresh();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 setInterval(()=>{if(!document.hidden)refresh()},30000);
})();
