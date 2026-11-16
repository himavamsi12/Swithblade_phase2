import "server-only";
import type { PricedLine } from "@/features/checkout/pricing";
import { applyCoupon, type CouponResult, type DiscountLine } from "./discount";
import { findPromotionByCode, getProductRules } from "./repository";

/** Checks a coupon code against a bag already priced on the server. */
export async function checkCoupon(
  code: string,
  lines: PricedLine[],
  currency: string,
  customerGroupIds: number[],
): Promise<CouponResult> {
  return checkCouponForLines(
    code,
    lines.map((l) => ({
      productId: Number(l.product.id),
      unitPrice: l.unitPrice,
      quantity: l.quantity,
    })),
    currency,
    customerGroupIds,
  );
}

/**
 * Checks a coupon code against bag lines priced on the server, e.g. the
 * snapshot saved on a Razorpay order when Magic Checkout applies a coupon.
 */
export async function checkCouponForLines(
  code: string,
  lines: DiscountLine[],
  currency: string,
  customerGroupIds: number[],
): Promise<CouponResult> {
  const [promotion, products] = await Promise.all([
    findPromotionByCode(code),
    getProductRules([...new Set(lines.map((l) => l.productId))]),
  ]);
  return applyCoupon(promotion, lines, products, {
    now: new Date(),
    currency,
    // Checkout only delivers in India.
    country: "IN",
    customerGroupIds,
  });
}
