import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeCartNotes } from "./pricing";

/*
 * A coupon typed in Razorpay's Magic Checkout window: found by the order's
 * receipt, checked against the store's coupons for the bag saved on that
 * Razorpay order, and answered in Razorpay's format.
 */

const m = vi.hoisted(() => ({
  ordersAll: vi.fn(),
  checkCouponForLines: vi.fn(),
  getProductBySlug: vi.fn(),
  findByID: vi.fn(),
  allowed: true,
}));

vi.mock("server-only", () => ({}));
vi.mock("./razorpay", () => ({
  razorpayConfig: () => ({ keyId: "rzp_live", keySecret: "secret" }),
  razorpayClient: () => ({ orders: { all: m.ordersAll } }),
}));
vi.mock("@/features/promotions/coupon", () => ({
  checkCouponForLines: m.checkCouponForLines,
}));
vi.mock("@/features/catalog/repository", () => ({
  getProductBySlug: m.getProductBySlug,
}));
vi.mock("@/features/account/customer", () => ({
  getPayloadClient: async () => ({ findByID: m.findByID }),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async () => m.allowed,
}));

const { applyMagicPromotion } = await import("./magic-promotions");

const RECEIPT = "sb_1763280000000_1a2b3c4d";
const cartNotes = encodeCartNotes([
  {
    product: { slug: "star-tee", id: "11" },
    color: "Black",
    size: "M",
    quantity: 2,
    unitPrice: 199900,
  },
] as never)!;

const request = (extra: object = {}) => ({
  order_id: RECEIPT,
  code: "save10",
  contact: "+919876543210",
  email: "asha@example.com",
  ...extra,
});

beforeEach(() => {
  vi.resetAllMocks();
  m.allowed = true;
  m.ordersAll.mockResolvedValue({
    items: [{ id: "order_1", currency: "INR", notes: { ...cartNotes } }],
  });
  m.getProductBySlug.mockResolvedValue({ id: "11", slug: "star-tee" });
  m.checkCouponForLines.mockResolvedValue({
    ok: true,
    promotionId: 7,
    code: "SAVE10",
    discount: 39980,
  });
});

describe("applyMagicPromotion", () => {
  it("checks the code against the order's bag and returns the discount", async () => {
    const result = await applyMagicPromotion(request());

    expect(m.ordersAll).toHaveBeenCalledWith({ receipt: RECEIPT, count: 1 });
    expect(m.checkCouponForLines).toHaveBeenCalledWith(
      "save10",
      [{ productId: 11, unitPrice: 199900, quantity: 2 }],
      "INR",
      [],
    );
    expect(result).toEqual({
      ok: true,
      body: {
        promotion: {
          reference_id: "7",
          type: "coupon",
          code: "SAVE10",
          value: 39980,
          value_type: "fixed_amount",
          description: expect.stringContaining("off"),
        },
      },
    });
  });

  it("uses the signed-in shopper's customer groups", async () => {
    m.ordersAll.mockResolvedValue({
      items: [
        {
          id: "order_1",
          currency: "INR",
          notes: { ...cartNotes, customer: "42" },
        },
      ],
    });
    m.findByID.mockResolvedValue({ id: 42, groups: [4, { id: 5 }] });
    await applyMagicPromotion(request());

    expect(m.checkCouponForLines).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "INR",
      [4, 5],
    );
  });

  it.each([
    ["This coupon has expired.", false, "INVALID_PROMOTION"],
    ["This coupon code isn't valid.", false, "INVALID_PROMOTION"],
    [
      "This coupon needs a bag total of at least ₹2,000.",
      false,
      "REQUIREMENT_NOT_MET",
    ],
    [
      "This coupon doesn't apply to the items in your bag.",
      false,
      "REQUIREMENT_NOT_MET",
    ],
    ["This coupon isn't available for your account.", false, "LOGIN_REQUIRED"],
    [
      "This coupon isn't available for your account.",
      true,
      "REQUIREMENT_NOT_MET",
    ],
  ])("answers %s (signed in: %s) with %s", async (message, signedIn, code) => {
    if (signedIn) {
      m.ordersAll.mockResolvedValue({
        items: [
          {
            id: "order_1",
            currency: "INR",
            notes: { ...cartNotes, customer: "42" },
          },
        ],
      });
      m.findByID.mockResolvedValue({ id: 42, groups: [] });
    }
    m.checkCouponForLines.mockResolvedValue({ ok: false, message });

    expect(await applyMagicPromotion(request())).toEqual({
      ok: false,
      body: { failure_code: code, failure_reason: message },
    });
  });

  it("refuses a receipt that isn't from our checkout, without asking Razorpay", async () => {
    const result = await applyMagicPromotion(request({ order_id: "order_1" }));
    expect(result).toMatchObject({
      ok: false,
      body: { failure_code: "INVALID_PROMOTION" },
    });
    expect(m.ordersAll).not.toHaveBeenCalled();
  });

  it("refuses an order Razorpay doesn't know or without a bag", async () => {
    m.ordersAll.mockResolvedValueOnce({ items: [] });
    expect((await applyMagicPromotion(request())).ok).toBe(false);

    m.ordersAll.mockResolvedValueOnce({
      items: [{ id: "order_1", currency: "INR", notes: {} }],
    });
    expect((await applyMagicPromotion(request())).ok).toBe(false);
    expect(m.checkCouponForLines).not.toHaveBeenCalled();
  });

  it("slows down guessing codes on one order", async () => {
    m.allowed = false;
    const result = await applyMagicPromotion(request());
    expect(result).toMatchObject({
      ok: false,
      body: { failure_reason: expect.stringContaining("Too many") },
    });
    expect(m.ordersAll).not.toHaveBeenCalled();
  });
});
