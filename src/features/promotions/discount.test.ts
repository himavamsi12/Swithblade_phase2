import { describe, expect, it } from "vitest";
import type { Campaign, Promotion } from "@/payload-types";
import {
  applyCoupon,
  normalizeCode,
  type CouponContext,
  type DiscountLine,
  type ProductRules,
} from "./discount";

/*
 * Coupon rules as staff set them in the admin: what a code takes off a bag,
 * and every reason it's refused.
 */

const promotion = (
  overrides: Partial<Promotion> = {},
  method: Partial<Promotion["applicationMethod"]> = {},
): Promotion =>
  ({
    id: 7,
    code: "SAVE10",
    type: "standard",
    status: "active",
    usedCount: 0,
    applicationMethod: {
      type: "percentage",
      value: 10,
      targetType: "order",
      ...method,
    },
    rules: {},
    ...overrides,
  }) as Promotion;

const campaign = (overrides: Partial<Campaign> = {}): Campaign =>
  ({ id: 3, name: "Diwali", identifier: "diwali", ...overrides }) as Campaign;

// Two tees at ₹1,000 and one jacket at ₹3,000.
const lines: DiscountLine[] = [
  { productId: 1, unitPrice: 100000, quantity: 2 },
  { productId: 2, unitPrice: 300000, quantity: 1 },
];

const rules = (
  overrides: Record<number, Partial<ProductRules>> = {},
): Map<number, ProductRules> =>
  new Map(
    [1, 2].map((id) => [
      id,
      {
        discountable: true,
        categoryIds: id === 1 ? [11] : [22],
        collectionId: id === 1 ? 31 : null,
        ...overrides[id],
      },
    ]),
  );

const context: CouponContext = {
  now: new Date("2026-11-04T10:00:00Z"),
  currency: "INR",
  country: "IN",
  customerGroupIds: [],
};

const discountOf = (
  p: Promotion | null,
  products = rules(),
  ctx = context,
  bag = lines,
) => applyCoupon(p, bag, products, ctx);

