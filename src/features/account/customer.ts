import "server-only";
import config from "@payload-config";
import { getPayload } from "payload";
import { cache } from "react";
import { orderNumber } from "@/features/notifications/order-confirmation-email";
import { getCurrentUser } from "@/lib/supabase-server";
import { canRequestReturn } from "./return-request";

/*
 * Server-side access to the signed-in shopper's own Payload records. Payload's
 * local API bypasses collection access rules, so every query here is scoped
 * to the customer resolved from the verified Supabase session. Never accept a
 * customer or address id from the browser without checking ownership.
 */

export const getPayloadClient = () => getPayload({ config });

/** The shopper's Supabase user plus their Payload customer, or null if signed out. */
export const getSignedInCustomer = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "customers",
    where: { "supabase.userId": { equals: user.id } },
    limit: 1,
    depth: 0,
  });
  let customer = docs[0];

  // The database trigger normally creates this row at sign-up; recover if not.
  if (!customer && !user.email && user.phone) {
    // Phone-only account: nothing to match on, so link by Supabase user id.
    customer = await payload.create({
      collection: "customers",
      data: {
        phone: storedPhone(user.phone),
        supabase: { userId: user.id, provider: "phone" },
      },
      depth: 0,
    });
  }
  if (!customer && user.email) {
    const byEmail = await payload.find({
      collection: "customers",
      where: { email: { equals: user.email.toLowerCase() } },
      limit: 1,
      depth: 0,
    });
    customer =
      byEmail.docs[0] ??
      (await payload
        .create({
          collection: "customers",
          data: { email: user.email.toLowerCase() },
          depth: 0,
        })
        // Two first requests at once (e.g. page + bag sync): the unique email
        // kept the other's row, so use that.
        .catch(async (error: unknown) => {
          const raced = await payload.find({
            collection: "customers",
            where: { email: { equals: user.email!.toLowerCase() } },
            limit: 1,
            depth: 0,
          });
          if (raced.docs[0]) return raced.docs[0];
          throw error;
        }));
  }

  return customer ? { user, customer } : null;
});

/** Supabase's "919876543210" in the storefront's "+91 9876543210" form. */
function storedPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return /^91\d{10}$/.test(digits) ? `+91 ${digits.slice(2)}` : `+${digits}`;
}

export async function listCustomerAddresses(customerId: number) {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "addresses",
    where: { customer: { equals: customerId } },
    sort: "-createdAt",
    limit: 50,
    depth: 0,
  });
  return docs;
}

export type OrderView = {
  id: number;
  /** Customer-facing order number, e.g. "SB-1001". */
  number: string;
  orderedAt: string;
  expectedDeliveryAt: string | null;
  total: number | null;
  currency: string | null;
  status: OrderStatusKey;
  trackingUrl: string | null;
  /** Delivered and still inside the return window. */
  returnable: boolean;
  items: {
    key: string;
    title: string;
    options: string | null;
    image: string | null;
    unitPrice: number | null;
    quantity: number;
    productSlug: string | null;
  }[];
};

export type OrderStatusKey =
  "processing" | "packed" | "shipped" | "delivered" | "returned" | "cancelled";

function statusOf(order: {
  status?: string | null;
  fulfillmentStatus?: string | null;
}): OrderStatusKey {
  if (order.status === "cancelled" || order.fulfillmentStatus === "canceled") {
    return "cancelled";
  }
  switch (order.fulfillmentStatus) {
    case "delivered":
      return "delivered";
    case "shipped":
      return "shipped";
    case "fulfilled":
      return "packed";
    case "returned":
      return "returned";
    default:
      return "processing";
  }
}

/** The shopper's orders, newest first, shaped for the order history page. */
export async function listCustomerOrders(
  customerId: number,
): Promise<OrderView[]> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "orders",
    where: { customer: { equals: customerId } },
    sort: "-createdAt",
    limit: 50,
    // Populates product/variant for orders placed before line-item snapshots.
    depth: 1,
    select: {
      displayId: true,
      createdAt: true,
      expectedDeliveryAt: true,
      amount: true,
      currency: true,
      status: true,
      fulfillmentStatus: true,
      lineItems: true,
      items: true,
      fulfillments: true,
    },
  });

  const now = new Date();
  return docs.map((o) => {
    const snapshot = (o.lineItems ?? []).map((li, i) => ({
      key: li.id ?? String(i),
      title: li.title,
      options: li.options ?? null,
      image: li.image ?? null,
      unitPrice: li.unitPrice,
      quantity: li.quantity,
      productSlug: li.productSlug ?? null,
    }));
    const fromRelations = (o.items ?? []).map((item, i) => {
      const product = typeof item.product === "object" ? item.product : null;
      const variant = typeof item.variant === "object" ? item.variant : null;
      return {
        key: item.id ?? String(i),
        title: product?.title ?? "Item",
        options: variant?.title ?? null,
        image: null,
        unitPrice: null,
        quantity: item.quantity,
        productSlug: product?.handle ?? null,
      };
    });
    const tracking = (o.fulfillments ?? []).find((f) => f.trackingUrl);
    const deliveredAt =
      (o.fulfillments ?? [])
        .map((f) => f.deliveredAt)
        .filter((d): d is string => Boolean(d))
        .sort()
        .at(-1) ?? null;
    const status = statusOf(o);

    return {
      id: o.id,
      number: orderNumber(o),
      orderedAt: o.createdAt,
      expectedDeliveryAt: o.expectedDeliveryAt ?? null,
      total: o.amount ?? null,
      currency: o.currency ?? null,
      status,
      trackingUrl: tracking?.trackingUrl ?? null,
      returnable: canRequestReturn(status, deliveredAt, now),
      items: snapshot.length > 0 ? snapshot : fromRelations,
    };
  });
}

export async function listCustomerReturns(customerId: number) {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "returns",
    where: { customer: { equals: customerId } },
    sort: "-createdAt",
    limit: 50,
    depth: 1,
    select: {
      order: true,
      status: true,
      refundAmount: true,
      currency: true,
      createdAt: true,
      items: true,
    },
  });
  return docs;
}
