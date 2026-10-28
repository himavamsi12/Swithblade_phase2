import "server-only";
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
} from "payload";
import { z } from "zod";
import { getPayloadClient } from "@/features/account/customer";
import { getProductBySlug } from "@/features/catalog/repository";
import { orderNumber } from "@/features/notifications/order-confirmation-email";
import { takeStock } from "@/features/stock/repository";
import { lockKey } from "@/payload/transaction";
import type { Address, Customer, Order } from "@/payload-types";
import { supportedCountries } from "@/payload/countries";
import { currenciesConfig } from "@/payload/currencies";
import { decodeAddressNotes } from "./address";
import { decodeCartNotes } from "./pricing";
import { razorpayClient, type RazorpayConfig } from "./razorpay";

/*
 * Turns a paid Razorpay order into a Payload order plus a payment
 * (transaction) record, stored in the Supabase Postgres behind Payload and
 * linked to the shopper's customer record. Safe to call more than once for
 * the same payment: the checkout callback and the webhook may both arrive.
 * The shopper's customer record picks up their name, phone and delivery
 * address from the order.
 */

type Currency = NonNullable<Order["currency"]>;
type Country = NonNullable<NonNullable<Order["shippingAddress"]>["country"]>;

const currencyCodes = new Set<string>(
  currenciesConfig.supportedCurrencies.map((c) => c.code),
);
const countryCodes = new Set<string>(supportedCountries.map((c) => c.value));

const shippingSchema = z
  .object({
    name: z.string().nullish(),
    line1: z.string().nullish(),
    line2: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    zipcode: z.string().nullish(),
    country: z.string().nullish(),
    contact: z.union([z.string(), z.number()]).nullish(),
  })
  .partial();

function shippingAddress(value: unknown): Order["shippingAddress"] {
  const parsed = shippingSchema.safeParse(value);
  if (!parsed.success || !parsed.data.line1) return undefined;
  const a = parsed.data;
  const [firstName, ...rest] = (a.name ?? "").trim().split(/\s+/);
  const country = a.country?.toUpperCase();
  return {
    firstName: firstName || null,
    lastName: rest.join(" ") || null,
    addressLine1: a.line1,
    addressLine2: a.line2 ?? null,
    city: a.city ?? null,
    state: a.state ?? null,
    postalCode: a.zipcode ?? null,
    country: country && countryCodes.has(country) ? (country as Country) : null,
    phone: a.contact != null ? String(a.contact) : null,
  };
}

/** Razorpay fills this in when checkout didn't collect an email. */
const PLACEHOLDER_EMAIL = "void@razorpay.com";

function realEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return email && email !== PLACEHOLDER_EMAIL ? email : null;
}

async function findCustomerByEmail(email: string) {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "customers",
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
  });
  return docs[0] ?? null;
}

/**
 * A guest's customer record. The Supabase sign-up trigger links an existing
 * customer by email instead of creating a new one.
 */
async function findOrCreateCustomer(email: string): Promise<Customer> {
  const existing = await findCustomerByEmail(email);
  if (existing) return existing;
  const payload = await getPayloadClient();
  try {
    return await payload.create({
      collection: "customers",
      data: { email },
      depth: 0,
    });
  } catch (error) {
    // Lost a race with the other caller: the unique email kept one row.
    const raced = await findCustomerByEmail(email);
    if (raced) return raced;
    throw error;
  }
}

/**
 * Fills in the customer's name and phone where they're still blank and saves
 * the delivery address to their address book, unless it's already there.
 * Never overwrites details the shopper or staff entered.
 */
async function updateCustomerFromOrder(
  customer: Customer,
  shipping: Order["shippingAddress"],
  contact: unknown,
) {
  const payload = await getPayloadClient();
  const phone =
    shipping?.phone ??
    (contact != null && String(contact) ? String(contact) : null);

  const profile: Partial<Customer> = {};
  if (!customer.firstName && shipping?.firstName) {
    profile.firstName = shipping.firstName;
    if (!customer.lastName && shipping.lastName) {
      profile.lastName = shipping.lastName;
    }
  }
  if (!customer.phone && phone) profile.phone = phone;
  if (Object.keys(profile).length > 0) {
    await payload.update({
      collection: "customers",
      id: customer.id,
      data: profile,
      depth: 0,
    });
  }

  if (!shipping?.addressLine1 || !shipping.country) return;
  const { totalDocs } = await payload.count({
    collection: "addresses",
    where: {
      and: [
        { customer: { equals: customer.id } },
        { addressLine1: { equals: shipping.addressLine1 } },
        { postalCode: { equals: shipping.postalCode ?? "" } },
      ],
    },
  });
  if (totalDocs > 0) return;
  await payload.create({
    collection: "addresses",
    data: {
      customer: customer.id,
      firstName: shipping.firstName ?? null,
      lastName: shipping.lastName ?? null,
      addressLine1: shipping.addressLine1,
      addressLine2: shipping.addressLine2 ?? null,
      city: shipping.city ?? null,
      state: shipping.state ?? null,
      postalCode: shipping.postalCode ?? null,
      // Both come from the same supported-countries list.
      country: shipping.country as Address["country"],
      phone: shipping.phone ?? null,
    },
    depth: 0,
  });
}

