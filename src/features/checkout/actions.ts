"use server";

import { after } from "next/server";
import type { Orders } from "razorpay/dist/types/orders";
import { z } from "zod";
import { getSignedInCustomer } from "@/features/account/customer";
import { MAX_QUANTITY } from "@/features/cart/cart";
import { getProductBySlug } from "@/features/catalog/repository";
import { getCheckoutStatus } from "@/features/store/repository";
import {
  isServiceable,
  shiprocketEnabled,
} from "@/features/shipping/shiprocket";
import { DEFAULT_PACKAGE } from "@/features/shipping/shiprocket-order";
import {
  deliveryAddressSchema,
  encodeAddressNotes,
  type DeliveryAddressInput,
} from "./address";
import { env } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  encodeCartNotes,
  priceCart,
  type CurrentPrice,
  type PricedLine,
} from "./pricing";
import {
  isValidPaymentSignature,
  razorpayClient,
  razorpayConfig,
} from "./razorpay";
import { afterOrderRecorded } from "./after-payment";
import { recordRazorpayPayment } from "./repository";

/** Magic Checkout (one-click, address + COD + coupons) only supports INR. */
const MAGIC_CURRENCY = "INR";
/*
 * Off: in test mode Magic Checkout rejected every pincode without calling our
 * shipping-info URL. The bag page collects the address instead. The Magic
 * endpoints under /api/razorpay stay in place for switching it back on.
 */
const USE_MAGIC_CHECKOUT = false;

const itemsSchema = z
  .array(
    z.object({
      slug: z.string().min(1).max(200),
      color: z.string().max(80).nullable(),
      size: z.string().max(40).nullable(),
      quantity: z.number().int().min(1).max(MAX_QUANTITY),
      price: z.number().int().min(0),
      currency: z.string().length(3),
    }),
  )
  .max(50);

export type CheckoutSession =
  | {
      status: "ok";
      keyId: string;
      orderId: string;
      amount: number;
      currency: string;
      magic: boolean;
      prefill: { name: string; email: string; contact: string };
    }
  | {
      status: "error";
      message: string;
      repriced?: CurrentPrice[];
      /** Per-field messages for the delivery address form. */
      fieldErrors?: Partial<Record<keyof DeliveryAddressInput, string>>;
    };

const absolute = (path: string) =>
  new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();

function lineItem(line: PricedLine): Orders.LineItems {
  const { product, color, size, quantity, unitPrice } = line;
  const variant = [color, size].filter(Boolean).join(" / ");
  // Weight and dimensions aren't in the catalog yet; Razorpay treats them as optional.
  return {
    type: "e-commerce",
    sku: product.id,
    variant_id: variant ? `${product.id}:${variant}` : product.id,
    price: String(unitPrice),
    offer_price: String(unitPrice),
    tax_amount: 0,
    quantity,
    name: product.name,
    description: variant || product.description.slice(0, 200),
    image_url: product.image ? absolute(product.image) : "",
    product_url: absolute(`/products/${product.slug}`),
  } as Orders.LineItems;
}

