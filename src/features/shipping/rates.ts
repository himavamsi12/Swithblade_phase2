/*
 * Delivery charges, from the shipping options staff set up in /admin →
 * Settings → Shipping options: each enabled, non-return option with a fixed
 * price, offered when the bag's subtotal (before coupons) is within its
 * min/max rules. The cheapest one that fits is charged, e.g. ₹99 below
 * ₹1,999 and free from ₹1,999. Amounts are in paise. Pure, so the bag page
 * and the server agree.
 */

export type ShippingRate = {
  id: number;
  name: string;
  /** Paise. */
  amount: number;
  /** The option applies from this subtotal (inclusive), in paise. */
  minSubtotal: number | null;
  /** The option applies up to this subtotal (inclusive), in paise. */
  maxSubtotal: number | null;
};

export type ShippingCharge = {
  optionId: number | null;
  name: string;
  fee: number;
};

/** No options set up yet: delivery stays free, as before they existed. */
const FREE: ShippingCharge = {
  optionId: null,
  name: "Standard Delivery",
  fee: 0,
};

const fits = (rate: ShippingRate, subtotal: number) =>
  (rate.minSubtotal == null || subtotal >= rate.minSubtotal) &&
  (rate.maxSubtotal == null || subtotal <= rate.maxSubtotal);

/**
 * What delivery costs for a bag subtotal: the cheapest option that fits.
 * Free when no options are set up, or (logged by callers) none fits.
 */
export function shippingFor(
  rates: ShippingRate[],
  subtotal: number,
): ShippingCharge {
  const best = rates
    .filter((r) => fits(r, subtotal))
    .sort((a, b) => a.amount - b.amount)[0];
  return best ? { optionId: best.id, name: best.name, fee: best.amount } : FREE;
}

/**
 * The lowest subtotal that gets free delivery, for "free over ₹1,999" on the
 * bag page; null when no free option has a minimum.
 */
export function freeShippingFrom(rates: ShippingRate[]): number | null {
  const free = rates.filter((r) => r.amount === 0 && r.minSubtotal != null);
  return free.length > 0 ? Math.min(...free.map((r) => r.minSubtotal!)) : null;
}
