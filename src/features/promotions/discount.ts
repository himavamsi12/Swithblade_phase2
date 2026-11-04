import { formatPriceCompact } from "@/lib/format";
import type { Campaign, Promotion } from "@/payload-types";

/*
 * Decides whether a coupon code applies to a priced bag and how much it takes
 * off, following the rules staff set on the promotion and its campaign in the
 * admin. Pure, so checkout and the bag preview agree on every amount.
 */

/** Razorpay can't charge less than 100 minor units (₹1). */
export const MIN_CHARGE = 100;

export type DiscountLine = {
  productId: number;
  /** Integer minor units. */
  unitPrice: number;
  quantity: number;
};

/** What a coupon needs to know about each product in the bag. */
export type ProductRules = {
  discountable: boolean;
  categoryIds: number[];
  collectionId: number | null;
};

export type CouponContext = {
  now: Date;
  currency: string;
  /** Delivery country, ISO 3166-1 alpha-2. */
  country: string;
  /** The signed-in shopper's groups; empty for guests. */
  customerGroupIds: number[];
};

export type CouponResult =
  | { ok: true; promotionId: number; code: string; discount: number }
  | { ok: false; message: string };

const INVALID = "This coupon code isn't valid.";
const NOT_STARTED = "This coupon isn't active yet.";
const EXPIRED = "This coupon has expired.";
const USED_UP = "This coupon has been fully used.";
const NOT_ELIGIBLE = "This coupon doesn't apply to the items in your bag.";
const UNSUPPORTED = "This coupon can't be used online.";

type Ref = number | { id: number } | null | undefined;
const idOf = (ref: Ref) =>
  ref == null ? null : typeof ref === "object" ? ref.id : ref;
const idsOf = (refs: Ref[] | null | undefined) =>
  (refs ?? []).map(idOf).filter((id): id is number => id !== null);

function windowError(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  now: Date,
) {
  if (startsAt && now < new Date(startsAt)) return NOT_STARTED;
  if (endsAt && now > new Date(endsAt)) return EXPIRED;
  return null;
}

/**
 * The lines the discount is spread over: discountable products only, narrowed
 * to the promotion's products, categories or collections when it targets
 * specific items (a product matching any of them counts).
 */
function eligibleLines(
  promotion: Promotion,
  lines: DiscountLine[],
  products: Map<number, ProductRules>,
) {
  const method = promotion.applicationMethod;
  const targetProducts = new Set(idsOf(method.targetProducts));
  const targetCategories = new Set(idsOf(method.targetCategories));
  const targetCollections = new Set(idsOf(method.targetCollections));
  const targeted =
    method.targetType === "items" &&
    targetProducts.size + targetCategories.size + targetCollections.size > 0;

  return lines.filter((line) => {
    const rules = products.get(line.productId);
    if (!rules?.discountable) return false;
    if (!targeted) return true;
    return (
      targetProducts.has(line.productId) ||
      rules.categoryIds.some((id) => targetCategories.has(id)) ||
      (rules.collectionId !== null && targetCollections.has(rules.collectionId))
    );
  });
}

function discountFor(promotion: Promotion, lines: DiscountLine[]) {
  const method = promotion.applicationMethod;
  // Max discounted quantity caps the units discounted on each line.
  const units = (line: DiscountLine) =>
    method.targetType === "items" && method.maxQuantity
      ? Math.min(line.quantity, method.maxQuantity)
      : line.quantity;

  if (method.type === "percentage") {
    const percent = Math.min(Math.max(method.value, 0), 100);
    return lines.reduce(
      (sum, line) =>
        sum + Math.round((line.unitPrice * units(line) * percent) / 100),
      0,
    );
  }
  const amount = Math.max(Math.round(method.value), 0);
  if (method.targetType === "items" && method.allocation === "each") {
    return lines.reduce(
      (sum, line) => sum + Math.min(amount, line.unitPrice) * units(line),
      0,
    );
  }
  const eligible = lines.reduce(
    (sum, line) => sum + line.unitPrice * units(line),
    0,
  );
  return Math.min(amount, eligible);
}

function campaignError(
  campaign: Campaign | null,
  discount: number,
  context: CouponContext,
) {
  if (!campaign) return null;
  const window = windowError(campaign.startsAt, campaign.endsAt, context.now);
  if (window) return window;
  const { type, limit, used, currency } = campaign.budget ?? {};
  if (limit == null) return null;
  if (type === "usage" && (used ?? 0) >= limit) return USED_UP;
  if (type === "spend") {
    if (currency && currency !== context.currency) return NOT_ELIGIBLE;
    if ((used ?? 0) + discount > limit) return USED_UP;
  }
  return null;
}

/**
 * Applies `promotion` (fetched with its campaign and regions populated) to
 * the bag. `products` maps each line's product id to its discount rules.
 */
export function applyCoupon(
  promotion: Promotion | null,
  lines: DiscountLine[],
  products: Map<number, ProductRules>,
  context: CouponContext,
): CouponResult {
  const fail = (message: string): CouponResult => ({ ok: false, message });
  if (!promotion || promotion.status !== "active") return fail(INVALID);
  const method = promotion.applicationMethod;
  // Shipping is free, and buy X get Y isn't supported online yet.
  if (
    promotion.type !== "standard" ||
    method.targetType === "shipping_methods"
  ) {
    return fail(UNSUPPORTED);
  }

  const window = windowError(promotion.startsAt, promotion.endsAt, context.now);
  if (window) return fail(window);
  if (
    promotion.usageLimit != null &&
    (promotion.usedCount ?? 0) >= promotion.usageLimit
  ) {
    return fail(USED_UP);
  }

  const rules = promotion.rules ?? {};
  const groups = idsOf(rules.customerGroups);
  if (
    groups.length > 0 &&
    !context.customerGroupIds.some((id) => groups.includes(id))
  ) {
    return fail("This coupon isn't available for your account.");
  }
  const regions = (rules.regions ?? []).filter(
    (r): r is Exclude<typeof r, number> => typeof r === "object",
  );
  if (
    (rules.regions ?? []).length > 0 &&
    !regions.some((r) => (r.countries ?? []).includes(context.country as never))
  ) {
    return fail("This coupon isn't available for your delivery address.");
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  if (rules.minSubtotal != null) {
    if (rules.currency && rules.currency !== context.currency) {
      return fail(NOT_ELIGIBLE);
    }
    if (subtotal < rules.minSubtotal) {
      const minimum = formatPriceCompact(rules.minSubtotal, context.currency);
      return fail(`This coupon needs a bag total of at least ${minimum}.`);
    }
  }
  if (
    method.type === "fixed" &&
    method.currency &&
    method.currency !== context.currency
  ) {
    return fail(NOT_ELIGIBLE);
  }

  const raw = discountFor(promotion, eligibleLines(promotion, lines, products));
  const discount = Math.min(raw, Math.max(subtotal - MIN_CHARGE, 0));
  if (discount <= 0) return fail(NOT_ELIGIBLE);

  const campaign =
    typeof promotion.campaign === "object" ? promotion.campaign : null;
  const budget = campaignError(campaign, discount, context);
  if (budget) return fail(budget);

  return {
    ok: true,
    promotionId: promotion.id,
    code: promotion.code,
    discount,
  };
}

/** Codes are saved upper-case (see the Promotions collection). */
export const normalizeCode = (code: string) => code.trim().toUpperCase();
