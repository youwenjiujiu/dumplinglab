// Shared browser/server arithmetic. Catalogue prices remain pre-GST; old order
// snapshots are never repriced. All calculations and persisted amounts use cents.
(() => {
  const cents = value => Math.round(Number(value) * 100);
  const quote = (subtotal, mode = 'dinein') => {
    const subtotalCents = cents(subtotal);
    if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) throw new Error('Invalid subtotal');
    const deliveryCents = mode === 'delivery' ? Math.round(subtotalCents * 9 / 100) : 0;
    const gstCents = Math.round((subtotalCents + deliveryCents) * 9 / 100);
    return { pricingVersion: 'sg-gst9-delivery9-v1', subtotal: subtotalCents / 100,
      deliveryFee: deliveryCents / 100, deliveryRate: mode === 'delivery' ? 0.09 : 0,
      gst: gstCents / 100, gstRate: 0.09,
      total: (subtotalCents + deliveryCents + gstCents) / 100 };
  };
  globalThis.OrderPricing = Object.freeze({ cents, quote, inclusive: value => quote(value).total });
})();
