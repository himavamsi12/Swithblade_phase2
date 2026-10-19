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
import type { Order } from "@/payload-types";
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

export type RecordResult =
  | { status: "recorded" | "duplicate"; orderId: number }
  | { status: "rejected"; reason: string };

async function findByRazorpayOrder(razorpayOrderId: string) {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "orders",
    where: { razorpayOrderId: { equals: razorpayOrderId } },
    limit: 1,
    depth: 0,
    select: { razorpayOrderId: true },
  });
  return docs[0]?.id ?? null;
}

export async function recordRazorpayPayment(
  config: RazorpayConfig,
  razorpayOrderId: string,
  paymentId: string,
): Promise<RecordResult> {
  const existing = await findByRazorpayOrder(razorpayOrderId);
  if (existing) return { status: "duplicate", orderId: existing };

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

  const payload = await getPayloadClient();
  const customerId = Number(
    (rzpOrder.notes as Record<string, unknown> | undefined)?.customer,
  );
  const customer =
    Number.isInteger(customerId) && customerId > 0
      ? await payload
          .findByID({ collection: "customers", id: customerId, depth: 0 })
          .catch(() => null)
      : null;
  const customerEmail =
    customer?.email ?? (payment.email ? String(payment.email) : null);

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
    const order = await payload.create({
      collection: "orders",
      data: {
        razorpayOrderId,
        razorpayPaymentId: payment.id,
        customer: customer?.id ?? null,
        customerEmail,
        status: "processing",
        paymentStatus:
          payment.status === "captured" ? "captured" : "authorized",
        amount,
        currency: currency as Currency,
        totals: { subtotal, discountTotal: Math.max(0, subtotal - amount) },
        // Magic Checkout collects it; otherwise the bag page put it in notes.
        shippingAddress: shippingAddress(
          (rzpOrder as { customer_details?: { shipping_address?: unknown } })
            .customer_details?.shipping_address ??
            decodeAddressNotes(rzpOrder.notes),
        ),
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
    return { status: "recorded", orderId: order.id };
  } catch (error) {
    await killTransaction(req);
    // Lost a race with the other caller: the unique index kept one order.
    const raced = await findByRazorpayOrder(razorpayOrderId);
    if (raced) return { status: "duplicate", orderId: raced };
    throw error;
  }
}