/** Orders placed in a time window, with the metadata follow-ups write to. */
export async function listOrdersPlacedBetween(from: Date, to: Date) {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "orders",
    where: {
      and: [
        { createdAt: { greater_than: from.toISOString() } },
        { createdAt: { less_than: to.toISOString() } },
      ],
    },
    sort: "createdAt",
    limit: 500,
    pagination: false,
    depth: 0,
    select: { metadata: true, displayId: true },
  });
  return docs;
}

/** Notes on each order that staff were told about it, so they're told once. */
export async function markOrdersAlerted(orderIds: number[], at: Date) {
  const payload = await getPayloadClient();
  for (const id of orderIds) {
    // Re-read: Shiprocket and email results are written to the same field.
    const { metadata } = await payload.findByID({
      collection: "orders",
      id,
      depth: 0,
      select: { metadata: true },
    });
    const meta =
      metadata && typeof metadata === "object"
        ? (metadata as Record<string, unknown>)
        : {};
    await payload.update({
      collection: "orders",
      id,
      data: { metadata: { ...meta, alertedAt: at.toISOString() } },
      depth: 0,
    });
  }
}

export type RecordResult =
  | { status: "recorded" | "duplicate"; orderId: number; orderNumber: string }
  | { status: "rejected"; reason: string };

async function findByRazorpayOrder(razorpayOrderId: string) {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "orders",
    where: { razorpayOrderId: { equals: razorpayOrderId } },
    limit: 1,
    depth: 0,
    select: { displayId: true },
  });
  const order = docs[0];
  return order ? { orderId: order.id, orderNumber: orderNumber(order) } : null;
}

type RazorpayClient = ReturnType<typeof razorpayClient>;

/**
 * Captures an authorized payment. Throws if it stays uncaptured, so callers
 * retry (the webhook gets a 500, the cron job tries again next run).
 */
async function capturePayment(
  razorpay: RazorpayClient,
  payment: { id: string; amount: number | string; currency: string },
) {
  try {
    await razorpay.payments.capture(
      payment.id,
      payment.amount,
      payment.currency,
    );
  } catch (error) {
    // Lost a race with another caller (or auto-capture): fine if it's done.
    const latest = await razorpay.payments.fetch(payment.id);
    if (latest.status !== "captured") throw error;
  }
}

