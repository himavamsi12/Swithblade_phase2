import "server-only";
import { getPayloadClient } from "@/features/account/customer";
import type { ShippingRate } from "./rates";

/**
 * The delivery options shoppers can be charged, from /admin → Settings →
 * Shipping options: enabled, not for returns, with a fixed price in
 * `currency`. Read fresh, so a price change applies to the next checkout.
 */
export async function listShippingRates(
  currency = "INR",
): Promise<ShippingRate[]> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "shipping-options",
    where: {
      and: [{ enabled: { equals: true } }, { isReturn: { not_equals: true } }],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  return docs.flatMap((doc) => {
    if (doc.priceType === "calculated") return [];
    const price = doc.prices?.find((p) => p.currency === currency);
    if (!price || !Number.isInteger(price.amount) || price.amount < 0) {
      return [];
    }
    return [
      {
        id: doc.id,
        name: doc.name,
        amount: price.amount,
        minSubtotal: doc.rules?.minSubtotal ?? null,
        maxSubtotal: doc.rules?.maxSubtotal ?? null,
      },
    ];
  });
}
