// Real services with isolated CAS stores and injected production-shaped failures.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createCatalogService } from '../../web/server/catalog-core.js';
import { createTableStore } from '../../web/server/table-state.js';
import { createOnlineService, tokenHash } from '../../web/server/online-core.js';
import { createRewardsService } from '../../web/server/rewards-core.js';
import { createWalletService } from '../../web/server/wallet-core.js';
import { isStorageConflict } from '../../web/server/storage-conflict.js';
const require = createRequire(new URL('../../web/package.json', import.meta.url));
const { BlobError, BlobPreconditionFailedError, BlobAccessError } = await import(require.resolve('@vercel/blob').replace(/\.cjs$/, '.js'));
const conflict = () => new BlobError('The conditional request cannot succeed due to a conflicting operation against this resource.');
assert(isStorageConflict(conflict()));
assert(isStorageConflict(new BlobPreconditionFailedError()));
assert(isStorageConflict(new BlobError('This blob already exists.')));
for (const e of [new BlobAccessError(), new BlobError('Bad request'), new Error('fetch failed'), new Error('Unknown write outcome')]) assert(!isStorageConflict(e));
for (const adapter of ['table', 'online', 'catalog', 'rewards', 'wallet']) {
  assert.match(await readFile(new URL(`../../web/server/${adapter}-production.js`, import.meta.url), 'utf8'), /isConflict:\s*isStorageConflict/);
}
console.log('PASS production Blob conflict classification: all five adapters; permissions/outages are not CAS retries');

function memory(document = false) {
  const rows = new Map(), counts = { reads: 0, writes: 0 };
  const store = {
    rows, counts, conflicts: 0, failAfterWrite: false, onConflict: null,
    async read(id = 'state') { counts.reads++; return structuredClone(rows.get(id) || null); },
    async write(...args) {
      counts.writes++;
      const [id, value, etag] = document ? ['state', ...args] : args;
      await store.beforeWrite?.(id, value);
      if (store.conflicts > 0) {
        store.conflicts--;
        store.onConflict?.(rows.get(id));
        throw conflict();
      }
      if ((rows.get(id)?.etag || null) !== (etag || null)) throw new BlobPreconditionFailedError();
      rows.set(id, { value: structuredClone(value), etag: randomUUID() });
      if (store.failAfterWrite) { store.failAfterWrite = false; throw Error('INJECTED_RESPONSE_LOST_AFTER_COMMIT'); }
    },
    isConflict: isStorageConflict,
    async all(prefix = '') { return [...rows].filter(([id]) => id.startsWith(prefix)).map(([, r]) => structuredClone(r.value)); },
    reset() { counts.reads = 0; counts.writes = 0; },
  };
  return store;
}
function fixture() {
  const catalogStore = memory(true), tableStore = memory(), orderStore = memory();
  const catalog = createCatalogService(catalogStore);
  const dining = createTableStore(tableStore, { menu: () => catalog.menu(), async read() { return { operations: [], orders: [] }; }, async feed() { return { events: [], activeIds: [] }; } });
  const sessions = new Map(); let unrelatedReads = 0;
  const unavailable = async () => { unrelatedReads++; throw Error('UNRELATED_LEDGER_DOWN'); };
  const online = createOnlineService({ inventory: catalog, dining, storage: orderStore,
    rewards: { expiredFreeReservations: unavailable }, wallet: { expiredReservations: unavailable },
    config: { origin: 'https://example.test', locations: [] },
    payment: { ensureReady() {}, async create(order) {
      if (!sessions.has(order.id)) sessions.set(order.id, { id: `cs_${order.id}`, client_secret: 'fixture' });
      return sessions.get(order.id);
    } },
  });
  async function basket(table = 'QARESIL') {
    const cart = await dining.mutate({ table, group: 'A', opId: randomUUID(), deviceId: randomUUID(), kind: 'delta', dishId: 'lunch-v2-barley', delta: 1 });
    return { requestId: randomUUID(), token: 'a'.repeat(64), mode: 'dinein', table, group: 'A', items: cart.items, cartOpIds: cart.opIds, note: cart.note };
  }
  return { catalogStore, tableStore, orderStore, catalog, dining, online, sessions, basket, unrelatedReads: () => unrelatedReads };
}
const fast = fixture(), input = await fast.basket();
fast.catalogStore.reset();
await fast.online.quote(input);
assert.equal(fast.catalogStore.counts.reads, 1, 'One menu/discount snapshot per quote');
fast.catalogStore.reset();
await fast.online.checkout(input);
assert.equal(fast.catalogStore.counts.reads, 2, 'One pricing snapshot plus fresh CAS inventory validation');
fast.orderStore.reset();
assert.equal((await fast.online.get(input.requestId, input.token)).status, 'awaiting_payment');
assert.equal(fast.orderStore.counts.reads, 1);
assert.equal(fast.orderStore.counts.writes, 0);
assert.equal(fast.unrelatedReads(), 0, 'Guest quote, checkout and status do not touch unrelated ledgers');
console.log('PASS guest dependency isolation: quote catalogue reads 2→1, checkout catalogue reads 4→2, pending status uses one order read');

