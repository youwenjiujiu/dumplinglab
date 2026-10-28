// Optimistic shared cart: independent operation IDs, durable retries, idempotent checkout.
const retainedCartItem = (id,style) => isLunchItem(id,style) || /^custom-[a-f0-9-]{36}$/.test(id || '');
class TableCart extends EventTarget {
  constructor(table, group, namespace = null) {
    super();
    this.table = table;
    this.group = group;
    this.status = "connecting";
    this.storageAvailable = true;
    this.key = namespace || `atelier:${table || "browse"}:${group}`;
    const read = (key) => {
      let raw;
      try {
        raw = localStorage.getItem(key);
      } catch {
        this.storageAvailable = false;
        return null;
      }
      try { return JSON.parse(raw); } catch { return null; }
    };
    const cached = read(this.key) || {};
    this.remote = cached.remote || { items: [], orders: [], opIds: [] };
    const savedPending = Array.isArray(cached.pending) ? cached.pending : [];
    this.retiredPending = [...(cached.retiredPending || []), ...savedPending.filter(op => op.kind === "delta" && !retainedCartItem(op.dishId, op.style))];
    this.pending = savedPending.filter(op => op.kind !== "delta" || retainedCartItem(op.dishId, op.style));
    this.order = cached.order || null;
    this.noteConflict = cached.noteConflict || null;
    this.lastOrderRequestId = cached.lastOrderRequestId || this.order?.requestId || null;
    this.device = read("atelier-device") || crypto.randomUUID();
    this.nickname = read("atelier-nickname") || "";
    this.writeStorage("atelier-device", JSON.stringify(this.device));
    this.busy = null;
    this.polling = false;
    this.generation = 0;
    addEventListener("online", () => {
      this.flush().catch(() => {});
      this.poll();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.poll();
    });
  }
  writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      this.storageAvailable = false;
      return false;
    }
  }
  persist() {
    this.writeStorage(
      this.key,
      JSON.stringify({
        remote: this.remote,
        pending: this.pending,
        retiredPending: this.retiredPending,
        order: this.order,
        noteConflict: this.noteConflict,
        lastOrderRequestId: this.lastOrderRequestId,
      }),
    );
  }
  emit() {
    this.persist();
    const signature = JSON.stringify({
      remote: this.remote,
      pending: this.pending,
      order: this.order,
      noteConflict: this.noteConflict,
      status: this.status,
      storageAvailable: this.storageAvailable,
      progressSync: this.progressSync,
    });
    if (signature === this.lastEmission) return;
    this.lastEmission = signature;
    this.dispatchEvent(new Event("change"));
  }
  get items() {
    const items = new Map(
      this.remote.items.map((i) => [`${i.id}|${i.style || ""}|${i.note || ""}`, { ...i }]),
    );
    const seen = new Set(this.remote.opIds || []);
    for (const op of this.pending) {
      if (op.kind !== "delta" || seen.has(op.opId)) continue;
      const key = `${op.dishId}|${op.style || ""}|${op.note || ""}`,
        item = items.get(key) || { id: op.dishId, style: op.style, qty: 0, ...(op.note ? { note: op.note } : {}) };
      item.qty = Math.max(0, item.qty + op.delta);
      items.set(key, item);
    }
    return [...items.values()].filter((i) => i.qty > 0 && isLunchItem(i.id, i.style));
  }
  get note() {
    return (
      this.pending.filter((o) => o.kind === "note").at(-1)?.note ??
      this.remote.note ??
      ""
    );
  }
  get orders() {
    const orders = this.remote.orders || [];
    if (!this.table) return orders;
    const day = time => Math.floor((time + 8 * 3600000) / 86400000);
    return orders.filter(order => day(Date.parse(order.at)) === day(Date.now()));
  }
  setNickname(value) {
    this.nickname = String(value || "")
      .replace(/[\u0000-\u001f\u007f<>]/g, "")
      .trim()
      .slice(0, 16);
    this.writeStorage("atelier-nickname", JSON.stringify(this.nickname));
  }
  bindTable(value) {
    if (this.table) throw new Error("已经选择桌号，请扫描新桌二维码切换。");
    const table = String(value || "").trim().toUpperCase();
    if (!/^[A-Z0-9-]{1,12}$/.test(table)) throw new Error("请填写桌牌上的桌号，例如 A1。");
    const key = `atelier:${table}:${this.group}`;
    let cached;
    try { cached = JSON.parse(localStorage.getItem(key) || "{}"); }
    catch { throw new Error("无法读取本桌选菜，请重试或扫描桌上二维码。"); }
    if (cached.order) throw new Error("本桌有一笔订单待确认，请扫描桌上二维码查看；当前选菜已保留。");
    const saved = Array.isArray(cached.pending) ? cached.pending : [];
    const pending = [...saved.filter(op => op.kind !== "delta" || retainedCartItem(op.dishId, op.style)),
      ...this.pending.map(op => ({ ...op, table, group: this.group }))];
    const state = {
      remote: cached.remote || { items: [], orders: [], opIds: [] },
      pending: [...new Map(pending.map(op => [op.opId, op])).values()],
      retiredPending: [...(cached.retiredPending || []), ...saved.filter(op => op.kind === "delta" && !retainedCartItem(op.dishId, op.style)), ...this.retiredPending],
      order: null,
      noteConflict: cached.noteConflict || null,
      lastOrderRequestId: cached.lastOrderRequestId || null,
    };
    // Persist the same operation IDs before clearing the browsing draft. Retrying
    // a interrupted handoff cannot add the same portions twice on the server.
    if (!this.writeStorage(key, JSON.stringify(state)))
      throw new Error("无法保存桌号，选菜仍在当前页面。请允许网站存储后重试。");
    this.writeStorage(this.key, JSON.stringify({ pending: [], remote: { items: [], orders: [], opIds: [] } }));
    Object.assign(this, state, { table, key, status: "connecting" });
    this.generation++;
  }
  peopleFor(id, style) {
    const people = [
      ...(this.remote.contributors?.[`${id}|${style || ""}`] || []),
    ];
    if (
      this.pending.some(
        (op) =>
          op.kind === "delta" &&
          op.delta > 0 &&
          op.dishId === id &&
          (op.style || "") === (style || ""),
      ) &&
      !people.some((p) => p.deviceId === this.device)
    )
      people.push({ deviceId: this.device, name: this.nickname });
    return people;
  }
  async api(path, body) {
    const res = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      // Checkout also reads the shared cart/config and flushes pending edits before creating payment.
      // Give every cart/payment step the same deadline; a nine-second preflight can fail on slow 4G.
      signal: AbortSignal.timeout(/^\/api\/(?:cart|online)(?:\?|$)/.test(path) ? 30000 : 9000),
    });
    const out = await res.json();
    if (!res.ok || !out.ok) {
      const error = new Error(out.error || "Request failed");
      error.status = res.status;
      error.code = out.code;
      error.cart = out.cart;
      throw error;
    }
    return out;
  }
  mutate(data) {
    if (this.order) throw Object.assign(new Error("请先确认上一次订单是否成功，再继续加菜。"), { code: 'OWN_PAYMENT' });
    if (this.remote.paymentPending) throw Object.assign(new Error("本组正在付款，请完成或取消付款后再修改菜品。"), { status: 409, code: 'PAYMENT_PENDING' });
    if (data.kind === "note" && this.noteConflict) {
      this.noteConflict.local = String(data.note || "").slice(0, 240);
      this.emit();
      return;
    }
    if (data.kind === "note") data = { baseNote: this.note, ...data };
    this.generation++;
    this.pending.push({
      ...data,
      opId: crypto.randomUUID(),
      deviceId: this.device,
      actorName: this.nickname,
      table: this.table,
      group: this.group,
    });
    this.status = "syncing";
    this.emit();
    this.flush().catch(() => {});
  }
  async flush() {
    if (this.busy) return this.busy;
    if (!this.pending.length || !this.table) return;
    this.busy = (async () => {
      try {
        while (this.pending.length) {
          const op = this.pending[0];
          let out;
          try { out = await this.api("/api/cart", op); }
          catch (error) {
            if (error.code !== "NOTE_CONFLICT" || !error.cart) throw error;
            this.remote = error.cart;
            this.noteConflict = { local: this.pending.filter((p) => p.kind === "note").at(-1)?.note ?? op.note ?? "", remote: error.cart.note || "" };
            this.pending = this.pending.filter((p) => p.kind !== "note");
            this.generation++;
            continue;
          }
          this.pending = this.pending.filter((p) => p.opId !== op.opId);
          this.remote = out.cart;
          this.generation++;
        }
        this.status = "synced";
      } catch (error) {
        this.status =
          error.status && error.status < 500 ? "rejected" : "offline";
        this.lastError = error.message;
        throw error;
      } finally {
        this.busy = null;
        this.emit();
      }
    })();
    return this.busy;
  }
  async poll() {
    if (!this.table || this.polling || document.hidden) return;
    this.polling = true;
    try {
      try { await this.flush(); }
      catch (error) {
        // A rejected local edit must not prevent reading a later unlock/receipt.
        // Keep all drafts, but continue polling the authoritative group state.
        if (error.code !== 'PAYMENT_PENDING' && !/本组正在付款|同桌正在支付本单/.test(error.message || '')) throw error;
      }
      // No POST can race the GET snapshot: mutation stays optimistic until next flush.
      const generationAtStart = this.generation;
      const out = await this.api(
        `/api/cart?table=${encodeURIComponent(this.table)}&group=${encodeURIComponent(this.group)}&version=${encodeURIComponent(this.remote.version || "")}`,
      );
      if (
        !this.busy &&
        this.generation === generationAtStart &&
        !out.cart.unchanged
      )
        this.remote = out.cart;
      if (this.order && !this.order.token && this.orders.some((o) => o.id === this.order.requestId))
        this.order = null;
      if (this.noteConflict) this.noteConflict.remote = this.remote.note || "";
      this.status = this.pending.length ? "syncing" : "synced";
    } catch {
      this.status = this.status === "rejected" ? "rejected" : "offline";
    } finally {
      this.polling = false;
      this.emit();
    }
  }
  start() {
    this.poll();
    this.timer = setInterval(() => this.poll(), 1200);
  }
  resolveNote(choice, localValue) {
    if (!this.noteConflict) return;
    const note = localValue ?? this.noteConflict.local;
    this.noteConflict = null;
    if (choice === "local") this.mutate({ kind: "note", note });
    else this.emit();
  }
  async checkout(snapshot) {
    if (!this.table) throw new Error("请先扫描桌上的二维码。");
    if (!this.order) {
      await this.flush();
      if (this.noteConflict) throw new Error("请先处理备注冲突，再确认订单。");
      if (!snapshot?.items.length) throw new Error("请先选择菜品。");
      this.order = {
        actorName: this.nickname,
        requestId: crypto.randomUUID(),
        table: this.table,
        group: this.group,
        no: String(Math.floor(1000 + Math.random() * 9000)),
        ...snapshot,
      };
      this.lastOrderRequestId = this.order.requestId;
      this.emit();
    }
    try {
      const out = await this.api("/api/order", this.order);
      this.remote = out.cart;
      this.generation++;
      this.order = null;
      this.status = "synced";
      this.emit();
      return out.order;
    } catch (error) {
      if (error.status && error.status < 500) this.order = null;
      this.emit();
      throw error;
    }
  }
}
