(() => {
 const $=id=>document.getElementById(id);let busy=false,phase='email',ready=false;
 const message=(text,error=false)=>{$('message').textContent=text;$('message').dataset.error=String(error)};
 async function api(body){const response=await fetch('/api/member',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});const result=await response.json();if(!response.ok)throw new Error(result.error||'会员服务暂时不可用');return result;}
 function setBusy(on){busy=on;for(const id of ['email','code','consent','submit','resend','logout'])$(id).disabled=on||(!ready&&id!=='logout');$('submit').textContent=on?'请稍候…':phase==='email'?'发送验证码':'验证并登录';}
 function render(result){ready=result.loginReady;$('loginPanel').hidden=Boolean(result.member);$('memberPanel').hidden=!result.member;$('memberEmail').textContent=result.member?.email||'';setBusy(false);message(ready?'':'会员登录尚未开放，你仍可正常浏览菜单和游客点餐。');}
 async function load(){try{render(await api())}catch(e){ready=false;$('loginPanel').hidden=false;setBusy(false);message(e.message,true)}}
 $('email').addEventListener('input',()=>{phase='email';$('code').value='';$('codeFields').hidden=true;$('code').required=false;$('resend').hidden=true;$('submit').textContent='发送验证码'});
 $('loginForm').onsubmit=async e=>{e.preventDefault();if(busy||!ready)return;setBusy(true);try{const body={action:phase==='email'?'send-code':'verify',email:$('email').value,consent:$('consent').checked,code:$('code').value};await api(body);if(phase==='email'){phase='code';$('codeFields').hidden=false;$('code').required=true;$('resend').hidden=false;message('验证码已发送，请检查邮箱。')}else{$('code').value='';await load();}}catch(e){message(e.message,true)}finally{setBusy(false);if(phase==='code'&&!$('loginPanel').hidden)$('code').focus()}};
 $('resend').onclick=async()=>{if(busy)return;setBusy(true);try{await api({action:'send-code',email:$('email').value,consent:$('consent').checked});message('验证码已重新发送。')}catch(e){message(e.message,true)}finally{setBusy(false)}};
 $('logout').onclick=async()=>{if(busy)return;setBusy(true);try{await api({action:'logout'});$('loginForm').reset();phase='email';$('codeFields').hidden=true;$('code').required=false;$('resend').hidden=true;await load()}catch(e){message(e.message,true)}finally{setBusy(false)}};
 load();
})();
