// Catalogue prices include GST. Extract food GST using 9/109, never add it again.
// Old order snapshots are never repriced. Amounts are calculated in integer cents.
(() => {
  const cents = value => Math.round(Number(value) * 100);
  const quote = (foodTotal, mode = 'dinein') => {
    const foodCents = cents(foodTotal);
    if (!Number.isSafeInteger(foodCents) || foodCents < 0) throw new Error('Invalid subtotal');
    const foodGstCents = Math.round(foodCents * 9 / 109);
    const subtotalCents = foodCents - foodGstCents;
    // Preserve delivery policy: 9% of net food, with GST on that fee separately.
    const deliveryCents = mode === 'delivery' ? Math.round(subtotalCents * 9 / 100) : 0;
    const deliveryGstCents = Math.round(deliveryCents * 9 / 100);
    const gstCents = foodGstCents + deliveryGstCents;
    return { pricingVersion: 'sg-inclusive-gst9-delivery9-v2', foodTotal: foodCents / 100,
      subtotal: subtotalCents / 100, foodGst: foodGstCents / 100, deliveryGst: deliveryGstCents / 100,
      deliveryFee: deliveryCents / 100, deliveryRate: mode === 'delivery' ? 0.09 : 0,
      gst: gstCents / 100, gstRate: 0.09,
      total: (subtotalCents + deliveryCents + gstCents) / 100 };
  };
  globalThis.OrderPricing = Object.freeze({ cents, quote, inclusive: value => quote(value).foodTotal });
})();
