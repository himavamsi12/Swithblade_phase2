import "server-only";
import { getPayloadClient } from "@/features/account/customer";

/*
 * Magic Checkout's coupon calls name the order by its receipt. Razorpay's
 * search by receipt lags for a while after an order is created (the first
 * coupon call came back empty), so each receipt's order id is noted here
 * when the order is created, and looked up from here first.
 */

const key = (receipt: string) => `razorpay-receipt:${receipt}`;

/** Best effort: the coupon check falls back to Razorpay's search. */
export async function rememberReceipt(receipt: string, orderId: string) {
  try {
    const payload = await getPayloadClient();
    await payload.kv.set(key(receipt), { orderId });
  } catch (error) {
    console.error("Couldn't note the Razorpay receipt", error);
  }
}

/** The Razorpay order id noted for a receipt, if any. */
export async function orderIdForReceipt(
  receipt: string,
): Promise<string | null> {
  try {
    const payload = await getPayloadClient();
    const entry = await payload.kv.get<{ orderId?: unknown }>(key(receipt));
    return typeof entry?.orderId === "string" ? entry.orderId : null;
  } catch (error) {
    console.error("Couldn't read the Razorpay receipt", error);
    return null;
  }
}
