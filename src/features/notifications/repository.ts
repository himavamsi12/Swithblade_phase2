import "server-only";
import { getPayloadClient } from "@/features/account/customer";
import { emailEnabled, sendEmail } from "./email";
import { orderConfirmationEmail } from "./order-confirmation-email";

/*
 * Tells the shopper their order is placed. Each channel's result is noted in
 * the order's `metadata.notifications`, so it shows in the admin and is never
 * sent twice. Never throws: a provider outage must not affect a paid order.
 * WhatsApp will be a second channel here.
 */

type ChannelResult = { sentAt?: string; id?: string; error?: string };
type Notifications = { orderPlaced?: { email?: ChannelResult } };

export async function notifyOrderPlaced(orderId: number): Promise<void> {
  if (!emailEnabled()) return;
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
    const notifications = (metadata.notifications ?? {}) as Notifications;
    if (notifications.orderPlaced?.email?.sentAt) return;

    let email: ChannelResult;
    if (!order.customerEmail) {
      email = { error: "Order has no email address" };
    } else {
      try {
        const { id } = await sendEmail({
          to: order.customerEmail,
          ...orderConfirmationEmail(order),
          idempotencyKey: `order-placed/${order.id}`,
        });
        email = { id, sentAt: new Date().toISOString() };
      } catch (error) {
        email = {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
    if (email.error) {
      console.error(`Order ${orderId} email not sent:`, email.error);
    }

    // Re-read so the Shiprocket result written just before isn't lost.
    const fresh = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      select: { metadata: true },
    });
    const freshMeta =
      fresh.metadata && typeof fresh.metadata === "object"
        ? (fresh.metadata as Record<string, unknown>)
        : {};
    await payload.update({
      collection: "orders",
      id: orderId,
      data: {
        metadata: {
          ...freshMeta,
          notifications: {
            ...((freshMeta.notifications ?? {}) as Notifications),
            orderPlaced: { ...notifications.orderPlaced, email },
          },
        },
      },
      depth: 0,
    });
  } catch (error) {
    console.error(`Order ${orderId} notification failed`, error);
  }
}
