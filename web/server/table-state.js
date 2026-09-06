// One atomic document per dining group: cart, receipts and staff queue commit together.
// Storage is injected so concurrency and failure paths can be tested without live orders.
import { randomUUID } from "node:crypto";
import { cleanCartOperation, cleanCartOpIds, cleanTable, reduceCartOperations } from "./cart-core.js";
import { cleanOrder, cleanCall, cleanGroup, RequestError } from "./order-core.js";
import { cleanNickname, contributorsFor } from "./cart-meta.js";

export const TABLE_STATE_PREFIX = "dumplinglab-tables/v2/";
const canonical = items => JSON.stringify(items.map(i => [i.id, i.style || null, i.qty]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
const cleanNote = note => typeof note === "string" ? note.trim().slice(0, 240) : "";

export function createTableStore(storage, legacy) {
  const pathFor = (table, group) => `${TABLE_STATE_PREFIX}${cleanTable(table)}/${cleanGroup(group)}.json`;
  const snapshot = state => ({
    ...reduceCartOperations(state.operations),
    orders: state.events.filter(e => e.type === "order"),
    contributors: contributorsFor(state.operations),
    activity: state.activity.slice(-40),
    version: `v2:${state.revision}`,
  });
  async function read(table, group) {
    const stored = await storage.read(pathFor(table, group));
    if (stored) return stored;
    // Read-only import. Never delete legacy orders or carts during rollout.
    const prior = await legacy.read(table, group);
    return { etag: null, value: {
      schema: 2, table, group, revision: "initial", sequence: 0,
      operations: prior.operations || [],
      events: (prior.orders || []).map(event => ({ ...event, legacy: true })),
      activity: [],
    } };
  }
  async function transact(table, group, change) {
    const path = pathFor(table, group);
    for (let attempt = 0; attempt < 16; attempt++) {
      const { value: before, etag } = await read(table, group);
      const state = structuredClone(before);
      const result = change(state);
      if (!result.changed) return { state: before, event: result.event };
      state.revision = randomUUID();
      try {
        await storage.write(path, state, etag);
        return { state, event: result.event };
      } catch (error) {
        if (!storage.isConflict(error)) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.min(120, 5 * (attempt + 1)) + Math.random() * 30));
      }
    }
    throw new RequestError("同桌正在更新，请稍后重试。", 503);
  }
  return {
    async cart(table, group, version = "") {
      table = cleanTable(table); group = cleanGroup(group);
      const { value } = await read(table, group);
      const cart = snapshot(value);
      // Unmigrated legacy state has no stable revision; always return its contents.
      return value.revision !== "initial" && cart.version === version ? { unchanged: true, version } : cart;
    },
    async mutate(input) {
      const op = cleanCartOperation(input);
      op.actorName = cleanNickname(input.actorName);
      const { state } = await transact(op.table, op.group, state => {
        if (state.operations.some(o => o.id === op.id) || state.events.some(e => e.cartOpIds?.includes(op.id))) return { changed: false };
        if (op.kind === "note" && Object.hasOwn(input, "baseNote") && cleanNote(input.baseNote) !== cleanNote(reduceCartOperations(state.operations).note)) {
          const error = new RequestError("同桌修改了备注，请确认要保留的内容。", 409);
          error.code = "NOTE_CONFLICT"; error.cart = snapshot(state); throw error;
        }
        op.storedAt = Math.max(Date.now(), state.sequence + 1);
        state.sequence = op.storedAt;
        state.operations.push(op);
        state.activity = [...state.activity, op].slice(-80);
        return { changed: true };
      });
      return snapshot(state);
    },
    async order(input) {
      const order = cleanOrder(input), ids = cleanCartOpIds(input.cartOpIds), selectedIds = new Set(ids);
      const { state, event } = await transact(order.table, order.group, state => {
        const prior = state.events.find(e => e.id === order.id);
        if (prior) {
          if (prior.type !== "order" || canonical(prior.items) !== canonical(order.items) || cleanNote(prior.note) !== cleanNote(order.note)) throw new RequestError("请求编号已用于另一份订单。", 409);
          return { changed: false, event: prior };
        }
        if (ids.some(id => !state.operations.some(op => op.id === id))) throw new RequestError("同桌已经提交了这份菜单，请查看已下单。", 409);
        const selectedOps = state.operations.filter(op => selectedIds.has(op.id));
        const selected = reduceCartOperations(selectedOps);
        if (canonical(selected.items) !== canonical(order.items)) throw new RequestError("购物车已更新，请重新确认。", 409);
        if (state.operations.some(op => !selectedIds.has(op.id) && (op.kind === "note" || op.delta < 0))) throw new RequestError("同桌修改了菜品或备注，请重新确认订单。", 409);
        order.cartOpIds = ids;
        order.contributors = contributorsFor(selectedOps);
        order.actorName = cleanNickname(input.actorName);
        state.sequence = Math.max(Date.now(), state.sequence + 1);
        order.at = new Date(state.sequence).toISOString();
        state.events.push(order);
        state.operations = state.operations.filter(op => !selectedIds.has(op.id));
        return { changed: true, event: order };
      });
      return { order: event, cart: snapshot(state) };
    },
    async call(input) {
      const call = cleanCall(input);
      const { event } = await transact(call.table, call.group, state => {
        const prior = state.events.find(e => e.id === call.id);
        if (prior) {
          if (prior.type !== "call" || prior.reason !== call.reason) throw new RequestError("请求编号冲突。", 409);
          return { changed: false, event: prior };
        }
        state.events.push(call); return { changed: true, event: call };
      });
      return event;
    },
    async feed() {
      const [states, previous] = await Promise.all([storage.all(TABLE_STATE_PREFIX), legacy.feed()]);
      const current = states.flatMap(s => s.events.filter(e => !e.legacy && !e.resolvedAt));
      const events = [...previous.events, ...current].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      return { events, activeIds: [...new Set([...previous.activeIds, ...current.map(e => e.id)])], cursor: Date.now() };
    },
    async resolve(id) {
      const states = await storage.all(TABLE_STATE_PREFIX);
      const owner = states.find(s => s.events.some(e => e.id === id && !e.legacy));
      if (!owner) return legacy.resolve(id);
      await transact(owner.table, owner.group, state => {
        const event = state.events.find(e => e.id === id);
        if (!event || event.resolvedAt) return { changed: false };
        event.resolvedAt = new Date().toISOString();
        return { changed: true };
      });
    },
  };
}
