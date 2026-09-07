import { onlineService, onlineConfig } from '../server/online-production.js';
import { bodyOf, fail, json, method } from '../server/http.js';
import { RequestError } from '../server/order-core.js';
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const id = req.query?.id;
      if (!id) return json(res, 200, { ok: true, config: onlineConfig() });
      const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
      return json(res, 200, { ok: true, order: await onlineService.get(id, token) });
    }
    if (req.method !== 'POST') return method(res, 'GET, POST');
    const input = bodyOf(req);
    if (!['quote','checkout'].includes(input.action)) throw new RequestError('操作无效');
    return json(res, 200, { ok: true, ...(input.action === 'quote' ? { order: await onlineService.quote(input) } : await onlineService.checkout(input)) });
  } catch (error) { return fail(res, error); }
}
