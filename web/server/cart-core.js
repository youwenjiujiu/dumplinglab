import "../menu-data.js";
import { cleanGroup, RequestError } from "./order-core.js";

const CATALOG = new Map(globalThis.MENU.map(dish => [dish.id, dish]));
const available = (id,style,catalog) => {
 const dish=catalog?.find(d=>d.id===id);
 return catalog ? Boolean(dish&&dish.active!==false&&!dish.soldOut&&(!dish.styles?!style:dish.styles.includes(style))) : globalThis.isLunchItem(id,style);
};
export const currentOperation = (op,catalog) => op.kind === "note" || available(op.dishId,op.style,catalog);
const TABLE_RE = /^[a-z0-9-]{1,12}$/i;
const ID_RE = /^[a-f0-9-]{16,64}$/i;

export const cleanTable = value => {
  const table = typeof value === "string" ? value.trim() : "";
  if (!TABLE_RE.test(table)) throw new RequestError("缺少有效的桌号");
  return table;
};

export function cleanCartOpIds(value) {
  if (!Array.isArray(value) || !value.length || value.length > 1000) throw new RequestError("共享购物车版本无效");
  const ids = [...new Set(value)];
  if (ids.length !== value.length || ids.some(id => typeof id !== "string" || !ID_RE.test(id))) throw new RequestError("共享购物车版本无效");
  return ids;
}

export function cleanCartOperation(input, catalog) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new RequestError("购物车操作无效");
  const id = typeof input.opId === "string" && ID_RE.test(input.opId) ? input.opId : null;
  const deviceId = typeof input.deviceId === "string" && ID_RE.test(input.deviceId) ? input.deviceId : null;
  if (!id || !deviceId) throw new RequestError("购物车操作编号无效");
  const base = { id, deviceId, table: cleanTable(input.table), group: cleanGroup(input.group), at: new Date().toISOString() };
  if (input.kind === "note") {
    return { ...base, kind: "note", note: typeof input.note === "string" ? input.note.trim().slice(0, 240) : "" };
  }
  if (input.kind !== "delta") throw new RequestError("购物车操作类型无效");
  const dish = catalog ? catalog.find(d=>d.id===input.dishId) : CATALOG.get(input.dishId);
  if (!dish || dish.soldOut || dish.active === false) throw new RequestError("菜品不存在或已售罄");
  const delta = Number(input.delta);
  if (!Number.isInteger(delta) || !delta || Math.abs(delta) > 20) throw new RequestError("菜品数量变化无效");
  const style = dish.styles ? (typeof input.style === "string" && dish.styles.includes(input.style) ? input.style : null) : null;
  if (dish.styles && !style) throw new RequestError("菜品做法无效");
  if (!dish.styles && input.style) throw new RequestError("该菜品不提供自选做法");
  return { ...base, kind: "delta", dishId: dish.id, style, delta };
}

export function reduceCartOperations(operations, catalog) {
  const items = new Map();
  let note = "", noteTime = -1;
  const sorted = [...operations].sort((a, b) => (a.storedAt || Date.parse(a.at) || 0) - (b.storedAt || Date.parse(b.at) || 0) || a.id.localeCompare(b.id));
  for (const operation of sorted) {
    if (operation.kind === "note") {
      const time = operation.storedAt || Date.parse(operation.at) || 0;
      if (time >= noteTime) { note = operation.note || ""; noteTime = time; }
      continue;
    }
    if (operation.kind !== "delta") continue;
    const key = operation.style ? `${operation.dishId}|${operation.style}` : operation.dishId;
    const current = items.get(key) || { id: operation.dishId, style: operation.style || null, qty: 0 };
    current.qty = Math.max(0, current.qty + operation.delta);
    if (current.qty) items.set(key, current); else items.delete(key);
  }
  return {
    items: [...items.values()].filter(i => available(i.id,i.style,catalog)),
    unavailableItems: [...items.values()].filter(i => !available(i.id,i.style,catalog)),
    menuVersion: globalThis.MENU_VERSION,
    note: note || null, opIds: sorted.filter(op=>currentOperation(op,catalog)).map(operation => operation.id),
    revision: sorted.reduce((latest, operation) => Math.max(latest, operation.storedAt || Date.parse(operation.at) || 0), 0),
  };
}
