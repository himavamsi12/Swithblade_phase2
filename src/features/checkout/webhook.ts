import "server-only";
import { z } from "zod";
import { isValidWebhook, razorpayConfig, webhooksEnabled } from "./razorpay";
import { recordRazorpayPayment } from "./repository";

const eventSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z
      .object({
        entity: z.object({ id: z.string(), order_id: z.string().nullish() }),
      })
      .optional(),
  }),
});

/**
 * Backs up the checkout callback: if the shopper closes the tab after paying,
 * Razorpay's `order.paid` / `payment.captured` event still records the order.
 * Returns the HTTP status to answer with (non-2xx makes Razorpay retry).
 */
export async function handleRazorpayWebhook(
  body: string,
  signature: string | null,
): Promise<number> {
  const config = razorpayConfig();
  if (!config || !webhooksEnabled()) return 404;
  if (!signature || !isValidWebhook(body, signature)) return 400;

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return 400;
  }
  const parsed = eventSchema.safeParse(json);
  if (!parsed.success) return 400;
  const payment = parsed.data.payload.payment?.entity;
  if (
    !["order.paid", "payment.captured"].includes(parsed.data.event) ||
    !payment?.order_id
  ) {
    return 200; // Not an event we act on.
  }

  try {
    const result = await recordRazorpayPayment(
      config,
      payment.order_id,
      payment.id,
    );
    if (result.status === "rejected") {
      console.error("Razorpay webhook not recorded:", result.reason);
    }
    return 200;
  } catch (error) {
    console.error("Razorpay webhook failed", error);
    return 500;
  }
}
