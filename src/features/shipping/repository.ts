import "server-only";
import { getPayloadClient } from "@/features/account/customer";
import { createOrder, shiprocketEnabled } from "./shiprocket";
import { toShiprocketOrder } from "./shiprocket-order";

/*
 * Hands a paid order to Shiprocket and notes the result in the order's
 * `metadata.shiprocket`, so it shows in the admin and is never sent twice.
 * Never throws: a Shiprocket outage must not affect a recorded payment.
 */

type ShiprocketMeta = {
  orderId?: string;
  shipmentId?: string | null;
  error?: string;
  at: string;
};

export async function sendOrderToShiprocket(orderId: number): Promise<void> {
  if (!shiprocketEnabled()) return;
  try {
    const payload = await getPayloadClient();
    const order = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
    });
    const metadata =
      order.metadata && typeof order.metadata === "object"
        ? (order.metadata as Record<string, unknown>)
        : {};
    if ((metadata.shiprocket as ShiprocketMeta | undefined)?.orderId) return;

    let shiprocket: ShiprocketMeta;
    const mapped = toShiprocketOrder(order);
    if (!mapped.ok) {
      shiprocket = { error: mapped.reason, at: new Date().toISOString() };
    } else {
      try {
        const created = await createOrder(mapped.order);
        shiprocket = { ...created, at: new Date().toISOString() };
      } catch (error) {
        shiprocket = {
          error: error instanceof Error ? error.message : String(error),
          at: new Date().toISOString(),
        };
      }
    }
    if (shiprocket.error) {
      console.error(`Shiprocket: order ${orderId} not sent:`, shiprocket.error);
    }

    await payload.update({
      collection: "orders",
      id: orderId,
      data: { metadata: { ...metadata, shiprocket } },
      depth: 0,
    });
  } catch (error) {
    console.error(`Shiprocket: order ${orderId} failed`, error);
  }
}
