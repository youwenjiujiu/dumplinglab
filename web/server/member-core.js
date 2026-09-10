// CanCan identity only. Restaurant funds and points remain separate, disabled ledgers.
import { RequestError } from './order-core.js';
const cookieName = 'dl-member';
const capabilities = { topup:false, points:false, vouchers:false };
export function createMemberService({origin,authUrl,anonKey,fetcher=fetch}) {
  const configured = Boolean(origin && authUrl && anonKey);
  const secure = origin?.startsWith('https://');
  function cookie(value,age=0) { return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure?'; Secure':''}`; }
  function tokenOf(headers) { const value=String(headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);return value && /^[\w.-]+$/.test(value) && value.length<12000 ? value : null; }
  async function provider(path,body,token) {
    let response;
    try { response=await fetcher(`${authUrl}/auth/v1/${path}`,{method:body?'POST':'GET',headers:{apikey:anonKey,'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000),cache:'no-store'}); }
    catch { throw new RequestError('会员服务暂时无法连接，请稍后重试',503); }
    if (!response.ok) {
      if (response.status===429) throw new RequestError('请求较频繁，请稍后再试',429);
      if (path==='verify') throw new RequestError('验证码不正确或已过期，请重新获取',400);
      if (path==='user' && [401,403].includes(response.status)) return null;
      throw new RequestError('会员服务暂时不可用，请稍后重试',503);
    }
    return response.status===204 ? {} : response.json();
  }
  function publicUser(user) { return user?.id && user.email_confirmed_at ? {id:user.id,email:user.email} : null; }
  return {async handle({method,headers={},body={}}) {
    if (method==='GET') {
      const token=tokenOf(headers),user=configured&&token?publicUser(await provider('user',null,token)):null;
      return {body:{ok:true,loginReady:configured,member:user,capabilities,balance:null,points:null,vouchers:null},...(token&&!user?{cookie:cookie('')}:{})};
    }
    if (method!=='POST') throw new RequestError('Method not allowed',405);
    if (!origin || headers.origin!==origin || !String(headers['content-type']||'').startsWith('application/json')) throw new RequestError('请从本网站重新操作',403);
    if (body.action==='logout') return {body:{ok:true},cookie:cookie('')};
    if (!configured) throw new RequestError('会员登录尚未开放，请先以游客身份点餐',503);
    if (!['send-code','verify'].includes(body.action)) throw new RequestError('无效操作',400);
    const email=String(body.email||'').trim().toLowerCase();
    if (email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new RequestError('请输入有效邮箱',400);
    if (body.consent!==true) throw new RequestError('请确认使用 CanCan 账号登录或注册',400);
    if (body.action==='send-code') {await provider('otp',{email,create_user:true});return {body:{ok:true}};}
    const code=String(body.code||'').trim();
    if (!/^\d{6,8}$/.test(code)) throw new RequestError('请输入邮件中的验证码',400);
    const session=await provider('verify',{email,token:code,type:'email'}),user=publicUser(session.user);
    if (!user || user.email?.toLowerCase()!==email || !/^[\w.-]+$/.test(session.access_token||'')) throw new RequestError('邮箱验证未完成，请重试',401);
    const age=Math.min(3600,Math.max(0,Math.floor(Number(session.expires_in)||0)));
    if (!age) throw new RequestError('登录已过期，请重试',401);
    return {body:{ok:true,member:user},cookie:cookie(session.access_token,age)};
  }};
}
