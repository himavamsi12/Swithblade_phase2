import "server-only";
import type { PricedLine } from "@/features/checkout/pricing";
import { applyCoupon, type CouponResult } from "./discount";
import { findPromotionByCode, getProductRules } from "./repository";

/** Checks a coupon code against a bag already priced on the server. */
export async function checkCoupon(
  code: string,
  lines: PricedLine[],
  currency: string,
  customerGroupIds: number[],
): Promise<CouponResult> {
  const discountLines = lines.map((l) => ({
    productId: Number(l.product.id),
    unitPrice: l.unitPrice,
    quantity: l.quantity,
  }));
  const [promotion, products] = await Promise.all([
    findPromotionByCode(code),
    getProductRules([...new Set(discountLines.map((l) => l.productId))]),
  ]);
  return applyCoupon(promotion, discountLines, products, {
    now: new Date(),
    currency,
    // The bag page only delivers in India.
    country: "IN",
    customerGroupIds,
  });
}
