// Menu prices are what the dish costs. Dine-in adds a 10% service charge on top;
// a table or day discount (percent or fixed amount) comes off the food before that charge.
// Old order snapshots are never repriced. Amounts are calculated in integer cents.
(() => {
  const cents = value => Math.round(Number(value) * 100);
  const SERVICE_RATE = 0.1;
  // A discount may set its own percent per menu category (sections; 0 leaves a category
  // out). That needs the order's lines as [{section, amount}]; without them it is one rate.
  const discountCents = (foodCents, discount, lines) => {
    if (!discount) return 0;
    const value = Number(discount.value), sections = discount.sections && lines ? discount.sections : null;
    if (!sections) {
      if (!Number.isFinite(value) || value <= 0) return 0;
      const off = discount.type === 'percent' ? Math.round(foodCents * Math.min(value, 100) / 100)
        : discount.type === 'amount' ? cents(value) : 0;
      return Math.min(foodCents, off);
    }
    if (discount.type === 'amount') {
      const base = lines.reduce((sum, l) => sum + (sections[l.section] === 0 ? 0 : cents(l.amount)), 0);
      return Math.max(0, Math.min(foodCents, base, cents(value)));
    }
    if (discount.type !== 'percent') return 0;
    const byRate = new Map();
    for (const l of lines) {
      const rate = Math.min(Math.max(Number(sections[l.section] ?? value) || 0, 0), 100);
      byRate.set(rate, (byRate.get(rate) || 0) + cents(l.amount));
    }
    return Math.max(0, Math.min(foodCents, [...byRate].reduce((sum, [rate, c]) => sum + Math.round(c * rate / 100), 0)));
  };
  const quote = (foodTotal, mode = 'dinein', discount = null, lines = null) => {
    const foodCents = cents(foodTotal);
    if (!Number.isSafeInteger(foodCents) || foodCents < 0) throw new Error('Invalid subtotal');
    const offCents = mode === 'dinein' ? discountCents(foodCents, discount, lines) : 0;
    const subtotalCents = foodCents - offCents;
    const serviceCents = mode === 'dinein' ? Math.round(subtotalCents * SERVICE_RATE) : 0;
    // Preserve delivery policy: 9% of food.
    const deliveryCents = mode === 'delivery' ? Math.round(subtotalCents * 9 / 100) : 0;
    return { pricingVersion: 'sg-dinein-service10-v3', foodTotal: foodCents / 100,
      ...(offCents ? { discount: offCents / 100, discountRule: { type: discount.type, value: Number(discount.value), ...(discount.scope ? { scope: discount.scope } : {}), ...(discount.sections ? { sections: { ...discount.sections } } : {}) } } : {}),
      subtotal: subtotalCents / 100, serviceRate: mode === 'dinein' ? SERVICE_RATE : 0, serviceCharge: serviceCents / 100,
      deliveryFee: deliveryCents / 100, deliveryRate: mode === 'delivery' ? 0.09 : 0,
      total: (subtotalCents + serviceCents + deliveryCents) / 100 };
  };
  // 买一赠一: every two units of the same dish (flavours may mix) make one free,
  // always the cheaper unit. Returns how many units of each line are free.
  const bogoFree = lines => {
    const free = lines.map(() => 0), groups = new Map();
    lines.forEach((l, n) => { if (l.bogo) groups.set(l.id, [...(groups.get(l.id) || []), n]); });
    for (const group of groups.values()) {
      let left = Math.floor(group.reduce((s, n) => s + lines[n].qty, 0) / 2);
      for (const n of [...group].sort((a, b) => lines[a].price - lines[b].price || a - b)) {
        const take = Math.min(left, lines[n].qty); free[n] = take; left -= take;
      }
    }
    return free;
  };
  // Discounts are set per table or for a whole Singapore day; a table's own discount wins.
  const shopDate = (at = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(at);
  const discountFor = (settings, table, at = new Date()) => {
    const own = settings?.tableDiscounts?.[String(table || '').toUpperCase()];
    if (own) return own;
    const day = settings?.dayDiscounts?.[shopDate(at)];
    return day ? { ...day, scope: 'day' } : null;
  };
  globalThis.OrderPricing = Object.freeze({ cents, quote, bogoFree, shopDate, discountFor, inclusive: value => cents(value) / 100 });
})();