/** Re-prices the bag on the server and opens a Razorpay order for it. */
export async function createCheckout(
  input: unknown,
  addressInput: unknown,
): Promise<CheckoutSession> {
  const config = razorpayConfig();
  if (!config) {
    return { status: "error", message: "Checkout isn't available yet." };
  }
  const status = await getCheckoutStatus();
  if (!status.open) return { status: "error", message: status.message };
  if (!(await rateLimit("checkout", `ip:${await clientIp()}`))) {
    return {
      status: "error",
      message: "Too many checkout attempts. Please wait a few minutes.",
    };
  }

  const items = itemsSchema.safeParse(input);
  if (!items.success) {
    return { status: "error", message: "Your bag couldn't be read." };
  }

  const address = deliveryAddressSchema.safeParse(addressInput);
  if (!address.success) {
    const fieldErrors: Partial<Record<keyof DeliveryAddressInput, string>> = {};
    for (const issue of address.error.issues) {
      const field = issue.path[0] as keyof DeliveryAddressInput;
      fieldErrors[field] ??= issue.message;
    }
    return {
      status: "error",
      message: "Please check your delivery address.",
      fieldErrors,
    };
  }
  const addressNotes = encodeAddressNotes(address.data);
  if (!addressNotes) {
    return {
      status: "error",
      message: "Your delivery address is too long. Please shorten it.",
    };
  }
  if (shiprocketEnabled()) {
    const serviceable = await isServiceable(
      address.data.pincode,
      DEFAULT_PACKAGE.weightKg,
    ).catch((error: unknown) => {
      console.error("Shiprocket serviceability check failed", error);
      return null;
    });
    if (serviceable === null) {
      return {
        status: "error",
        message: "Couldn't check delivery to your PIN code. Please try again.",
      };
    }
    if (!serviceable) {
      return {
        status: "error",
        message: "Sorry, we don't deliver to this PIN code yet.",
        fieldErrors: { pincode: "We don't deliver here yet." },
      };
    }
  }

  const slugs = [...new Set(items.data.map((i) => i.slug))];
  const products = new Map(
    await Promise.all(
      // Fresh, not cached: a price or stock change applies to the next checkout.
      slugs.map(
        async (slug) =>
          [slug, await getProductBySlug(slug, { fresh: true })] as const,
      ),
    ),
  );
  const cart = priceCart(items.data, products);
  if (!cart.ok) {
    return { status: "error", message: cart.message, repriced: cart.repriced };
  }

  const cartNotes = encodeCartNotes(cart.lines);
  if (!cartNotes) {
    return {
      status: "error",
      message: "Your bag is too large to check out at once.",
    };
  }
  // Signed-in shoppers get the order on their account; guests check out by email.
  const session = await getSignedInCustomer();

  const magic = USE_MAGIC_CHECKOUT && cart.currency === MAGIC_CURRENCY;
  try {
    const order = await razorpayClient(config).orders.create({
      amount: cart.total,
      currency: cart.currency,
      receipt: `sb_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      notes: {
        ...cartNotes,
        ...addressNotes,
        // So guests get a confirmation even if Razorpay doesn't ask for one.
        email: address.data.email,
        ...(session && { customer: String(session.customer.id) }),
      },
      ...(magic
        ? {
            line_items_total: cart.total,
            line_items: cart.lines.map(lineItem),
          }
        : {}),
    });
    return {
      status: "ok",
      keyId: config.keyId,
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      magic,
      prefill: {
        name: address.data.fullName,
        email: address.data.email,
        contact: address.data.phone,
      },
    };
  } catch (error) {
    console.error("Razorpay order creation failed", error);
    return {
      status: "error",
      message: "Couldn't start checkout. Please try again.",
    };
  }
}

const paymentSchema = z.object({
  orderId: z.string().min(1).max(64),
  paymentId: z.string().min(1).max(64),
  signature: z.string().min(1).max(256),
});

const NOT_CONFIRMED = {
  status: "error",
  message: "We couldn't confirm your payment. Contact support if charged.",
} as const;

/**
 * Confirms a payment really came from Razorpay for this order (the browser's
 * success callback alone proves nothing), then saves the order.
 */
export async function verifyPayment(
  input: unknown,
): Promise<
  | { status: "ok"; orderId: number; orderNumber: string }
  | { status: "error"; message: string }
> {
  const config = razorpayConfig();
  const payment = paymentSchema.safeParse(input);
  if (
    !config ||
    !payment.success ||
    !isValidPaymentSignature(
      config,
      payment.data.orderId,
      payment.data.paymentId,
      payment.data.signature,
    )
  ) {
    return NOT_CONFIRMED;
  }

  try {
    const result = await recordRazorpayPayment(
      config,
      payment.data.orderId,
      payment.data.paymentId,
    );
    if (result.status === "rejected") {
      console.error("Razorpay payment not recorded:", result.reason);
      return NOT_CONFIRMED;
    }
    if (result.status === "recorded") {
      after(() => afterOrderRecorded(result.orderId));
    }
    return {
      status: "ok",
      orderId: result.orderId,
      orderNumber: result.orderNumber,
    };
  } catch (error) {
    // Paid but not saved: the webhook retries recording it.
    console.error("Recording Razorpay payment failed", error);
    return NOT_CONFIRMED;
  }
}
