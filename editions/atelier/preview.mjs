// Local-only preview. Reuses catalogue validation; never forwards orders to production.
import { createServer } from "node:http";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanNickname, contributorsFor } from "./cart-meta.mjs";
import {
  cleanCartOperation,
  cleanCartOpIds,
  cleanTable,
  reduceCartOperations,
  currentOperation,
} from "../../web/server/cart-core.js";
import {
  cleanOrder,
  cleanCall,
  cleanGroup,
  RequestError,
} from "../../web/server/order-core.js";
import { createOnlineService, bookingDates, SLOTS } from '../../web/server/online-core.js';
import { createTableStore } from '../../web/server/table-state.js';
import {createCatalogService} from '../../web/server/catalog-core.js';
import {imageType,imageId} from '../../web/server/catalog-image-core.js';
import {createWalletService} from '../../web/server/wallet-core.js';
import {createCanCanService} from '../../web/server/cancan-core.js';
import {createRewardsService} from '../../web/server/rewards-core.js';
import {createVoucherService} from '../../web/server/voucher-core.js';
import {createMemberService} from '../../web/server/member-core.js';
import {requireStaff} from '../../web/server/staff-auth.js';

const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, "../..");
const stateFile = resolve(
  process.env.DL_PREVIEW_DATA || resolve(root, ".local/atelier"),
  "orders.json",
);
let db = { scopes: {}, events: [], sequence: 0 };
try {
  db = JSON.parse(await readFile(stateFile, "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
db.rewards ||= {
  schema: 1, revision: 0, configRevision: 1, pointsPerDollar: 1,
  rewards: {
    "lunch-v2-pickled-radish": { dishId:"lunch-v2-pickled-radish", style:null, title:"腌萝卜", points:50, active:true },
    "lunch-v5-onsen-egg": { dishId:"lunch-v5-onsen-egg", style:null, title:"温泉蛋", points:60, active:true },
    "lunch-v2-barley": { dishId:"lunch-v2-barley", style:null, title:"薏米水", points:100, active:true },
    "lunch-v2-lemon-tea": { dishId:"lunch-v2-lemon-tea", style:null, title:"柠檬茶", points:120, active:true },
    "lunch-v2-cold-veg-shreds": { dishId:"lunch-v2-cold-veg-shreds", style:null, title:"凉拌蔬菜丝", points:130, active:true }
  },
  accounts:{}, holds:{}, vouchers:{}, audit:[]
};
const scope = (t, g) => `${t}:${g}`;
db.activity ||= {};
const getCart = (table, group, version) => {
  const operations = db.scopes[scope(table, group)] || [];
  const orders = db.events.filter(
    (e) => e.type === "order" && e.table === table && e.group === group,
  );
  const v =
    "shared-v2:" + globalThis.MENU_VERSION + ":" +
    ([...operations.map((o) => o.id), ...orders.map((o) => o.id)].join(",") ||
      "empty");
  return v === version
    ? { unchanged: true, version: v }
    : {
        ...reduceCartOperations(operations),
        orders,
        version: v,
        contributors: contributorsFor(operations),
        activity: (db.activity[scope(table, group)] || []).slice(-40),
      };
};
const save = async () => {
  await mkdir(dirname(stateFile), { recursive: true });
  await writeFile(`${stateFile}.tmp`, JSON.stringify(db));
  await rename(`${stateFile}.tmp`, stateFile);
};
let queue = Promise.resolve();
function transaction(fn) {
  const result = queue.then(async () => {
    const previous = structuredClone(db);
    try {
      const out = fn();
      await save();
      return out;
    } catch (e) {
      db = previous;
      throw e;
    }
  });
  queue = result.catch(() => {});
  return result;
}
// Local fixtures are explicitly labelled and never sent to external providers.
db.online ||= {};
db.tableStates ||= {};
const catalog=createCatalogService({
 async read(){await queue;return db.catalog?{value:structuredClone(db.catalog),etag:String(db.catalog.revision)}:null},
 async write(value,etag){return transaction(()=>{if((db.catalog?String(db.catalog.revision):undefined)!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});db.catalog=structuredClone(value)})},
 isConflict:e=>e.conflict,
});
const rewards=createRewardsService({
 async read(){await queue;return db.rewards?{value:structuredClone(db.rewards),etag:String(db.rewards.revision)}:null},
 async write(value,etag){return transaction(()=>{if((db.rewards?String(db.rewards.revision):undefined)!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});db.rewards=structuredClone(value)})},isConflict:e=>e.conflict
});
db.vouchers||={paper:{count:0,log:[]}};
// 券本身就是会员券，存在 rewards 里；这里只剩纸券计数。
const vouchers=createVoucherService({
 rewards, catalog,
 tally:{
  async count(){await queue;return db.vouchers.paper.count},
  async bump(entry){return transaction(()=>{const p=db.vouchers.paper;p.count++;p.log.unshift(entry);p.log.length=Math.min(p.log.length,500);return p.count})},
 },
},{
 cap:Number(process.env.DL_VOUCHER_CAP)||2000,
 opensAt:process.env.DL_VOUCHER_OPENS_AT||null,
 closesAt:process.env.DL_VOUCHER_CLOSES_AT||null,
 expiresAt:process.env.DL_VOUCHER_EXPIRES_AT||'2027-02-28',
 dishId:process.env.DL_VOUCHER_DISH||undefined,
});
// Explicit opt-in test identity, only in this loopback-only development server.
const testMembers=process.env.DL_PREVIEW_TEST_MEMBER==='1';
// Same variable names as production, so a local look at the login panel shows
// the same entrances the guest gets.
function memberAuth(req){return createMemberService({
 origin:process.env.DL_MEMBER_ORIGIN||`http://${req.headers.host}`,
 authUrl:process.env.DL_SUPABASE_URL||process.env.CANCAN_APP_SUPABASE_URL,
 anonKey:process.env.DL_SUPABASE_ANON||process.env.CANCAN_APP_SUPABASE_ANON,
 googleClientId:process.env.DL_GOOGLE_CLIENT_ID,
 googleEnabled:process.env.DL_AUTH_GOOGLE_ENABLED==='true',
 appleEnabled:process.env.DL_AUTH_APPLE_ENABLED==='true',
 phoneEnabled:process.env.DL_AUTH_PHONE_ENABLED==='true',
})}
async function memberIdentity(req){return testMembers&&String(req.headers.cookie||'').split(';').some(c=>c.trim()==='dl-preview-member=fixture')?{id:'preview-member',email:'preview@example.test'}:memberAuth(req).identity(req.headers)}

const wallet=createWalletService({
 async read(){await queue;return db.wallet?{value:structuredClone(db.wallet),etag:String(db.wallet.revision)}:null},
 async write(value,etag){return transaction(()=>{if((db.wallet?String(db.wallet.revision):undefined)!==etag)throw Object.assign(new Error('Conflict'),{conflict:true});db.wallet=structuredClone(value)})},isConflict:e=>e.conflict,
},{ensureReady(){},createTopup:async t=>({id:`cs_preview_topup_${t.id}`,url:`/?wallet_topup=${t.id}`}),expire:async()=>({status:'expired',payment_status:'unpaid'}),refund:async r=>({id:`re_${r.id.replaceAll('-','')}`,payment_intent:r.paymentIntentId,amount:r.amountCents,currency:'sgd',status:'succeeded',metadata:{wallet_refund_id:r.id,wallet_topup_id:r.topupId}})},{rewards});
// The source ledger below exists only in opt-in local demonstrations. The real
// CanCan issuer uses its own Prisma transaction and is tested in its worktree.
const demoSecret='local-demo-cancan-secret-never-for-production';
const demoOffers=[{id:'demo-free-egg',title:'CanCan 温泉蛋券',dishId:'lunch-v5-onsen-egg',points:0,claimOnce:true},{id:'demo-barley',title:'CanCan 薏米水券',dishId:'lunch-v2-barley',points:50,claimOnce:false}];
const demoCanCanSource=async(_url,options)=>{
 db.cancanDemo||={points:200,vouchers:{},requests:{},claimed:{}};
 if(options.method==='POST'){const input=JSON.parse(options.body),offer=demoOffers.find(o=>o.id===input.offerId);if(!offer)throw new RequestError('没有该测试活动');await transaction(()=>{const s=db.cancanDemo,key=offer.claimOnce?offer.id:input.requestId;if(s.requests[key])return;if(s.points<offer.points)throw new RequestError('CanCan 测试积分不足');s.points-=offer.points;const id=randomUUID();s.requests[key]=id;s.claimed[offer.id]=true;s.vouchers[id]={id,title:offer.title,dishId:offer.dishId,memberId:'preview-member',expiresAt:new Date(Date.now()+30*86400000).toISOString()};});return Response.json({ok:true});}
 await queue;const s=db.cancanDemo,timestamp=String(Math.floor(Date.now()/1000));const grants=Object.values(s.vouchers).map(v=>{const payload=JSON.stringify({version:1,issuer:'cancan',audience:'dumplinglab',...v});return {payload,timestamp,signature:createHmac('sha256',demoSecret).update(timestamp+'.'+payload).digest('hex')};});return Response.json({ok:true,enabled:true,points:s.points,offers:demoOffers.map(o=>({...o,claimed:o.claimOnce&&Boolean(s.claimed[o.id])})),grants,vouchers:Object.values(s.vouchers)});
};
const demoCanCan=createCanCanService({origin:'http://127.0.0.1:1',allowLoopback:true,secret:demoSecret,rewards,catalog,fetcher:demoCanCanSource});
const dining = createTableStore({
  async read(path) { await queue; return structuredClone(db.tableStates[path] || null); },
  async write(path, value, etag) { return transaction(() => {
    const old = db.tableStates[path];
    if ((old?.etag || null) !== etag) throw Object.assign(new Error('Conflict'), { conflict: true });
    db.tableStates[path] = { value, etag: String(Number(old?.etag || 0) + 1) };
  }); },
  isConflict: e => e.conflict,
  async all() { await queue; return Object.values(db.tableStates).map(r => structuredClone(r.value)); },
}, {
  menu: () => catalog.menu(),
  async read(table, group) { await queue; return { operations: db.scopes[scope(table, group)] || [], orders: db.events.filter(e => e.type === 'order' && e.table === table && e.group === group) }; },
  async feed() { await queue; const events = db.events.filter(e => !e.resolvedAt); return { events, activeIds: events.map(e => e.id) }; },
  async resolve(id) { return transaction(() => { const event = db.events.find(e => e.id === id); if (event) event.resolvedAt = new Date().toISOString(); }); },
});
const previewLocations = [{ id: 'preview-store', name: '本地测试门店 / Preview store', address: '本地测试地址（非真实自取点）' }];
const online = createOnlineService({
  storage: {
    async read(id) { await queue; const r = db.online[id]; return r ? {value:structuredClone(r.value),etag:String(r.version)} : null; },
    async write(id,value,etag) { return transaction(() => {
      if (String(db.online[id]?.version || '') !== String(etag || '')) { const e=new Error('Conflict');e.conflict=true;throw e; }
      db.online[id]={value,version:(db.online[id]?.version||0)+1};
    }); },
    isConflict: e=>e.conflict,
    async all() { await queue; return Object.values(db.online).map(r=>structuredClone(r.value)); },
  },
  payment: { ensureReady() {}, async create(o) { return {id:`preview_${o.id}`,url:`/?preview_payment=${o.id}`}; }, async expire() { return {status:'expired',payment_status:'unpaid'}; }, async refund(r) { return {id:`re_preview_${r.id.slice(0,8)}`,status:'succeeded',amount:r.amountCents}; } },
  dining,
  async checkAddress(postal) {
    if (postal === '999999') return {distanceKm:11,address:'Outside test zone'};
    if (postal !== '059911') throw new RequestError('本地测试请使用邮编 059911；999999 用于测试超区');
    return {distanceKm:1,address:'本地配送测试地址 · 059911（非真实配送）'};
  },
  config: { locations: previewLocations, origin:process.env.DL_PREVIEW_ORIGIN||'http://127.0.0.1:7898' }, inventory:catalog,rewards,wallet,
});
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".wasm": "application/wasm",
  ".css": "text/css",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};