const raced = fixture();
await raced.catalog.save({ id: 'lunch-v2-barley', revision: (await raced.catalog.admin()).revision, patch: { stock: 3 } });
const same = await raced.basket();
for (const store of [raced.tableStore, raced.orderStore, raced.catalogStore]) store.conflicts = 2;
await Promise.all([raced.online.checkout(same), raced.online.checkout(same)]);
assert.equal(raced.sessions.size, 1);
assert.equal(raced.catalogStore.rows.get('state').value.holds[same.requestId].status, 'reserved');
assert.equal(Object.keys(raced.catalogStore.rows.get('state').value.holds).length, 1);
// Reproduce the live failure: a paid callback and status GET contend on the table.
raced.tableStore.conflicts = 2;
raced.tableStore.onConflict = row => {
  row.value.concurrentMarker = 'must survive retry'; row.etag = randomUUID();
};
const session = raced.sessions.get(same.requestId), total = raced.orderStore.rows.get(same.requestId).value.total;
const event = { id: session.id, metadata: { dumpling_order_id: same.requestId }, currency: 'sgd', amount_total: Math.round(total * 100), payment_status: 'paid' };
let atTable = 0, firstTableWrite, releaseTable, failTable;
const firstWrite = new Promise(resolve => { firstTableWrite = resolve; });
const tableGate = new Promise((resolve, reject) => { releaseTable = resolve; failTable = reject; });
const gateTimeout = setTimeout(() => failTable(Error('Concurrent finalization did not reach table writes')), 5000);
raced.tableStore.beforeWrite = async () => {
  if (++atTable === 1) firstTableWrite();
  if (atTable === 4) releaseTable();
  await tableGate;
};
const callbacks = Promise.all([raced.online.paymentEvent(event), raced.online.paymentEvent(event)]);
await firstWrite;
let results;
try {
  [, ...results] = await Promise.all([callbacks, raced.online.get(same.requestId, same.token), raced.online.get(same.requestId, same.token)]);
} finally { clearTimeout(gateTimeout); raced.tableStore.beforeWrite = null; }
assert(results.every(o => o.status === 'paid' && o.fulfilmentCommitted));
const table = [...raced.tableStore.rows.values()][0].value;
assert.equal(table.concurrentMarker, 'must survive retry');
assert.equal(table.events.filter(e => e.id === same.requestId).length, 1);
assert.equal((await raced.dining.cart(same.table, same.group)).items.length, 0);
assert.equal(raced.catalogStore.rows.get('state').value.holds[same.requestId].status, 'consumed');
const stock = (await raced.catalog.admin()).items.find(d => d.id === 'lunch-v2-barley');
assert.equal(stock.stock, 2, 'Duplicate callbacks/status decrement physical stock exactly once');
assert.equal(stock.reserved, 0);
console.log('PASS live-shaped Blob conflicts: fresh-state retry, concurrent checkout/callback/status, one session/stock hold/receipt');

for (const kind of ['rewards', 'wallet']) {
  const ledger = memory(true); ledger.conflicts = 2;
  const service = kind === 'rewards' ? createRewardsService(ledger) : createWalletService(ledger, {});
  const order = { id: randomUUID(), memberId: 'member-a', paymentMethod: kind === 'wallet' ? 'wallet' : undefined };
  await service.settle(order, 'expired');
  assert.equal(ledger.counts.writes, 3);
  assert.equal(ledger.rows.get('state').value.holds[order.id].status, 'released');
}
console.log('PASS rewards/wallet settlement: observed Blob conflict retried without losing the release');

