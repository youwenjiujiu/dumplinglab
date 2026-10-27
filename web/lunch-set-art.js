// Menu-native meal photography: existing dish pictures form a complete set hero.
// A merchant-uploaded whole-meal photograph takes precedence over the composition.
(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const image=d=>{if(!d)return '';const prep=d.preparations?.includes('fried')?'fried':d.fixedPreparation?.id||d.preparations?.[0];if(d.preparationImageUrls?.[prep])return d.preparationImageUrls[prep];if(!prep&&d.imageUrl)return d.imageUrl;const file=d.preparationImages?.fried||d.img;if(!file)return '';return '/img/l/'+(globalThis.DL_MENU_ART?.[file]||file).replace(/\.(png|jpe?g|webp)$/i,'.webp')};
 globalThis.LunchSetArt={render(set,items){
  if(set.imageUrl)return `<div class="lunch-set-art uploaded"><img src="${esc(set.imageUrl)}" alt="${esc(set.cn||set.name)}" loading="lazy"></div>`;
  const find=key=>items.find(d=>d.active!==false&&d.id.endsWith('-'+key));
  const main=find(set.key==='dumpling-set'?set.fillingChoices?.[0]:set.noodleChoices?.[0]);
  const side=set.key==='dumpling-set'?items.find(d=>d.active!==false&&d.id===set.sideChoices?.[0])||find(set.includedColdDish):find(set.sideDumplings?.fillingChoices?.[0]);
  const drink=find(set.drinkChoices?.[0]);
  return `<div class="lunch-set-art composed" aria-label="${esc(set.cn||set.name)}"><span class="set-art-glow"></span>${[[main,'main'],[side,'side'],[drink,'drink']].map(([d,cls])=>image(d)?`<img class="set-art-${cls}" src="${esc(image(d))}" alt="${esc(d.cn)}" loading="lazy">`:'').join('')}<span class="set-art-caption">组合示意 · Serving suggestion</span></div>`;
 }};
})();
