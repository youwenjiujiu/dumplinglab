// A home link in the existing footer. Keep menu assets, cart and checkout intact.
export function orderingDocument(html){
 const mark='<span id="footerCopy">Dumpling Lab</span>';
 if(!html.includes(mark))throw new Error('Ordering footer changed; review website integration');
 // Follow the existing ordering page's public language attribute, including a
 // later language-button change. Context-menu/new-tab navigation also gets the
 // correct URL; this does not reach into or mutate the ordering runtime.
 const home=`<a id="websiteHome" href="/?lang=zh" aria-label="Dumpling Lab · 返回官网" style="position:relative;display:inline-block">${mark}<span aria-hidden="true" style="position:absolute;left:50%;top:50%;width:100%;min-width:44px;height:44px;transform:translate(-50%,-50%)"></span></a><script>(()=>{const link=document.getElementById('websiteHome');const update=()=>{const en=document.documentElement.lang==='en';link.href='/?lang='+(en?'en':'zh');link.setAttribute('aria-label',en?'Dumpling Lab · Back to website':'Dumpling Lab · 返回官网')};update();new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})})();</script>`;
 return html.replace(mark,home);
}