export async function recordRazorpayPayment(
  config: RazorpayConfig,
  razorpayOrderId: string,
  paymentId: string,
): Promise<RecordResult> {
  const existing = await findByRazorpayOrder(razorpayOrderId);
  if (existing) return { status: "duplicate", ...existing };

  // Ask Razorpay, not the browser, what was paid and for what.
  const razorpay = razorpayClient(config);
  const [payment, rzpOrder] = await Promise.all([
    razorpay.payments.fetch(paymentId),
    razorpay.orders.fetch(razorpayOrderId),
  ]);
  if (payment.order_id !== razorpayOrderId) {
    return { status: "rejected", reason: "Payment is for another order" };
  }
  if (payment.status !== "captured" && payment.status !== "authorized") {
    return { status: "rejected", reason: `Payment is ${payment.status}` };
  }
  const currency = payment.currency.toUpperCase();
  if (!currencyCodes.has(currency)) {
    return { status: "rejected", reason: `Unsupported currency ${currency}` };
  }
  const lines = decodeCartNotes(rzpOrder.notes);
  if (!lines) {
    return { status: "rejected", reason: "Order has no cart snapshot" };
  }
  // An authorized payment is only a hold: Razorpay refunds it after a few
  // days unless captured. Capture before recording, so every order is paid.
  if (payment.status === "authorized") {
    await capturePayment(razorpay, payment);
  }

  const payload = await getPayloadClient();
  const customerId = Number(
    (rzpOrder.notes as Record<string, unknown> | undefined)?.customer,
  );
  const signedIn =
    Number.isInteger(customerId) && customerId > 0
      ? await payload
          .findByID({ collection: "customers", id: customerId, depth: 0 })
          .catch(() => null)
      : null;
  // The email given in Razorpay, else the one typed on the bag page.
  const contactEmail =
    realEmail(payment.email) ??
    realEmail((rzpOrder.notes as Record<string, unknown> | undefined)?.email);
  // Guests are matched (or added) by the email they paid with, so the order
  // shows up in their account once they sign up with that email.
  const customer =
    signedIn ??
    (contactEmail
      ? await findOrCreateCustomer(contactEmail).catch((error: unknown) => {
          console.error("Couldn't link order to a customer", error);
          return null;
        })
      : null);
  const customerEmail = customer?.email ?? contactEmail;
  const shipping = shippingAddress(
    (rzpOrder as { customer_details?: { shipping_address?: unknown } })
      .customer_details?.shipping_address ?? decodeAddressNotes(rzpOrder.notes),
  );

  // Names and images are for display; prices come from the snapshot.
  const products = new Map(
    await Promise.all(
      [...new Set(lines.map((l) => l.slug))].map(
        async (slug) => [slug, await getProductBySlug(slug)] as const,
      ),
    ),
  );
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const amount = Number(payment.amount);

  const req = await createLocalReq({}, payload);
  await initTransaction(req);
  try {
    // The callback and Razorpay's events (often several, sometimes repeated)
    // can arrive together: one records the order, the rest wait here and
    // then find it, so stock is never taken twice.
    await lockKey(req, `razorpay-order:${razorpayOrderId}`);
    const recorded = await payload.find({
      collection: "orders",
      where: { razorpayOrderId: { equals: razorpayOrderId } },
      limit: 1,
      depth: 0,
      select: { displayId: true },
      req,
    });
    if (recorded.docs[0]) {
      await killTransaction(req);
      return {
        status: "duplicate",
        orderId: recorded.docs[0].id,
        orderNumber: orderNumber(recorded.docs[0]),
      };
    }
    // Paid already, so an oversold line is recorded and flagged, not refused.
    const oversold = await takeStock(lines, razorpayOrderId, req);
    if (oversold.length > 0) {
      console.error(`Order ${razorpayOrderId} oversold:`, oversold);
    }
    const order = await payload.create({
      collection: "orders",
      data: {
        razorpayOrderId,
        razorpayPaymentId: payment.id,
        customer: customer?.id ?? null,
        customerEmail,
        status: "processing",
        paymentStatus: "captured",
        amount,
        currency: currency as Currency,
        totals: { subtotal, discountTotal: Math.max(0, subtotal - amount) },
        // Magic Checkout collects it; otherwise the bag page put it in notes.
        shippingAddress: shipping,
        lineItems: lines.map((l) => {
          const product = products.get(l.slug);
          return {
            title: product?.name ?? l.slug,
            options: [l.color, l.size && `Size ${l.size}`]
              .filter(Boolean)
              .join(" · "),
            productSlug: l.slug,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            image: product?.image ?? null,
          };
        }),
        metadata: {
          razorpay: { method: payment.method, contact: payment.contact },
          ...(oversold.length > 0 && { oversold }),
        },
      },
      depth: 0,
      req,
    });
    await payload.create({
      collection: "transactions",
      data: {
        status: "succeeded",
        order: order.id,
        customer: customer?.id ?? null,
        customerEmail,
        amount,
        currency: currency as Currency,
      },
      depth: 0,
      req,
    });
    await commitTransaction(req);
    if (customer) {
      // Best effort: the order is saved even if the profile update fails.
      await updateCustomerFromOrder(customer, shipping, payment.contact).catch(
        (error: unknown) =>
          console.error("Couldn't update customer from order", error),
      );
    }
    return {
      status: "recorded",
      orderId: order.id,
      orderNumber: orderNumber(order),
    };
  } catch (error) {
    await killTransaction(req);
    // Lost a race with the other caller: the unique index kept one order.
    const raced = await findByRazorpayOrder(razorpayOrderId);
    if (raced) return { status: "duplicate", ...raced };
    throw error;
  }
}
