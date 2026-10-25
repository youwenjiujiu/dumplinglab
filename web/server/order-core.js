import "../menu-data.js";
import "../lunch-menu.js";
import "../order-pricing.js";

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

// A short request for one line, e.g. 少辣. Printed on that dish's slip.
export const cleanItemNote = value => {
  const note = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 60) : "";
  return note || null;
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

export function cleanOrder(input, catalog) {
  const event = baseEvent(input);
  const items = cleanItems(input.items, catalog);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 240) : "";
  const no = requiredText(input.no, /^\d{4}$/, "订单号无效");
  return { ...event, type: "order", mode: "dinein", no, items, note: note || null, ...globalThis.OrderPricing.quote(subtotal) };
}

// Persist the server-owned destination with each ordered line, independent of later menu edits.
export const printStationFor = dish => ['kitchen','bar'].includes(dish?.printStation)
  ? dish.printStation : ['drinks','cold'].includes(dish?.section) ? 'bar' : 'kitchen';

export function cleanItems(inputItems, catalog) {
  const currentCatalog = catalog ? new Map(catalog.map(d=>[d.id,d])) : CATALOG;
  const input = { items: inputItems };
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 50) throw new RequestError("订单菜品数量无效");
  const items = input.items.map(item => {
    const dish = currentCatalog.get(item?.id);
    if (!dish) throw new RequestError(`菜单里没有 ${item?.id || "该菜品"}`);
    if (dish.active === false || dish.soldOut) throw new RequestError(`「${dish.cn}」已下架或售罄，请返回菜单修改`);
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new RequestError(`「${dish.cn}」的数量无效`);
    const style = dish.styles ? requiredText(item.style, /^.{1,100}$/u, `请选择「${dish.cn}」的做法和份量`) : null;
    if (style && !dish.styles.includes(style) && dish.choiceOptions?.items?.some(o => o.active && o.cn === style && o.soldOut)) throw new RequestError(`「${dish.cn} · ${style}」已售罄，请返回菜单修改`, 409);
    if (style && !dish.styles.includes(style)) throw new RequestError(`「${dish.cn}」的做法无效`);
    if (!dish.styles && item.style) throw new RequestError("该菜品不提供自选做法");
    const price = globalThis.lunchPrice(dish, style);
    if (!Number.isFinite(price)) throw new RequestError("菜品规格价格无效");
    const note = cleanItemNote(item.note);
    return { id: dish.id, name: dish.cn, englishName: dish.name, style, qty, price, service: "lunch", printStation: printStationFor(dish), ...(note ? { note } : {}) };
  });
  // 买一赠一 lines are split so every snapshot line keeps one unit price; the free
  // units follow their paid line at $0.
  const free = globalThis.OrderPricing.bogoFree(items.map(i => ({ ...i, bogo: currentCatalog.get(i.id)?.promo?.type === "bogo" })));
  return items.flatMap((i, n) => !free[n] ? [i]
    : [...(i.qty > free[n] ? [{ ...i, qty: i.qty - free[n] }] : []), { ...i, qty: free[n], price: 0, listPrice: i.price, promo: "bogo" }]);
}

export function cleanCall(input) {
  const event = baseEvent(input);
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 40) : "";
  if (!reason) throw new RequestError("请选择需要的服务");
  return { ...event, type: "call", reason };
}
