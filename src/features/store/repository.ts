import "server-only";
import { getPayloadClient } from "@/features/account/customer";

/*
 * Kill switches from the Store settings in Payload. Read fresh on every call
 * (no caching), so a switch flipped in the admin applies to the very next
 * checkout.
 */

const DEFAULT_PAUSED_MESSAGE =
  "Checkout is paused for a few minutes. Your bag is saved; please try again shortly.";

export type CheckoutStatus = { open: true } | { open: false; message: string };

export async function getCheckoutStatus(): Promise<CheckoutStatus> {
  try {
    const payload = await getPayloadClient();
    const store = await payload.findGlobal({
      slug: "store",
      depth: 0,
      select: { checkoutPaused: true, checkoutPausedMessage: true },
    });
    if (!store.checkoutPaused) return { open: true };
    return {
      open: false,
      message: store.checkoutPausedMessage?.trim() || DEFAULT_PAUSED_MESSAGE,
    };
  } catch (error) {
    // A settings read failure shouldn't stop sales.
    console.error("Couldn't read checkout kill switch", error);
    return { open: true };
  }
}
