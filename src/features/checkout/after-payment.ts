import "server-only";
import { notifyOrderPlaced } from "@/features/notifications/repository";
import { sendOrderToShiprocket } from "@/features/shipping/repository";

/**
 * Follow-up work for a newly recorded order, run after the response is sent.
 * One after the other, since both write the order's metadata. Neither throws.
 */
export async function afterOrderRecorded(orderId: number) {
  await sendOrderToShiprocket(orderId);
  await notifyOrderPlaced(orderId);
}
