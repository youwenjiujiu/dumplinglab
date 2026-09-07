import { onlineService } from '../server/online-production.js';
import { requireStaff } from '../server/staff-auth.js';
import { RequestError } from '../server/order-core.js';
import { bodyOf, fail, json, method } from '../server/http.js';

// Scanning only inspects; authenticated staff must explicitly confirm handover.
export default async function handler(req, res) {
  if (req.method !== 'POST') return method(res, 'POST');
  try {
    requireStaff(req);
    const input = bodyOf(req);
    if (!['inspect','collect'].includes(input.action)) throw new RequestError('无效操作');
    return json(res,200,{ok:true,order:await onlineService.pickup(input.id,input.code,input.action==='collect')});
  } catch (error) { return fail(res,error); }
}
