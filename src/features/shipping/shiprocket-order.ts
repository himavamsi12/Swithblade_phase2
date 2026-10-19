import type { Order } from "@/payload-types";

/*
 * Maps a paid order to Shiprocket's "create adhoc order" body. The catalog has
 * no weights or dimensions yet, so every parcel uses DEFAULT_PACKAGE; adjust
 * it to your usual box. Shiprocket takes rupees, our orders hold paise.
 */
export const DEFAULT_PACKAGE = {
  /** Per item, in kg. */
  weightKg: 0.5,
  lengthCm: 30,
  breadthCm: 25,
  heightCm: 5,
};

export type ShiprocketOrder = {
  order_id: string;
  order_date: string;
  pickup_location: string;
  billing_customer_name: string;
  billing_last_name: string;
  billing_address: string;
  billing_address_2: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: true;
  order_items: {
    name: string;
    sku: string;
    units: number;
    selling_price: number;
    discount: number;
  }[];
  payment_method: "Prepaid";
  shipping_charges: number;
  sub_total: number;
  total_discount: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
};

const rupees = (paise: number) => Math.round(paise) / 100;

/** Shiprocket wants a 10-digit Indian mobile, without +91 or a leading 0. */
export function indianMobile(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

/** "YYYY-MM-DD HH:mm" in India time, as Shiprocket expects. */
export function shiprocketDate(iso: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export type MappedOrder =
  | { ok: true; order: Omit<ShiprocketOrder, "pickup_location"> }
  | { ok: false; reason: string };

export function toShiprocketOrder(order: Order): MappedOrder {
  const a = order.shippingAddress;
  if (!a?.addressLine1 || !a.city || !a.postalCode || !a.state) {
    return { ok: false, reason: "Order has no complete shipping address" };
  }
  if (order.currency !== "INR" || (a.country && a.country !== "IN")) {
    return { ok: false, reason: "Only Indian orders ship with Shiprocket" };
  }
  // Fall back to the number the shopper paid with.
  const paidWith = (order.metadata as { razorpay?: { contact?: unknown } })
    ?.razorpay?.contact;
  const phone =
    indianMobile(a.phone) ??
    indianMobile(typeof paidWith === "string" ? paidWith : null);
  if (!phone) {
    return { ok: false, reason: "Order has no valid Indian mobile number" };
  }
  const lines = order.lineItems ?? [];
  if (lines.length === 0) return { ok: false, reason: "Order has no items" };

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const units = lines.reduce((s, l) => s + l.quantity, 0);
  const shipping = order.totals?.shippingTotal ?? 0;
  // Whatever wasn't charged (coupons) is the discount.
  const discount = Math.max(0, subtotal + shipping - (order.amount ?? 0));

  return {
    ok: true,
    order: {
      order_id: String(order.displayId ?? order.id),
      order_date: shiprocketDate(order.createdAt),
      billing_customer_name: a.firstName || "Customer",
      billing_last_name: a.lastName ?? "",
      billing_address: a.addressLine1,
      billing_address_2: a.addressLine2 ?? "",
      billing_city: a.city,
      billing_pincode: a.postalCode,
      billing_state: a.state,
      billing_country: "India",
      billing_email: order.customerEmail ?? "",
      billing_phone: phone,
      shipping_is_billing: true,
      order_items: lines.map((l) => ({
        name: [l.title, l.options].filter(Boolean).join(" · "),
        sku: [l.productSlug ?? l.title, l.options].filter(Boolean).join(":"),
        units: l.quantity,
        selling_price: rupees(l.unitPrice),
        discount: 0,
      })),
      payment_method: "Prepaid",
      shipping_charges: rupees(shipping),
      sub_total: rupees(subtotal),
      total_discount: rupees(discount),
      length: DEFAULT_PACKAGE.lengthCm,
      breadth: DEFAULT_PACKAGE.breadthCm,
      height: DEFAULT_PACKAGE.heightCm,
      weight: Math.round(units * DEFAULT_PACKAGE.weightKg * 100) / 100,
    },
  };
}
