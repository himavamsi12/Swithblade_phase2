import "server-only";
import { getPayloadClient } from "@/features/account/customer";
import type { CartLine } from "./types";

/*
 * The bag saved on a signed-in shopper's customer record, so every device
 * they sign in on shows the same bag. Guests keep theirs in the browser only.
 */

export async function saveCustomerBag(customerId: number, lines: CartLine[]) {
  const payload = await getPayloadClient();
  await payload.update({
    collection: "customers",
    id: customerId,
    data: { bag: lines },
    depth: 0,
    select: { bag: true },
  });
}
