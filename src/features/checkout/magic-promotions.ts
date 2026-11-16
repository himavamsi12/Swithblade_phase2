import "server-only";
import { z } from "zod";
import { getPayloadClient } from "@/features/account/customer";
import { getProductBySlug } from "@/features/catalog/repository";
import { checkCouponForLines } from "@/features/promotions/coupon";
import { rateLimit } from "@/lib/rate-limit";
import { formatPrice } from "@/lib/format";
import { decodeCartNotes } from "./pricing";
import { razorpayClient, razorpayConfig } from "./razorpay";
import { orderIdForReceipt } from "./receipts";

/*
 * Coupons inside Razorpay Magic Checkout. Razorpay calls our "apply
 * promotions" URL with the order's receipt and the code the shopper typed;
 * we check it against the store's coupons (/admin → Promotions) for the bag
 * saved on that Razorpay order and answer with the discount, which Razorpay
 * takes off the payment. `recordPayment` accepts the lower amount only for
 * coupons that exist here.
 */

/** Our checkout's Razorpay receipts: `sb_<time>_<random>`. */
const RECEIPT = /^sb_\d+_[0-9a-f]{8}$/;

export const applyPromotionSchema = z.object({
  /**
   * Razorpay's docs say this is the order's receipt; some requests may
   * carry the order id instead, so both are accepted.
   */
  order_id: z.string().trim().min(1).max(64),
  /** Sent with the shipping-info call; the order id, maybe without `order_`. */
  razorpay_order_id: z.string().trim().max(64).nullish(),
  code: z.string().trim().min(1).max(64),
  contact: z.string().nullish(),
  email: z.string().nullish(),
});

type RazorpayClient = ReturnType<typeof razorpayClient>;

/** The Razorpay order a Magic request is about: by order id, else receipt. */
async function findOrder(
  client: RazorpayClient,
  orderId: string,
  razorpayOrderId: string | null | undefined,
) {
  const id =
    razorpayOrderId ||
    (RECEIPT.test(orderId) ? await orderIdForReceipt(orderId) : orderId);
  if (id) {
    return client.orders
      .fetch(id.startsWith("order_") ? id : `order_${id}`)
      .catch(() => null);
  }
  // Not noted (e.g. created before receipts were noted): Razorpay's search,
  // which can lag just after the order is created.
  const { items } = await client.orders.all({ receipt: orderId, count: 1 });
  return items[0] ?? null;
}

type FailureCode =
  "INVALID_PROMOTION" | "LOGIN_REQUIRED" | "REQUIREMENT_NOT_MET";

export type ApplyPromotionResult =
  | {
      ok: true;
      body: {
        promotion: {
          reference_id: string;
          type: "coupon";
          code: string;
          value: number;
          value_type: "fixed_amount";
          description: string;
        };
      };
    }
  | {
      ok: false;
      body: { failure_code: FailureCode; failure_reason: string };
    };

const failure = (
  failure_code: FailureCode,
  failure_reason: string,
): ApplyPromotionResult => ({
  ok: false,
  body: { failure_code, failure_reason },
});

const INVALID = "This coupon code isn't valid.";

/** Razorpay's error code for one of our coupon messages. */
function failureCode(message: string, signedIn: boolean): FailureCode {
  if (message.includes("for your account")) {
    return signedIn ? "REQUIREMENT_NOT_MET" : "LOGIN_REQUIRED";
  }
  if (
    message.includes("bag total") ||
    message.includes("items in your bag") ||
    message.includes("delivery address")
  ) {
    return "REQUIREMENT_NOT_MET";
  }
  return "INVALID_PROMOTION";
}

async function customerGroups(customerId: number): Promise<number[]> {
  const payload = await getPayloadClient();
  const customer = await payload
    .findByID({ collection: "customers", id: customerId, depth: 0 })
    .catch(() => null);
  return (customer?.groups ?? []).map((g) =>
    typeof g === "object" ? g.id : g,
  );
}

/** Checks a code typed in Magic Checkout against the order's bag. */
export async function applyMagicPromotion(
  input: unknown,
): Promise<ApplyPromotionResult> {
  const request = applyPromotionSchema.safeParse(input);
  if (!request.success) return failure("INVALID_PROMOTION", INVALID);
  const { order_id: orderId, razorpay_order_id, code } = request.data;

  // Razorpay calls from its own servers, so limit guesses per order.
  if (!(await rateLimit("coupon", `order:${razorpay_order_id || orderId}`))) {
    return failure(
      "INVALID_PROMOTION",
      "Too many coupon attempts. Please wait a few minutes.",
    );
  }

  const config = razorpayConfig();
  if (!config) return failure("INVALID_PROMOTION", INVALID);
  const order = await findOrder(
    razorpayClient(config),
    orderId,
    razorpay_order_id,
  );
  const lines = order ? decodeCartNotes(order.notes) : null;
  if (!order || !lines) return failure("INVALID_PROMOTION", INVALID);

  const notes = (order.notes ?? {}) as Record<string, unknown>;
  const customerId = Number(notes.customer);
  const signedIn = Number.isInteger(customerId) && customerId > 0;

  const products = new Map(
    await Promise.all(
      [...new Set(lines.map((l) => l.slug))].map(
        async (slug) =>
          [slug, await getProductBySlug(slug, { fresh: true })] as const,
      ),
    ),
  );
  if (lines.some((l) => !products.get(l.slug))) {
    return failure(
      "REQUIREMENT_NOT_MET",
      "An item in your bag is unavailable.",
    );
  }

  const currency = String(order.currency).toUpperCase();
  const result = await checkCouponForLines(
    code,
    lines.map((l) => ({
      productId: Number(products.get(l.slug)!.id),
      unitPrice: l.unitPrice,
      quantity: l.quantity,
    })),
    currency,
    signedIn ? await customerGroups(customerId) : [],
  );
  if (!result.ok) {
    return failure(failureCode(result.message, signedIn), result.message);
  }
  return {
    ok: true,
    body: {
      promotion: {
        reference_id: String(result.promotionId),
        type: "coupon",
        code: result.code,
        value: result.discount,
        value_type: "fixed_amount",
        description: `${formatPrice(result.discount, currency)} off`,
      },
    },
  };
}
