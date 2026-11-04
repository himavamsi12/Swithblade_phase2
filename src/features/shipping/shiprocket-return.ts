import type { Order, Product, Return, Variant } from "@/payload-types";
import {
  DEFAULT_PACKAGE,
  indianMobile,
  shiprocketDate,
} from "./shiprocket-order";

/*
 * Maps a return to Shiprocket's "create return order" body: the courier
 * collects from the shopper's delivery address and brings the parcel to our
 * pickup address (filled in by the client). Items are matched to the order's
 * lines for their name, SKU and price, so they read the same as the outbound
 * order in Shiprocket's panel.
 */

export type ShiprocketReturn = {
  order_id: string;
  order_date: string;
  pickup_customer_name: string;
  pickup_last_name: string;
  pickup_address: string;
  pickup_address_2: string;
  pickup_city: string;
  pickup_state: string;
  pickup_country: string;
  pickup_pincode: string;
  pickup_email: string;
  pickup_phone: string;
  order_items: {
    name: string;
    sku: string;
    units: number;
    selling_price: number;
    discount: number;
  }[];
  payment_method: "PREPAID";
  sub_total: number;
  total_discount: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
};

export type MappedReturn =
  { ok: true; order: ShiprocketReturn } | { ok: false; reason: string };

/** Our id for a return in Shiprocket, e.g. "1042-R7". Never a plain number. */
export const returnOrderId = (orderNumber: number | string, returnId: number) =>
  `${orderNumber}-R${returnId}`;

/** The return a Shiprocket order id is for, or null for an outbound order. */
export function returnIdOf(shiprocketOrderId: string | number): number | null {
  const m = /^\d+-R(\d+)$/.exec(String(shiprocketOrderId).trim());
  return m ? Number(m[1]) : null;
}

const rupees = (paise: number) => Math.round(paise) / 100;

type OrderLine = NonNullable<Order["lineItems"]>[number];

/** The words a line's options are made of: "Maroon · Size XS" → maroon, xs. */
export const optionWords = (options: string | null | undefined) =>
  (options ?? "")
    .split("·")
    .map((p) =>
      p
        .trim()
        .replace(/^size\s+/i, "")
        .toLowerCase(),
    )
    .filter(Boolean);

/** The order line a returned product (and variant) was bought as. */
function lineFor(
  lines: OrderLine[],
  product: Product,
  variant: Variant | null,
): OrderLine | undefined {
  const candidates = lines.filter((l) => l.productSlug === product.handle);
  if (candidates.length <= 1 || !variant) return candidates[0];
  const labels = new Set(
    variant.options
      .map((o) => (typeof o === "object" ? o.label.toLowerCase() : ""))
      .filter(Boolean),
  );
  return (
    candidates.find((l) =>
      optionWords(l.options).every((w) => labels.has(w)),
    ) ?? candidates[0]
  );
}

/** `ret` must be read with depth 2, so products and variant options are in. */
export function toShiprocketReturn(ret: Return, order: Order): MappedReturn {
  const a = order.shippingAddress;
  if (!a?.addressLine1 || !a.city || !a.postalCode || !a.state) {
    return { ok: false, reason: "Order has no complete shipping address" };
  }
  if (order.currency !== "INR" || (a.country && a.country !== "IN")) {
    return { ok: false, reason: "Only Indian orders return with Shiprocket" };
  }
  const paidWith = (order.metadata as { razorpay?: { contact?: unknown } })
    ?.razorpay?.contact;
  const phone =
    indianMobile(a.phone) ??
    indianMobile(typeof paidWith === "string" ? paidWith : null);
  if (!phone) {
    return { ok: false, reason: "Order has no valid Indian mobile number" };
  }

  const lines = order.lineItems ?? [];
  const items: ShiprocketReturn["order_items"] = [];
  let subtotal = 0;
  let units = 0;
  for (const item of ret.items) {
    if (typeof item.product !== "object") {
      return { ok: false, reason: "Return was read without its products" };
    }
    const variant = typeof item.variant === "object" ? item.variant : null;
    // Returns requested from the storefront name their line exactly.
    const line =
      (item.lineId && lines.find((l) => l.id === item.lineId)) ||
      lineFor(lines, item.product, variant);
    if (!line) {
      return {
        ok: false,
        reason: `${item.product.title} isn't in this order`,
      };
    }
    if (item.quantity > line.quantity) {
      return {
        ok: false,
        reason: `Returning ${item.quantity} of ${line.title}, but ${line.quantity} were bought`,
      };
    }
    items.push({
      name: [line.title, line.options].filter(Boolean).join(" · "),
      sku: [line.productSlug ?? line.title, line.options]
        .filter(Boolean)
        .join(":"),
      units: item.quantity,
      selling_price: rupees(line.unitPrice),
      discount: 0,
    });
    subtotal += line.unitPrice * item.quantity;
    units += item.quantity;
  }
  if (items.length === 0) return { ok: false, reason: "Return has no items" };

  return {
    ok: true,
    order: {
      order_id: returnOrderId(order.displayId ?? order.id, ret.id),
      order_date: shiprocketDate(ret.createdAt),
      pickup_customer_name: a.firstName || "Customer",
      pickup_last_name: a.lastName ?? "",
      pickup_address: a.addressLine1,
      pickup_address_2: a.addressLine2 ?? "",
      pickup_city: a.city,
      pickup_state: a.state,
      pickup_country: "India",
      pickup_pincode: a.postalCode,
      pickup_email: order.customerEmail ?? "",
      pickup_phone: phone,
      order_items: items,
      payment_method: "PREPAID",
      sub_total: rupees(subtotal),
      total_discount: 0,
      length: DEFAULT_PACKAGE.lengthCm,
      breadth: DEFAULT_PACKAGE.breadthCm,
      height: DEFAULT_PACKAGE.heightCm,
      weight: Math.round(units * DEFAULT_PACKAGE.weightKg * 100) / 100,
    },
  };
}
