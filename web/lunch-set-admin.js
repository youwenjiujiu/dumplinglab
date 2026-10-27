globalThis.LunchSetAdmin=(()=>{
 const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let epoch=0,settings=null,selected=null,working=false;
 const item=key=>settings.data.items.find(d=>d.active!==false&&(d.id===key||d.id.endsWith('-'+key)));
 const name=key=>item(key)?.cn||key;
 const baseChoices={};
 function clear(){epoch++;settings=null;selected=null;working=false;if($('#lunchSetEditor').open)$('#lunchSetEditor').close();$('#lunchSetsPanel').innerHTML=''}
 function render(options){
  if(working)return;settings=options;const sets=options.data.lunchSets||[];
  for(const s of sets)baseChoices[s.key]=structuredClone(s.options||s);
  $('#lunchSetsPanel').innerHTML=`<div class="panel-heading"><div><h2>午市套餐</h2><span class="muted">编辑价格、搭配、供应时段和套餐配图</span></div><a href="/?table=A1&lang=zh#section-lunchsets" target="_blank" rel="noopener">顾客预览 ↗</a></div><p class="set-admin-note">价格可以暂时留空。当前套餐仅展示搭配，暂未开放套餐结算。</p><div class="set-admin-grid">${sets.map(s=>`<article class="set-admin-card">${LunchSetArt.render(s,options.data.items)}<div class="set-admin-copy"><h3>${esc(s.cn)}</h3><p>${esc(s.name)}</p><div class="set-admin-meta"><strong>${s.price===null?'价格待定':'$'+s.price.toFixed(2)}</strong><span>${esc(s.start)}–${esc(s.end)}</span><span>${s.visible?'顾客可见':'已隐藏'}</span></div><button class="primary" data-edit-set="${s.key}">设置套餐与配图</button></div></article>`).join('')}</div>`;
  $('#lunchSetsPanel').onclick=e=>{const button=e.target.closest('[data-edit-set]');if(button)edit(button.dataset.editSet)};
 }
 function checkboxes(title,field,pool,chosen){return `<fieldset class="set-choice-group"><legend>${title}</legend><div>${pool.map(v=>`<label><input type="checkbox" name="${field}" value="${esc(v.key||v)}" ${chosen.includes(v.key||v)?'checked':''}><span>${esc(v.cn||name(v))}</span></label>`).join('')}</div></fieldset>`}
 // 小菜 from 配菜 and 凉菜: tick one to include it, several to let the customer pick one, none for no side.
 function sidesHTML(s){const pool=settings.data.items.filter(d=>d.active!==false&&['sides','cold'].includes(d.section));return `<fieldset class="set-choice-group"><legend>小菜 · 勾 1 个固定配送，勾多个顾客选 1 个</legend><div>${pool.map(d=>`<label><input type="checkbox" name="sideChoices" value="${esc(d.id)}" ${(s.sideChoices||[]).includes(d.id)?'checked':''}><span>${esc(d.cn)}</span></label>`).join('')}</div></fieldset>`}
 function edit(key){
  selected=structuredClone(settings.data.lunchSets.find(s=>s.key===key));const s=selected,base=baseChoices[key],form=$('#lunchSetForm');
  $('#lunchSetEditorTitle').textContent='设置 · '+s.cn;
  $('#lunchSetFields').innerHTML=`<div class="set-editor-art">${LunchSetArt.render(s,settings.data.items)}</div><div class="fields"><label>中文名称<input name="cn" required maxlength="160" value="${esc(s.cn)}"></label><label>英文名称<input name="name" required maxlength="160" value="${esc(s.name)}"></label><label class="wide">套餐介绍<textarea name="description" maxlength="500" rows="2" placeholder="介绍招牌搭配与口味">${esc(s.description)}</textarea></label><label class="wide">英文介绍<textarea name="descriptionEn" maxlength="500" rows="2">${esc(s.descriptionEn)}</textarea></label><label>套餐售价（SGD）<input name="price" type="number" min="0.01" max="9999" step="0.01" placeholder="留空为价格待定" value="${s.price??''}"></label><label>菜单展示<select name="visible"><option value="true" ${s.visible?'selected':''}>显示套餐</option><option value="false" ${!s.visible?'selected':''}>隐藏套餐</option></select></label><label>开始供应<input name="start" type="time" required value="${s.start}"></label><label>结束供应<input name="end" type="time" required value="${s.end}"></label></div><p class="hint">仅在门店营业日的上述时段供应，采用新加坡时间。</p><section class="editor-section"><h3>套餐配图</h3><label class="upload-area"><strong>上传整套餐图</strong><span>JPG / PNG / WebP，大图自动压缩；保存后生效</span><input id="setPhotoFile" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"></label><button id="setResetPhoto" type="button" class="text-button">使用菜品组合配图</button><input name="imageUrl" type="hidden" value="${esc(s.imageUrl)}"><p class="hint">未上传时，自动组合主食、配菜和饮品图片。单品换图后组合配图会跟随更新。</p></section>${s.fillingChoices?checkboxes(s.pieces+'颗饺子／云吞 · 可选馅料','fillingChoices',base.fillingChoices,s.fillingChoices)+checkboxes('可选做法','preparationKeys',base.preparationChoices,s.preparationChoices.map(p=>p.key)):`${checkboxes('可选面条','noodleChoices',base.noodleChoices,s.noodleChoices)}`}${checkboxes('可选饮品','drinkChoices',base.drinkChoices,s.drinkChoices)}${sidesHTML(s)}${s.fillingChoices?`<div class="fields"><label>套餐加面价格（SGD）<input name="optionalNoodlesExtra" type="number" min=".01" max="9999" step=".01" required value="${s.optionalNoodlesExtra}"></label></div>`:''}`;
  $('#setFormMessage').textContent='';form.onsubmit=save;
  $('#setPhotoFile').onchange=e=>upload(e.target.files[0]);
  $('#setResetPhoto').onclick=()=>{form.elements.imageUrl.value='';$('.set-editor-art').innerHTML=LunchSetArt.render({...selected,imageUrl:''},settings.data.items)};
  $('#closeSetEditor').onclick=()=>{if(!working)$('#lunchSetEditor').close()};
  $('#lunchSetEditor').oncancel=e=>{if(working)e.preventDefault()};
  const drop=$('#setPhotoFile').closest('label');drop.ondragover=e=>e.preventDefault();drop.ondrop=e=>{e.preventDefault();upload(e.dataTransfer.files[0])};
  $('#lunchSetEditor').showModal();
 }
 function lock(on){working=on;$('#lunchSetForm').querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=on)}
 async function upload(file){
  if(!file||working)return;const run=epoch,key=selected.key;lock(true);$('#setFormMessage').textContent='正在处理套餐照片…';
  try{const photo=await settings.preparePhoto(file);if(run!==epoch)return;const result=await settings.request('/api/catalog-image',{method:'POST',headers:{'content-type':photo.type},body:photo});if(run!==epoch||selected?.key!==key)return;$('#lunchSetForm').elements.imageUrl.value=result.url;$('.set-editor-art').innerHTML=LunchSetArt.render({...selected,imageUrl:result.url},settings.data.items);$('#setFormMessage').textContent='套餐照片已预览，保存后同步至顾客菜单。'}catch(e){if(run===epoch)$('#setFormMessage').textContent=e.message}finally{if(run===epoch)lock(false)}
 }
 async function save(e){
  e.preventDefault();if(working)return;const f=e.target.elements,patch={};
  for(const k of ['cn','name','description','descriptionEn','start','end','imageUrl'])patch[k]=f[k].value.trim();patch.price=f.price.value===''?null:Number(f.price.value);patch.visible=f.visible.value==='true';
  for(const k of ['fillingChoices','noodleChoices','drinkChoices','sideFillingChoices','sideChoices','preparationKeys'])if(e.target.querySelector(`[name="${k}"]`))patch[k]=[...e.target.querySelectorAll(`[name="${k}"]:checked`)].map(el=>el.value);
  if(selected.fillingChoices)patch.optionalNoodlesExtra=Number(f.optionalNoodlesExtra.value);
  const run=epoch;lock(true);$('#setFormMessage').textContent='正在保存套餐…';
  try{const result=await settings.request('/api/catalog',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'lunch-set-save',key:selected.key,revision:settings.data.revision,patch})});if(run!==epoch)return;$('#lunchSetEditor').close();lock(false);settings.onSaved(result)}catch(error){if(run===epoch)$('#setFormMessage').textContent=error.message}finally{if(run===epoch)lock(false)}
 }
 return {render,clear};
})();
