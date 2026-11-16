/*
 * Razorpay Magic Checkout: Razorpay's window collects the shopper's phone and
 * delivery address (and checks the pincode through /api/razorpay/shipping-info),
 * so the bag page only asks for an email. Razorpay's dashboard is set to a
 * custom platform with our shipping-info and promotion URLs (free delivery,
 * no COD), so the paid amount always equals the Razorpay order amount, as
 * `recordPayment` requires. Adding shipping or COD fees there would make it
 * reject every Magic payment.
 *
 * Shared by the bag page and the server so both agree on which checkout runs.
 */

export const USE_MAGIC_CHECKOUT = true;

/** Magic Checkout only supports INR, the store's currency. */
export const MAGIC_CURRENCY = "INR";

/**
 * Whether a bag goes through Magic Checkout. A site coupon keeps the
 * standard checkout: Magic prices its own line items, and our promotion URLs
 * don't apply site coupons yet. The standard checkout needs the bag page's
 * full delivery address.
 */
export function usesMagicCheckout(hasCoupon: boolean) {
  return USE_MAGIC_CHECKOUT && !hasCoupon;
}