describe("applyCoupon", () => {
  it("takes a percentage off the whole bag", () => {
    expect(discountOf(promotion())).toEqual({
      ok: true,
      promotionId: 7,
      code: "SAVE10",
      discount: 50000,
    });
  });

  it("takes a fixed amount off the bag, never more than it costs", () => {
    const fixed = promotion({}, { type: "fixed", value: 20000 });
    expect(discountOf(fixed)).toMatchObject({ ok: true, discount: 20000 });
  });

  it("skips products that aren't discountable", () => {
    const result = discountOf(
      promotion(),
      rules({ 2: { discountable: false } }),
    );
    expect(result).toMatchObject({ ok: true, discount: 20000 });
  });

  it("refuses a bag with nothing discountable", () => {
    const none = rules({
      1: { discountable: false },
      2: { discountable: false },
    });
    expect(discountOf(promotion(), none)).toMatchObject({ ok: false });
  });

  describe("specific items", () => {
    const items = (method: Partial<Promotion["applicationMethod"]>) =>
      promotion({}, { targetType: "items", ...method });

    it("discounts only the chosen products", () => {
      expect(discountOf(items({ targetProducts: [2] }))).toMatchObject({
        discount: 30000,
      });
    });

    it("matches by category or collection too", () => {
      expect(discountOf(items({ targetCategories: [22] }))).toMatchObject({
        discount: 30000,
      });
      expect(discountOf(items({ targetCollections: [31] }))).toMatchObject({
        discount: 20000,
      });
    });

    it("spreads a fixed amount across the items", () => {
      const across = items({
        type: "fixed",
        value: 20000,
        allocation: "across",
      });
      expect(discountOf(across)).toMatchObject({ discount: 20000 });
    });

    it("takes a fixed amount off each item", () => {
      const each = items({ type: "fixed", value: 20000, allocation: "each" });
      expect(discountOf(each)).toMatchObject({ discount: 60000 });
    });

    it("caps the units discounted on each line", () => {
      const capped = items({ value: 50, maxQuantity: 1, targetProducts: [1] });
      expect(discountOf(capped)).toMatchObject({ discount: 50000 });
    });

    it("refuses a bag without the chosen products", () => {
      expect(discountOf(items({ targetProducts: [99] }))).toEqual({
        ok: false,
        message: "This coupon doesn't apply to the items in your bag.",
      });
    });
  });

  it("refuses unknown, draft and inactive codes", () => {
    expect(discountOf(null)).toMatchObject({ ok: false });
    expect(discountOf(promotion({ status: "draft" }))).toMatchObject({
      ok: false,
      message: "This coupon code isn't valid.",
    });
    expect(discountOf(promotion({ status: "inactive" }))).toMatchObject({
      ok: false,
    });
  });

  it("refuses buy X get Y and shipping coupons", () => {
    const message = "This coupon can't be used online.";
    expect(discountOf(promotion({ type: "buyget" }))).toEqual({
      ok: false,
      message,
    });
    expect(
      discountOf(promotion({}, { targetType: "shipping_methods" })),
    ).toEqual({ ok: false, message });
  });

  it("only works between its start and end dates", () => {
    expect(
      discountOf(promotion({ startsAt: "2026-11-05T00:00:00Z" })),
    ).toMatchObject({ message: "This coupon isn't active yet." });
    expect(
      discountOf(promotion({ endsAt: "2026-11-03T00:00:00Z" })),
    ).toMatchObject({ message: "This coupon has expired." });
  });

  it("stops at its usage limit", () => {
    expect(
      discountOf(promotion({ usageLimit: 5, usedCount: 5 })),
    ).toMatchObject({ message: "This coupon has been fully used." });
    expect(
      discountOf(promotion({ usageLimit: 5, usedCount: 4 })),
    ).toMatchObject({ ok: true });
  });

  it("needs the minimum bag total", () => {
    const min = (minSubtotal: number) =>
      promotion({ rules: { minSubtotal, currency: "INR" } });
    expect(discountOf(min(600000))).toEqual({
      ok: false,
      message: "This coupon needs a bag total of at least ₹6,000.",
    });
    expect(discountOf(min(500000))).toMatchObject({ ok: true });
  });

  it("only works for the chosen customer groups", () => {
    const vip = promotion({ rules: { customerGroups: [4] } });
    expect(discountOf(vip)).toMatchObject({
      message: "This coupon isn't available for your account.",
    });
    expect(
      discountOf(vip, rules(), { ...context, customerGroupIds: [4] }),
    ).toMatchObject({ ok: true });
  });

  it("only works in the chosen regions", () => {
    const region = (countries: string[]) =>
      promotion({ rules: { regions: [{ id: 1, countries } as never] } });
    expect(discountOf(region(["US"]))).toMatchObject({
      message: "This coupon isn't available for your delivery address.",
    });
    expect(discountOf(region(["IN"]))).toMatchObject({ ok: true });
  });

  it("refuses a fixed amount in another currency", () => {
    const usd = promotion({}, { type: "fixed", value: 500, currency: "USD" });
    expect(discountOf(usd)).toMatchObject({ ok: false });
  });

  it("always leaves the minimum Razorpay charge", () => {
    const all = promotion({}, { value: 100 });
    expect(discountOf(all)).toMatchObject({ discount: 500000 - 100 });
  });

  describe("campaign", () => {
    const inCampaign = (c: Partial<Campaign>) =>
      promotion({ campaign: campaign(c) });

    it("follows the campaign's dates", () => {
      expect(
        discountOf(inCampaign({ endsAt: "2026-11-01T00:00:00Z" })),
      ).toMatchObject({ message: "This coupon has expired." });
    });

    it("stops once the campaign's uses run out", () => {
      const budget = { type: "usage" as const, limit: 10, used: 10 };
      expect(discountOf(inCampaign({ budget }))).toMatchObject({
        message: "This coupon has been fully used.",
      });
    });

    it("stops once the discount would pass the spend budget", () => {
      const budget = (used: number) => ({
        type: "spend" as const,
        currency: "INR" as const,
        limit: 100000,
        used,
      });
      expect(discountOf(inCampaign({ budget: budget(60000) }))).toMatchObject({
        message: "This coupon has been fully used.",
      });
      expect(discountOf(inCampaign({ budget: budget(50000) }))).toMatchObject({
        ok: true,
        discount: 50000,
      });
    });
  });
});

describe("normalizeCode", () => {
  it("matches how codes are saved", () => {
    expect(normalizeCode("  save10 ")).toBe("SAVE10");
  });
});
