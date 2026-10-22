// Menu prices are what the dish costs. Dine-in adds a 10% service charge on top;
// a table discount (percent or fixed amount) comes off the food before that charge.
// Old order snapshots are never repriced. Amounts are calculated in integer cents.
(() => {
  const cents = value => Math.round(Number(value) * 100);
  const SERVICE_RATE = 0.1;
  const discountCents = (foodCents, discount) => {
    if (!discount) return 0;
    const value = Number(discount.value);
    if (!Number.isFinite(value) || value <= 0) return 0;
    const off = discount.type === 'percent' ? Math.round(foodCents * Math.min(value, 100) / 100)
      : discount.type === 'amount' ? cents(value) : 0;
    return Math.min(foodCents, off);
  };
  const quote = (foodTotal, mode = 'dinein', discount = null) => {
    const foodCents = cents(foodTotal);
    if (!Number.isSafeInteger(foodCents) || foodCents < 0) throw new Error('Invalid subtotal');
    const offCents = mode === 'dinein' ? discountCents(foodCents, discount) : 0;
    const subtotalCents = foodCents - offCents;
    const serviceCents = mode === 'dinein' ? Math.round(subtotalCents * SERVICE_RATE) : 0;
    // Preserve delivery policy: 9% of food.
    const deliveryCents = mode === 'delivery' ? Math.round(subtotalCents * 9 / 100) : 0;
    return { pricingVersion: 'sg-dinein-service10-v3', foodTotal: foodCents / 100,
      ...(offCents ? { discount: offCents / 100, discountRule: { type: discount.type, value: Number(discount.value) } } : {}),
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
  globalThis.OrderPricing = Object.freeze({ cents, quote, bogoFree, inclusive: value => cents(value) / 100 });
})();
