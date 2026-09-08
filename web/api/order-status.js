import { onlineService } from '../server/online-production.js';
import { requireStaff } from '../server/staff-auth.js';
import { bodyOf, fail, json, method } from '../server/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return method(res, 'POST');
  try {
    requireStaff(req);
    const { id, status } = bodyOf(req);
    return json(res, 200, { ok: true, order: await onlineService.advance(id, status) });
  } catch (error) { return fail(res, error); }
}