const server = createServer(async (req, res) => {
  const json = (status, out) => {
    res.writeHead(status, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    res.end(JSON.stringify(out));
  };
  try {
    const url = new URL(req.url, "http://localhost");
    // Opt-in loopback demo entry; never included in the production build.
    if(testMembers&&req.method==='GET'&&url.pathname==='/'&&url.searchParams.get('preview_member')==='1'){
      res.writeHead(302,{'set-cookie':'dl-preview-member=fixture; Path=/; HttpOnly; SameSite=Lax','location':url.searchParams.get('reset_password')==='1'?'/order?reset_password=1':'/order','cache-control':'no-store'});return res.end();
    }

    if(url.pathname==='/api/catalog-image'){
      if(req.method==='POST'){
        requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only');const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>2*1024*1024)throw new RequestError('图片须小于 2 MB',413);chunks.push(c)}const bytes=Buffer.concat(chunks),type=imageType(bytes),id=randomUUID()+'.'+type.ext;const directory=resolve(dirname(stateFile),'catalog-images');await mkdir(directory,{recursive:true});await writeFile(resolve(directory,id),bytes);return json(200,{ok:true,url:'/api/catalog-image?id='+id});
      }
      if(req.method==='GET'){const id=imageId(url.searchParams.get('id')),bytes=await readFile(resolve(dirname(stateFile),'catalog-images',id));res.writeHead(200,{'content-type':imageType(bytes).mime,'x-content-type-options':'nosniff'});return res.end(bytes)}
      return json(405,{error:'Method not allowed'});
    }
    if (url.pathname.startsWith("/api/") || (testMembers && url.pathname === "/__preview/cancan-issuer")) {
      let input;
      if (req.method === "POST") {
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 65536)
            throw new RequestError("Request too large", 413);
        }
        try {
          input = JSON.parse(raw);
        } catch {
          throw new RequestError("Invalid JSON");
        }
      }
      if(url.pathname==='/api/wallet'){
        if((req.method==='GET'&&url.searchParams.get('admin')==='1')||['refund-topup','refund-order','settings'].includes(input?.action)){requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only');return json(200,{ok:true,...(req.method==='GET'?{...await wallet.admin(),orders:await online.localPayments()}:{result:input.action==='settings'?await wallet.saveSettings(input):input.action==='refund-topup'?await wallet.refundTopup(input):await online.refundLocal(input)})});}
        if(!testMembers)return json(200,{ok:true,enabled:false});const member=await memberIdentity(req);if(!member)throw new RequestError('请先登录',401);
        if(req.method==='GET'){await online.expireFreeRewards(member.id,{includeRewards:false});return json(200,{ok:true,enabled:true,preview:true,...(url.searchParams.get('id')?{topup:await wallet.topup(url.searchParams.get('id'),member.id)}:await wallet.view(member.id))});}
        if(input.action==='topup')return json(200,{ok:true,preview:true,topup:await wallet.createTopup(input,member.id)});
        if(input.action==='cancel-topup')return json(200,{ok:true,...await wallet.cancelTopup(input.id,member.id)});
        if(input.action==='preview-topup-paid'){const t=await wallet.topup(input.id,member.id);await wallet.paymentEvent({id:`cs_preview_topup_${t.id}`,currency:'sgd',amount_total:t.amountCents,payment_status:'paid',payment_intent:`pi_preview_topup_${t.id}`,metadata:{wallet_topup_id:t.id}});return json(200,{ok:true});}
        throw new RequestError('操作无效');
      }
      if(testMembers&&url.pathname==='/__preview/cancan-issuer'){
        requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only');
        const result=await demoCanCanSource(null,{method:req.method,body:JSON.stringify(input)});return json(200,await result.json());
      }
      if(url.pathname==='/api/cancan'){
        if(req.method!=='GET')return json(405,{ok:false,error:'Method not allowed'});
        if(!testMembers)return json(200,{ok:true,enabled:false});const member=await memberIdentity(req);if(!member)throw new RequestError('请先登录',401);return json(200,{ok:true,...await demoCanCan.sync({member,accessToken:'local-test-identity'})});
      }
      if(url.pathname==='/api/member'){
        if(testMembers&&req.method==='GET'&&url.searchParams.get('action')==='recovery-callback'){res.setHeader('set-cookie','dl-preview-member=fixture; Path=/; HttpOnly; SameSite=Lax');res.writeHead(302,{location:'/order?reset_password=1'});return res.end();}
        if(testMembers&&req.method==='GET'&&url.searchParams.get('action')==='signup-callback'){res.setHeader('set-cookie','dl-preview-member=fixture; Path=/; HttpOnly; SameSite=Lax');res.writeHead(302,{location:'/order?member=1'});return res.end();}
        if(testMembers&&req.method==='GET')return json(200,{ok:true,loginReady:true,authMethods:{email:true,password:true,phone:true,google:true,apple:true},member:await memberIdentity(req)});
        if(testMembers&&req.method==='POST'&&input.action==='oauth'&&['google','apple'].includes(input.provider)){res.setHeader('set-cookie','dl-preview-member=fixture; Path=/; HttpOnly; SameSite=Lax');return json(200,{ok:true,url:'/order?member=1'});}
        if(testMembers&&req.method==='POST'&&input.action==='send-code'&&['email','phone'].includes(input.method||'email'))return json(200,{ok:true});
        if(testMembers&&req.method==='POST'&&input.action==='verify'&&/^\d{6,8}$/.test(String(input.code||''))){res.setHeader('set-cookie','dl-preview-member=fixture; Path=/; HttpOnly; SameSite=Lax');return json(200,{ok:true,member:{id:'preview-member',email:input.email||null,phone:input.phone||null}});}
        if(testMembers&&req.method==='POST'&&input.action==='password-login'){res.setHeader('set-cookie','dl-preview-member=fixture; Path=/; HttpOnly; SameSite=Lax');return json(200,{ok:true,member:{id:'preview-member',email:input.email}});}
        if(testMembers&&req.method==='POST'&&input.action==='password-signup')return json(200,{ok:true,confirmationRequired:true});
        if(testMembers&&req.method==='POST'&&input.action==='forgot-password')return json(200,{ok:true,previewRecoveryUrl:`/order?lang=${input.lang==='en'?'en':'zh'}&reset_password=1&preview_member=1`});
        if(testMembers&&req.method==='POST'&&input.action==='reset-password'&&await memberIdentity(req))return json(200,{ok:true});
        if(testMembers&&req.method==='POST'&&input.action==='preview-login'){res.setHeader('set-cookie','dl-preview-member=fixture; Path=/; HttpOnly; SameSite=Lax');return json(200,{ok:true});}
        if(testMembers&&req.method==='POST'&&input?.action==='logout'){res.setHeader('set-cookie','dl-preview-member=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');return json(200,{ok:true});}
        const result=await memberAuth(req).handle({method:req.method,headers:req.headers,query:Object.fromEntries(url.searchParams),body:input});if(result.cookies||result.cookie)res.setHeader('set-cookie',result.cookies||result.cookie);if(result.redirect){res.writeHead(302,{location:result.redirect});return res.end()}return json(200,result.body);
      }
      if(url.pathname==='/api/voucher'){
        if(req.method==='GET'){
          if(url.searchParams.get('admin')==='1'){
            requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only');
            return json(200,{ok:true,...await vouchers.admin()});
          }
          const m=await memberIdentity(req).catch(()=>null);
          return json(200,{ok:true,member:m?{id:m.id}:null,...await vouchers.status(m?.id||null)});
        }
        if(req.method!=='POST')return json(405,{error:'Method not allowed'});
        if(input?.action==='claim'){
          const m=await memberIdentity(req).catch(()=>null);
          return json(200,{ok:true,...await vouchers.claim(m?.id||null)});
        }
        requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only');
        if(input?.action==='redeem-paper')return json(200,{ok:true,...await vouchers.redeemPaper(input)});
        return json(400,{error:'操作无效'});
      }
      if(url.pathname==='/api/apology'){
        if(req.method==='POST'&&input.action==='request'){const member=await memberIdentity(req);return json(200,{ok:true,...await rewards.requestApology(member?.id,input.orderNo,await online.apologyOrders())});}
        requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only');
        if(req.method==='GET')return json(200,{ok:true,...await rewards.apologyStatus()});
        if(req.method==='POST'&&input.action==='grant')return json(200,{ok:true,...await rewards.grantApology(input,await catalog.menu(),await online.apologyOrders())});
        return json(400,{error:'操作无效'});
      }
      if(url.pathname==='/api/rewards'){
        if(req.method==='POST'||url.searchParams.get('admin')==='1'){requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only');return json(200,{ok:true,...(req.method==='POST'?await rewards.save(input,await catalog.menu()):await rewards.admin())});}
        if(req.method!=='GET')return json(405,{ok:false,error:'Method not allowed'});
        if(!testMembers&&!memberAuth(req).configured)return json(200,{ok:true,enabled:false});
        const member=await memberIdentity(req);if(member)await online.expireFreeRewards(member.id,{includeWallet:false});return json(200,{ok:true,enabled:true,member,...await rewards.view(member?.id,await catalog.menu())});
      }
      if(url.pathname==='/api/catalog'){
        if(req.method==='GET'){if(url.searchParams.get('admin')==='1'){requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only');return json(200,{ok:true,...await catalog.admin()})}return json(200,{ok:true,...await catalog.public()})}
        if(req.method==='POST'){requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only');return json(200,{ok:true,...await (input.action==='lunch-set-save'?catalog.saveLunchSet(input):input.action==='create'?catalog.create(input):input.action==='reorder'?catalog.reorder(input):['section-save','section-delete','section-order'].includes(input.action)?catalog.saveSection(input):['table-discount','day-discount','builder-photo','recommend-order'].includes(input.action)?catalog.saveSettings(input):catalog.save(input))})}
        return json(405,{error:'Method not allowed'});
      }
      if (url.pathname === '/api/online') {
        if (req.method === 'GET') {
          if (url.searchParams.get('pending') === '1') { requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only'); return json(200,{ok:true,orders:await online.pendingPayments()}); }
          if (url.searchParams.get('report') === '1') { requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only'); return json(200,{ok:true,report:await online.report({from:url.searchParams.get('from')||undefined,to:url.searchParams.get('to')||undefined})}); }
          if (url.searchParams.get('history') === '1') return json(200,{ok:true,...await online.memberOrders((await memberIdentity(req))?.id,url.searchParams.get('before') || '')});
          const id = url.searchParams.get('id');
          if (id && url.searchParams.get('progress') === '1') return json(200,{ok:true,progress:await online.progress(id,req.headers['x-pickup-code'])});
          if (id) return json(200,{ok:true,order:await online.get(id,String(req.headers.authorization||'').replace(/^Bearer /,''))});
          return json(200,{ok:true,config:{preview:true,locations:previewLocations,dates:bookingDates(),slots:SLOTS,dineinEnabled:true,takeawayEnabled:true,deliveryEnabled:false,deliveryMinimum:100,deliveryRate:0.09,serviceRate:0.1,radiusKm:10}});
        }
        if (req.method === 'POST') {
          if (input.action === 'end-table-session') { requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only'); return json(200,{ok:true,...await online.endTableSession(input)}); }
          if (input.action === 'cancel') return json(200,{ok:true,...await online.cancel(input)});
          if (input.action === 'cancel-table') return json(200,{ok:true,...await online.cancelForTable(input)});
          if (input.action === 'staff-cancel') { requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only'); return json(200,{ok:true,...await online.staffCancel(input.id)}); }
          if (input.action === 'staff-quote') { requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only'); return json(200,{ok:true,order:await online.staffQuote(input)}); }
          if (input.action === 'staff-order') { requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only'); return json(200,{ok:true,order:await online.staffOrder(input)}); }
          if (input.action === 'staff-refund') { requireStaff(req,process.env.DL_PREVIEW_STAFF_PASSWORD||'preview-only'); return json(200,{ok:true,order:await online.staffRefund(input)}); }
          if(input.action==='confirm-wallet')return json(200,{ok:true,...await online.confirmWallet(input,(await memberIdentity(req))?.id)});
          if(input.action==='confirm-reward')return json(200,{ok:true,...await online.confirmReward(input,(await memberIdentity(req))?.id)});
          if (input.action === 'preview-pay') {
            const order=await online.get(input.requestId,input.token);
            await online.paymentEvent({id:`preview_${order.id}`,metadata:{dumpling_order_id:order.id},currency:'sgd',amount_total:Math.round(order.total*100),payment_status:'paid',payment_intent:`pi_preview_${order.id}`});
            return json(200,{ok:true});
          }
          const member=await memberIdentity(req);if(input.memberExpected&&!member)throw new RequestError('登录已过期，请重新登录',401);
          return json(200,{ok:true,...(input.action==='quote'?{order:await online.quote(input,member?.id)}:await online.checkout(input,member?.id))});
        }
        return json(405,{ok:false,error:'Method not allowed'});
      }
      if (url.pathname === "/api/cart" && req.method === "GET") {
        const args=[url.searchParams.get('table'),url.searchParams.get('group'),url.searchParams.get('version'),url.searchParams.get('tableSession')];
        let cart=await dining.cart(...args);
        if(cart.paymentPending&&Date.now()-Date.parse(cart.paymentStartedAt)>=15*60000){await online.recoverTablePayment(args[0],args[1]);cart=await dining.cart(args[0],args[1],'',args[3]);}
        return json(200,{ok:true,cart});
      }
      if (url.pathname === "/api/cart" && req.method === "POST") {
        return json(200, {ok:true,cart:await dining.mutate(input)});
      }
      if (url.pathname === "/api/order" && req.method === "POST") {
        throw new RequestError('请先完成付款；付款成功后自动下单。',402);
      }
      if (url.pathname === "/api/call" && req.method === "POST") {
        const call = cleanCall(input);
        return json(
          200,
          await transaction(() => {
            const prior = db.events.find((e) => e.id === call.id);
            if (!prior) db.events.push(call);
            return { ok: true, call: prior || call };
          }),
        );
      }
      if (url.pathname === "/api/feed" && req.method === "GET") {
        await queue;
        const events=[...(await dining.feed()).events,...await online.feed()];
        return json(200, { events,activeIds:events.map(e=>e.id),cursor:Date.now() });
      }
      if (url.pathname === '/api/pickup' && req.method === 'POST') {
        if (!['inspect','collect'].includes(input.action)) throw new RequestError('无效操作');
        return json(200,{ok:true,order:await online.pickup(input.id,input.code,input.action==='collect')});
      }
      if (url.pathname === '/api/resolve' && req.method === 'POST') {
        if (!await online.resolve(input.id)) await dining.resolve(input.id);
        return json(200,{ok:true});
      }
      if (url.pathname === '/api/order-status' && req.method === 'POST') {
        return json(200,{ok:true,order:await online.advance(input.id,input.status)});
      }
      return json(404, { error: "Unknown endpoint" });
    }
    let path = decodeURIComponent(url.pathname);
    if (path === "/" || path === "/order") path = "/index.html";
    if (path.includes("..") || path.split("/").some((p) => p.startsWith(".")))
      return json(403, { error: "Forbidden" });
    const localFiles = new Set([
      "/index.html",
      "/atelier.css",
      "/restaurant.css",
      "/photography.js",
      "/photo-review.html",
      "/app.js",
      "/lunch-ui.js",
      "/cart-store.js",
      "/error-copy.js",
      "/fulfilment.js",
      "/checkout-ui.js",
      "/rewards-ui.js",
      "/wallet-ui.js",
      "/rewards-ui.css",
      "/addons-ui.js",
      "/table-scene.js",
      "/shared-table.css",
      "/shared-motion.js",
      "/micro-motion.js",
      "/receipt-motion.js",
      "/sharing-motion.js",
      "/cooking-motion.js",
      "/bilingual-fit.js",
      "/shared-table.js",
    ]);
    const allowedAsset =
      /^\/(img|brand|fonts)\//.test(path) || /^\/vendor\/cutout\/[a-zA-Z0-9.-]+$/.test(path) ||
      ["/lunch-set-art.js", "/lunch-set-admin.js", "/menu-data.js", "/lunch-archive.js", "/lunch-menu.js", "/catalog-client.js", "/catalog-admin.html", "/catalog-admin.js", "/rewards-admin.js", "/wallet-admin.js", "/report-admin.js", "/counter-admin.js", "/catalog-admin.css", "/order-pricing.js", "/i18n.js", "/staff.html", "/vendor/three.module.js"].includes(path);
    if (!localFiles.has(path) && !allowedAsset)
      return json(404, { error: "Not found" });
    const data = await readFile(
      path === "/cooking-motion.js"
        ? resolve(here, "generated/preparation-cooking/cooking.js")
        : path === "/sharing-motion.js"
        ? resolve(here, "generated/table-sharing/developer/web-component/table-sharing.js")
        : path === "/receipt-motion.js"
        ? resolve(here, "generated/receipt-print/developer/web-component/receipt-print.js")
        : path === "/micro-motion.js"
        ? resolve(here, "generated/order-feedback/developer/web-component/order-feedback.js")
        : path === "/shared-motion.js"
        ? resolve(
            here,
            "generated/table-view-motion/developer/web-component/table-layout.js",
          )
        : resolve(
            localFiles.has(path) ? here : resolve(root, "web"),
            `.${path}`,
          ),
    );
    const media = /^\/(img|brand|fonts)\//.test(path);
    const etag = media ? `"${createHash("sha256").update(data).digest("hex")}"` : null;
    if (media && req.headers["if-none-match"] === etag) {
      res.writeHead(304, { etag, "cache-control": "public, max-age=0, must-revalidate" });
      res.end();
      return;
    }
    res.writeHead(200, {
      "content-type": mime[extname(path)] || "application/octet-stream",
      "cache-control": media ? "public, max-age=0, must-revalidate" : "no-store",
      ...(etag ? { etag } : {}),
    });
    res.end(req.method === "HEAD" ? undefined : testMembers&&path==='/index.html' ? data.toString().replace('本地体验版 · 下单与呼叫不会发送到真实厨房','本地演示 · 测试积分与模拟付款，不会真实扣款') : data);
  } catch (e) {
    json(e.status || (e.code === "ENOENT" ? 404 : 500), {
      ok: false,
      error: e.status ? e.message : "Local preview error",
      ...(process.env.DL_PREVIEW_TRACE==="1"&&!e.status?{trace:String(e.stack||e).slice(0,600)}:{}),
      ...(["PAYMENT_PENDING", "CHECKOUT_CART_CHANGED", "TABLE_SESSION_ENDED"].includes(e.code) ? { code: e.code } : {}),
      ...(e.code === "NOTE_CONFLICT" ? { code: e.code, cart: e.cart } : {}),
    });
  }
}).listen(Number(process.env.PORT || 7898), "127.0.0.1", () =>
  console.log(
    `Atelier local preview: http://127.0.0.1:${server.address().port}/?table=A1 — local orders only`,
  ),
);
