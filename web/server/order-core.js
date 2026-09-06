import "../menu-data.js";

const CATALOG = new Map(globalThis.MENU.map(dish => [dish.id, dish]));
const TABLE_RE = /^[a-z0-9-]{1,12}$/i;
const GROUP_RE = /^[a-z0-9-]{1,16}$/i;
const REQUEST_RE = /^[a-f0-9-]{16,64}$/i;

export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const requiredText = (value, pattern, message) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!pattern.test(text)) throw new RequestError(message);
  return text;
};

export const cleanGroup = value => requiredText(value || "A", GROUP_RE, "用餐组编号无效").toUpperCase();

export function parseBody(body) {
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body;
  try { return JSON.parse(Buffer.isBuffer(body) ? body.toString("utf8") : body || "{}"); }
  catch { throw new RequestError("请求内容不是有效的 JSON"); }
}

function baseEvent(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new RequestError("请求内容无效");
  return {
    id: requiredText(input.requestId, REQUEST_RE, "缺少有效的请求编号"),
    table: requiredText(input.table, TABLE_RE, "缺少有效的桌号"),
    group: cleanGroup(input.group),
    at: new Date().toISOString(),
  };
}

export function cleanOrder(input) {
  const event = baseEvent(input);
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 50) throw new RequestError("订单菜品数量无效");
  const items = input.items.map(item => {
    const dish = CATALOG.get(item?.id);
    if (!dish) throw new RequestError(`菜单里没有 ${item?.id || "该菜品"}`);
    if (dish.soldOut) throw new RequestError(`「${dish.cn}」已售罄，请返回菜单修改`);
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new RequestError(`「${dish.cn}」的数量无效`);
    const style = dish.styles ? requiredText(item.style, /^.{1,20}$/u, `请选择「${dish.cn}」的做法`) : null;
    if (style && !dish.styles.includes(style)) throw new RequestError(`「${dish.cn}」的做法无效`);
    return { id: dish.id, name: dish.cn, style, qty, price: dish.price };
  });
  const total = Math.round(items.reduce((sum, item) => sum + item.price * item.qty, 0) * 100) / 100;
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 240) : "";
  const no = requiredText(input.no, /^\d{4}$/, "订单号无效");
  return { ...event, type: "order", no, items, note: note || null, total };
}

export function cleanCall(input) {
  const event = baseEvent(input);
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 40) : "";
  if (!reason) throw new RequestError("请选择需要的服务");
  return { ...event, type: "call", reason };
}