const lost = fixture(), uncertain = await lost.basket();
lost.orderStore.failAfterWrite = true;
await assert.rejects(lost.online.checkout(uncertain), /RESPONSE_LOST/);
assert(lost.orderStore.rows.has(uncertain.requestId), 'The first attempt committed before its response was lost');
await lost.online.checkout(uncertain);
await lost.online.checkout(uncertain);
assert.equal(lost.sessions.size, 1);
assert.equal(Object.keys(lost.catalogStore.rows.get('state').value.holds).length, 1);
console.log('PASS lost commit response: durable request identity recovers without duplicate session or inventory hold');

const bounded = fixture(); bounded.tableStore.conflicts = Infinity;
await assert.rejects(bounded.basket(), e => e.status === 503);
assert.equal(bounded.tableStore.counts.writes, 16);
assert.equal(bounded.tableStore.rows.size, 0);
console.log('PASS persistent conflict: bounded retries, no false success or partial cart mutation');

// Scoped expiry must still release the requesting member, and never expire a
// concurrently paid order or require unrelated ledger scans for a status read.
let clock = Date.parse('2026-10-27T12:00:00Z');
const orderStore = memory(), rewardStore = memory(true), walletStore = memory(true);
const rewards = createRewardsService(rewardStore, { now: () => new Date(clock) });
const wallet = createWalletService(walletStore, {}, { now: () => new Date(clock) });
const settled = [], orders = ['member-a', 'member-b'].map(memberId => ({
  id: randomUUID(), tokenHash: tokenHash('b'.repeat(64)), type: 'order', mode: 'takeaway', status: 'awaiting_payment',
  paymentMethod: 'wallet', memberId, at: new Date(clock - 31 * 60000).toISOString(), total: 3, items: [],
}));
for (const order of orders) orderStore.rows.set(order.id, { value: order, etag: randomUUID() });
walletStore.rows.set('state', { etag: randomUUID(), value: { holds: Object.fromEntries(orders.map(o => [o.id, { memberId: o.memberId, status: 'reserved', expiresAt: new Date(clock - 60000).toISOString() }])) } });
rewardStore.rows.set('state', { etag: randomUUID(), value: { holds: Object.fromEntries(orders.map(o => [o.id, { memberId: o.memberId, status: 'reserved', freeExpiresAt: new Date(clock - 60000).toISOString() }])) } });
assert.deepEqual(await rewards.expiredFreeReservations('member-a'), [orders[0].id]);
assert.deepEqual(await wallet.expiredReservations('member-b'), [orders[1].id]);
const local = createOnlineService({ storage: orderStore, config: {}, now: () => new Date(clock),
  rewards: { expiredFreeReservations: async () => { throw Error('UNRELATED_REWARDS_DOWN'); }, settle: async () => ({ earnedPoints: 0 }) },
  wallet: { expiredReservations: (...args) => wallet.expiredReservations(...args), settle: async (o, status) => settled.push([o.id, status]) },
});
await local.expireFreeRewards('member-a', { includeRewards: false });
assert.equal(orderStore.rows.get(orders[0].id).value.status, 'expired');
assert.equal(orderStore.rows.get(orders[1].id).value.status, 'awaiting_payment');
assert.deepEqual(settled, [[orders[0].id, 'expired']]);
assert.equal((await local.get(orders[1].id, 'b'.repeat(64))).status, 'expired', 'Status expires only its own local payment');
const paidRace = { ...orders[1], id: randomUUID(), status: 'awaiting_payment' };
orderStore.rows.set(paidRace.id, { value: paidRace, etag: randomUUID() });
orderStore.conflicts = 1;
orderStore.onConflict = row => { row.value.status = 'paid'; row.value.walletSettled = true; row.etag = randomUUID(); };
assert.equal((await local.get(paidRace.id, 'b'.repeat(64))).status, 'paid');
assert(!settled.some(([id, status]) => id === paidRace.id && status === 'expired'));
const abandoned = { ...orders[1], id: randomUUID(), status: 'awaiting_payment' };
orderStore.rows.set(abandoned.id, { value: abandoned, etag: randomUUID() });
await local.pendingPayments();
assert.equal(orderStore.rows.get(abandoned.id).value.status, 'expired', 'Staff maintenance releases abandoned local payments');
console.log('PASS scoped expiry: member isolation, direct status recovery, concurrent paid order never expired');
console.log('PASS checkout resilience: local injected storage only; no live orders or payments');
