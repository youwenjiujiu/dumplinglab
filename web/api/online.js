import { onlineService, onlineConfig } from '../server/online-production.js';
import { bodyOf, fail, json, method } from '../server/http.js';
import {memberService} from '../server/member-production.js';
import { RequestError } from '../server/order-core.js';
import { requireStaff } from '../server/staff-auth.js';
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (req.query?.pending === '1') {
        requireStaff(req);
        return json(res, 200, { ok: true, orders: await onlineService.pendingPayments() });
      }
      if (req.query?.report === '1') {
        requireStaff(req);
        return json(res, 200, { ok: true, report: await onlineService.report({ from: req.query.from, to: req.query.to }) });
      }
      if (req.query?.history === '1') {
        const member = await memberService().identity(req.headers);
        return json(res, 200, {ok:true, ...await onlineService.memberOrders(member?.id, req.query?.before || '')});
      }
      const id = req.query?.id;
      if (!id) return json(res, 200, { ok: true, config: onlineConfig() });
      if (req.query?.progress === '1') return json(res, 200, { ok: true,
        progress: await onlineService.progress(id, req.headers['x-pickup-code']) });
      const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
      return json(res, 200, { ok: true, order: await onlineService.get(id, token) });
    }
    if (req.method !== 'POST') return method(res, 'GET, POST');
    const input = bodyOf(req);
    if (input.action === 'cancel') return json(res, 200, { ok: true, ...await onlineService.cancel(input) });
    if (input.action === 'cancel-table') return json(res, 200, { ok: true, ...await onlineService.cancelForTable(input) });
    if (input.action === 'staff-cancel') { requireStaff(req); return json(res, 200, { ok: true, ...await onlineService.staffCancel(input.id) }); }
    if (!['quote','checkout','confirm-reward','confirm-wallet'].includes(input.action)) throw new RequestError('操作无效');
    if (input.mode === 'delivery') throw new RequestError('目前仅支持堂食和打包自取', 409);
    const member=await memberService().identity(req.headers);
    if(input.memberExpected&&!member)throw new RequestError('登录已过期，请重新登录后继续',401);
    if(input.action==='confirm-wallet')return json(res,200,{ok:true,...await onlineService.confirmWallet(input,member?.id)});
    if(input.action==='confirm-reward')return json(res,200,{ok:true,...await onlineService.confirmReward(input,member?.id)});
    return json(res, 200, { ok: true, ...(input.action === 'quote' ? { order: await onlineService.quote(input,member?.id) } : await onlineService.checkout(input,member?.id)) });
  } catch (error) { return fail(res, error); }
}
