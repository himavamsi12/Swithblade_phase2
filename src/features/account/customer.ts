import "server-only";
import config from "@payload-config";
import {
  commitTransaction,
  createLocalReq,
  getPayload,
  initTransaction,
  killTransaction,
} from "payload";
import { cache } from "react";
import { orderNumber } from "@/features/notifications/order-confirmation-email";
import { optionWords } from "@/features/shipping/shiprocket-return";
import { getCurrentUser } from "@/lib/supabase-server";
import { lockKey } from "@/payload/transaction";
import {
  canRequestReturn,
  holdsItems,
  orderReasons,
  OTHER_REASON,
  returnedByLine,
  type ReturnStatus,
} from "./return-request";
import type { TrackingDates } from "./tracking";

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
    customer = await payload
      .create({
        collection: "customers",
        data: {
          phone: storedPhone(user.phone),
          supabase: { userId: user.id, provider: "phone" },
        },
        depth: 0,
      })
      // Two first requests at once: the unique user id kept the other's row.
      .catch(async (error: unknown) => {
        const raced = await payload.find({
          collection: "customers",
          where: { "supabase.userId": { equals: user.id } },
          limit: 1,
          depth: 0,
        });
        if (raced.docs[0]) return raced.docs[0];
        throw error;
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
  /** For the Track order drawer. */
  tracking: TrackingDates & {
    carrier: string | null;
    trackingNumber: string | null;
  };
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
    /** How many can still be returned: bought, less any in a return. */
    returnableQuantity: number;
  }[];
  /** Returns requested for this order, newest first. */
  returns: ReturnView[];
};

export type ReturnView = {
  id: number;
  /** Customer-facing return number, e.g. "RTN-12". */
  number: string;
  status: ReturnStatus;
  createdAt: string;
  approvedAt: string | null;
  receivedAt: string | null;
  refundedAt: string | null;
  items: {
    key: string;
    title: string;
    options: string | null;
    image: string | null;
    unitPrice: number | null;
    quantity: number;
  }[];
};

/** When Shiprocket last reported the parcel out for delivery, if ever. */
function outForDeliveryAt(metadata: unknown): string | null {
  const tracking = (metadata as { shiprocket?: { tracking?: unknown } } | null)
    ?.shiprocket?.tracking as { outForDeliveryAt?: unknown } | undefined;
  return typeof tracking?.outForDeliveryAt === "string"
    ? tracking.outForDeliveryAt
    : null;
}

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
      metadata: true,
    },
  });

  const { docs: returnDocs } = await payload.find({
    collection: "returns",
    where: { customer: { equals: customerId } },
    sort: "-createdAt",
    limit: 200,
    depth: 0,
    select: {
      order: true,
      status: true,
      items: true,
      createdAt: true,
      approvedAt: true,
      receivedAt: true,
      refundedAt: true,
    },
  });
  const returnsByOrder = new Map<number, typeof returnDocs>();
  for (const r of returnDocs) {
    const orderId = typeof r.order === "object" ? r.order.id : r.order;
    returnsByOrder.set(orderId, [...(returnsByOrder.get(orderId) ?? []), r]);
  }

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
    const fulfillments = o.fulfillments ?? [];
    const tracking = fulfillments.find((f) => f.trackingUrl);
    const latest = (dates: (string | null | undefined)[]) =>
      dates
        .filter((d): d is string => Boolean(d))
        .sort()
        .at(-1) ?? null;
    const deliveredAt = latest(fulfillments.map((f) => f.deliveredAt));
    const shippedAt = latest(fulfillments.map((f) => f.shippedAt));
    const courier = fulfillments.find((f) => f.trackingNumber || f.carrier);
    const status = statusOf(o);

    const items = snapshot.length > 0 ? snapshot : fromRelations;
    const returns = returnsByOrder.get(o.id) ?? [];
    const returned = returnedByLine(returns);
    const byKey = new Map(items.map((i) => [i.key, i]));

    return {
      id: o.id,
      number: orderNumber(o),
      orderedAt: o.createdAt,
      expectedDeliveryAt: o.expectedDeliveryAt ?? null,
      total: o.amount ?? null,
      currency: o.currency ?? null,
      status,
      trackingUrl: tracking?.trackingUrl ?? null,
      tracking: {
        placedAt: o.createdAt,
        shippedAt,
        outForDeliveryAt: outForDeliveryAt(o.metadata),
        deliveredAt,
        carrier: courier?.carrier ?? null,
        trackingNumber: courier?.trackingNumber ?? null,
      },
      returnable: canRequestReturn(status, deliveredAt, now),
      items: items.map((i) => ({
        ...i,
        // Only snapshot lines (with a product) can be returned from here.
        returnableQuantity: i.productSlug
          ? Math.max(0, i.quantity - (returned.get(i.key) ?? 0))
          : 0,
      })),
      returns: returns.map((r) => ({
        id: r.id,
        number: `RTN-${r.id}`,
        status: r.status,
        createdAt: r.createdAt,
        approvedAt: r.approvedAt ?? null,
        receivedAt: r.receivedAt ?? null,
        refundedAt: r.refundedAt ?? null,
        items: r.items.map((item, i) => {
          const line = item.lineId ? byKey.get(item.lineId) : undefined;
          return {
            key: item.id ?? String(i),
            title: line?.title ?? "Item",
            options: line?.options ?? null,
            image: line?.image ?? null,
            unitPrice: line?.unitPrice ?? null,
            quantity: item.quantity,
          };
        }),
      })),
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

/** The reasons a shopper can pick when returning, as staff set them up. */
export async function listReturnReasons() {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "return-reasons",
    limit: 50,
    depth: 0,
    select: { label: true, value: true },
  });
  return orderReasons(docs).map((r) => ({
    id: r.id,
    label: r.label,
    // "Other" means nothing unless the shopper says what it is.
    needsDetails: r.value === OTHER_REASON,
  }));
}

export type ReturnPhoto = {
  file: { data: Buffer; mimetype: string; name: string; size: number };
  caption: string;
};

export type ReturnRequest = {
  orderId: number;
  /** Order line ids and how many of each to return. */
  lines: { key: string; quantity: number }[];
  reasonId: number | null;
  note: string | null;
  photos: ReturnPhoto[];
};

export type ReturnRequestResult =
  | { status: "created"; returnNumber: string }
  | {
      status:
        "not-returnable" | "already-returned" | "needs-details" | "invalid";
    };

/**
 * Creates a return for one of the shopper's own orders, waiting for staff
 * review. Everything the browser sends is checked again here: the order is
 * theirs, delivered and in the return window, and each line and quantity
 * was bought and isn't already in another return.
 */
export async function createCustomerReturn(
  customerId: number,
  request: ReturnRequest,
): Promise<ReturnRequestResult> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "orders",
    where: {
      and: [
        { id: { equals: request.orderId } },
        { customer: { equals: customerId } },
      ],
    },
    limit: 1,
    depth: 0,
    select: {
      status: true,
      fulfillmentStatus: true,
      fulfillments: true,
      lineItems: true,
      currency: true,
    },
  });
  const order = docs[0];
  if (!order) return { status: "invalid" };

  const deliveredAt =
    (order.fulfillments ?? [])
      .map((f) => f.deliveredAt)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  if (!canRequestReturn(statusOf(order), deliveredAt, new Date())) {
    return { status: "not-returnable" };
  }

  const bought = new Map((order.lineItems ?? []).map((l) => [l.id, l]));
  const picked = request.lines.map((r) => ({ ...r, line: bought.get(r.key) }));
  if (
    picked.length === 0 ||
    new Set(picked.map((p) => p.key)).size !== picked.length ||
    picked.some(
      (p) =>
        !p.line?.productSlug ||
        !Number.isInteger(p.quantity) ||
        p.quantity < 1 ||
        p.quantity > p.line.quantity,
    )
  ) {
    return { status: "invalid" };
  }

  const handles = [...new Set(picked.map((p) => p.line!.productSlug!))];
  const { docs: products } = await payload.find({
    collection: "products",
    where: { handle: { in: handles } },
    limit: handles.length,
    depth: 0,
    select: { handle: true },
  });
  const productByHandle = new Map(products.map((p) => [p.handle, p.id]));
  const { docs: variants } = await payload.find({
    collection: "variants",
    where: { product: { in: products.map((p) => p.id) } },
    limit: 500,
    depth: 1,
    select: { product: true, options: true },
  });

  const items = [];
  for (const { key, line, quantity } of picked) {
    const productId = productByHandle.get(line!.productSlug!);
    if (productId === undefined) return { status: "invalid" };
    // The variant whose option labels are the line's, e.g. Maroon + XS.
    const words = optionWords(line!.options);
    const variant = variants.find((v) => {
      const pid = typeof v.product === "object" ? v.product.id : v.product;
      if (pid !== productId || words.length === 0) return false;
      const labels = new Set(
        v.options.map((o) =>
          typeof o === "object" ? o.label.toLowerCase() : "",
        ),
      );
      return words.every((w) => labels.has(w));
    });
    items.push({
      product: productId,
      variant: variant?.id ?? null,
      quantity,
      lineId: key,
      reason: request.reasonId,
    });
  }

  if (request.reasonId !== null) {
    const reason = await payload
      .findByID({
        collection: "return-reasons",
        id: request.reasonId,
        depth: 0,
        select: { value: true },
      })
      .catch(() => null);
    if (!reason) return { status: "invalid" };
    if (reason.value === OTHER_REASON && !request.note?.trim()) {
      return { status: "needs-details" };
    }
  }

  // Two quick submits take turns, so no item is returned twice.
  const req = await createLocalReq({}, payload);
  await initTransaction(req);
  try {
    await lockKey(req, `return-request:${order.id}`);
    const { docs: existing } = await payload.find({
      collection: "returns",
      where: { order: { equals: order.id } },
      limit: 100,
      depth: 0,
      select: { status: true, items: true },
      req,
    });
    const returned = returnedByLine(
      existing.filter((r) => holdsItems(r.status)),
    );
    const overReturned = picked.some(
      (p) => p.quantity > p.line!.quantity - (returned.get(p.key) ?? 0),
    );
    if (overReturned) {
      await killTransaction(req);
      return { status: "already-returned" };
    }

    const photos = [];
    for (const { file, caption } of request.photos) {
      const photo = await payload.create({
        collection: "return-photos",
        data: { customer: customerId, caption },
        file,
        depth: 0,
        req,
      });
      photos.push(photo.id);
    }
    const created = await payload.create({
      collection: "returns",
      data: {
        order: order.id,
        status: "requested",
        items,
        photos,
        customerNote: request.note,
        currency: order.currency ?? null,
      },
      depth: 0,
      req,
    });
    await commitTransaction(req);
    return { status: "created", returnNumber: `RTN-${created.id}` };
  } catch (error) {
    await killTransaction(req);
    throw error;
  }
}
