import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/features/catalog/types";

/*
 * Starting checkout and confirming a payment, with the catalog, stock,
 * Razorpay and Shiprocket faked. The server must price the bag itself, hold
 * stock before opening Razorpay, and release it if Razorpay fails.
 */

const product: Product = {
  id: "6",
  slug: "2jz-tee",
  name: "2JZ Tee",
  description: "Heavy cotton tee",
  price: 199900,
  currency: "INR",
  image: "/red.png",
  inStock: true,
  collections: [],
  gallery: [],
  colors: [],
  sizes: [{ label: "M", available: true }],
} as unknown as Product;

const cookieJar = new Map<string, string>();
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined,
    set: (name: string, value: string) => cookieJar.set(name, value),
  }),
}));
vi.mock("next/server", () => ({ after: vi.fn() }));

let session: { customer: { id: number } } | null = null;
vi.mock("@/features/account/customer", () => ({
  getSignedInCustomer: async () => session,
}));
const getProductBySlug = vi.fn(async (): Promise<Product | null> => product);
vi.mock("@/features/catalog/repository", () => ({ getProductBySlug }));
const checkCoupon = vi.fn();
vi.mock("@/features/promotions/coupon", () => ({ checkCoupon }));
const holdStock = vi.fn();
const attachHolds = vi.fn(async () => {});
const releaseHolds = vi.fn(async () => {});
vi.mock("@/features/stock/repository", () => ({
  holdStock,
  attachHolds,
  releaseHolds,
}));
let storeStatus = { open: true, message: "" };
vi.mock("@/features/store/repository", () => ({
  getCheckoutStatus: async () => storeStatus,
}));
let shippingOn = false;
const isServiceable = vi.fn(async () => true);
vi.mock("@/features/shipping/shiprocket", () => ({
  shiprocketEnabled: () => shippingOn,
  isServiceable,
}));
let allowed = true;
vi.mock("@/lib/rate-limit", () => ({
  clientIp: async () => "203.0.113.5",
  rateLimit: vi.fn(async () => allowed),
}));
let configured = true;
let signatureOk = true;
const ordersCreate = vi.fn();
vi.mock("./razorpay", () => ({
  razorpayConfig: () =>
    configured ? { keyId: "rzp_test_key", keySecret: "secret" } : null,
  razorpayClient: () => ({ orders: { create: ordersCreate } }),
  isValidPaymentSignature: () => signatureOk,
}));
vi.mock("./after-payment", () => ({ afterOrderRecorded: vi.fn() }));
const recordRazorpayPayment = vi.fn();
vi.mock("./repository", () => ({ recordRazorpayPayment }));

const { createCheckout, previewCoupon, verifyPayment } =
  await import("./actions");

const bag = [
  {
    slug: "2jz-tee",
    color: null,
    size: "M",
    quantity: 2,
    price: 199900,
    currency: "INR",
  },
];
const address = {
  email: "Asha@Example.com",
  fullName: "Asha Rao",
  phone: "+91 98765 43210",
  addressLine1: "12 MG Road",
  addressLine2: "",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
};

beforeEach(() => {
  vi.resetAllMocks();
  cookieJar.clear();
  session = null;
  storeStatus = { open: true, message: "" };
  shippingOn = false;
  allowed = true;
  configured = true;
  signatureOk = true;
  getProductBySlug.mockResolvedValue(product);
  holdStock.mockResolvedValue({ ok: true, checkout: "hold_1" });
  ordersCreate.mockResolvedValue({
    id: "order_1",
    amount: 399800,
    currency: "INR",
  });
});

describe("previewCoupon", () => {
  it("shows the discount and new total for the bag", async () => {
    checkCoupon.mockResolvedValue({
      ok: true,
      promotionId: 7,
      code: "SAVE10",
      discount: 39980,
    });
    expect(await previewCoupon(bag, "save10")).toEqual({
      status: "ok",
      code: "SAVE10",
      discount: 39980,
      total: 359820,
    });
  });

  it("passes on why a code doesn't apply", async () => {
    checkCoupon.mockResolvedValue({
      ok: false,
      message: "This coupon code isn't valid.",
    });
    expect(await previewCoupon(bag, "NOPE")).toEqual({
      status: "error",
      message: "This coupon code isn't valid.",
    });
  });

  it("is rate limited, so codes can't be guessed", async () => {
    allowed = false;
    expect(await previewCoupon(bag, "SAVE10")).toMatchObject({
      status: "error",
      message: "Too many coupon attempts. Please wait a few minutes.",
    });
    expect(checkCoupon).not.toHaveBeenCalled();
  });

  it("asks for a code when the box is empty", async () => {
    expect(await previewCoupon(bag, "  ")).toEqual({
      status: "error",
      message: "Enter a coupon code.",
    });
  });
});

describe("createCheckout", () => {
  it("prices the bag on the server, holds stock and opens a Razorpay order", async () => {
    const result = await createCheckout(bag, address);

    expect(result).toMatchObject({
      status: "ok",
      keyId: "rzp_test_key",
      orderId: "order_1",
      amount: 399800,
      prefill: {
        name: "Asha Rao",
        email: "asha@example.com",
        contact: "9876543210",
      },
    });
    const order = ordersCreate.mock.calls[0]![0];
    expect(order.amount).toBe(399800);
    expect(order.currency).toBe("INR");
    expect(order.notes).toMatchObject({
      email: "asha@example.com",
      cart0: JSON.stringify([["2jz-tee", null, "M", 2, 199900]]),
    });
    expect(holdStock).toHaveBeenCalledWith(
      [
        {
          slug: "2jz-tee",
          name: "2JZ Tee",
          color: null,
          size: "M",
          quantity: 2,
        },
      ],
      expect.stringMatching(/^guest:[0-9a-f-]{36}$/),
    );
    expect(attachHolds).toHaveBeenCalledWith("hold_1", "order_1");
  });

  it("charges the bag less the coupon, checked again on the server", async () => {
    checkCoupon.mockResolvedValue({
      ok: true,
      promotionId: 7,
      code: "SAVE10",
      discount: 39980,
    });
    session = { customer: { id: 42, groups: [4] } } as never;
    const result = await createCheckout(bag, address, " save10 ");

    expect(checkCoupon).toHaveBeenCalledWith(
      "save10",
      [expect.objectContaining({ unitPrice: 199900, quantity: 2 })],
      "INR",
      [4],
    );
    const order = ordersCreate.mock.calls[0]![0];
    expect(order.amount).toBe(359820);
    expect(order.notes.promotion).toBe("7");
    expect(result).toMatchObject({ status: "ok" });
  });

  it("refuses to open checkout when the coupon no longer applies", async () => {
    checkCoupon.mockResolvedValue({
      ok: false,
      message: "This coupon has been fully used.",
    });
    const result = await createCheckout(bag, address, "SAVE10");

    expect(result).toEqual({
      status: "error",
      message: "This coupon has been fully used.",
      couponRejected: true,
    });
    expect(holdStock).not.toHaveBeenCalled();
    expect(ordersCreate).not.toHaveBeenCalled();
  });

  it("charges the full price without a coupon", async () => {
    await createCheckout(bag, address, null);
    expect(checkCoupon).not.toHaveBeenCalled();
    expect(ordersCreate.mock.calls[0]![0].notes.promotion).toBeUndefined();
  });

  it("charges the catalog price, not a price sent by the browser", async () => {
    const tampered = [{ ...bag[0]!, price: 100 }];
    const result = await createCheckout(tampered, address);

    expect(result).toMatchObject({
      status: "error",
      message: "Prices in your bag have changed. Please review your total.",
      repriced: [{ slug: "2jz-tee", price: 199900, currency: "INR" }],
    });
    expect(ordersCreate).not.toHaveBeenCalled();
  });

  it("holds stock for the signed-in account, not the browser", async () => {
    session = { customer: { id: 42 } };
    await createCheckout(bag, address);

    expect(holdStock).toHaveBeenCalledWith(expect.anything(), "customer:42");
    expect(ordersCreate.mock.calls[0]![0].notes.customer).toBe("42");
  });

  it("reuses the browser's checkout id, so a second try replaces its hold", async () => {
    await createCheckout(bag, address);
    await createCheckout(bag, address);
    const [first, second] = holdStock.mock.calls.map((c) => c[1]);
    expect(second).toBe(first);
  });

  it("returns per-field errors for a bad address", async () => {
    const result = await createCheckout(bag, {
      ...address,
      phone: "9999999999",
      pincode: "12",
    });

    expect(result).toMatchObject({
      status: "error",
      message: "Please check your delivery address.",
      fieldErrors: {
        phone: "Enter a 10-digit Indian mobile number.",
        pincode: "Enter a 6-digit PIN code.",
      },
    });
    expect(holdStock).not.toHaveBeenCalled();
  });

  it.each([
    ["an empty bag", [], "Your bag is empty."],
    [
      "a quantity of 0",
      [{ ...bag[0]!, quantity: 0 }],
      "Your bag couldn't be read.",
    ],
    [
      "a fractional price",
      [{ ...bag[0]!, price: 1.5 }],
      "Your bag couldn't be read.",
    ],
    ["something that isn't a bag", "drop table", "Your bag couldn't be read."],
  ])("refuses %s", async (_, items, message) => {
    const result = await createCheckout(items, address);
    expect(result).toMatchObject({ status: "error", message });
    expect(ordersCreate).not.toHaveBeenCalled();
  });

  it("refuses a product that's gone", async () => {
    getProductBySlug.mockResolvedValueOnce(null);
    const result = await createCheckout(bag, address);
    expect(result).toMatchObject({
      status: "error",
      message: "An item in your bag is unavailable.",
    });
  });

  it("passes on the stock message when someone else holds the last one", async () => {
    holdStock.mockResolvedValueOnce({
      ok: false,
      message: "2JZ Tee (M) is in someone else's checkout right now.",
    });
    const result = await createCheckout(bag, address);
    expect(result).toMatchObject({
      status: "error",
      message: "2JZ Tee (M) is in someone else's checkout right now.",
    });
    expect(ordersCreate).not.toHaveBeenCalled();
  });

  it("releases the hold when Razorpay won't create the order", async () => {
    ordersCreate.mockRejectedValueOnce(new Error("Razorpay 503"));
    const result = await createCheckout(bag, address);

    expect(result).toMatchObject({
      status: "error",
      message: "Couldn't start checkout. Please try again.",
    });
    expect(releaseHolds).toHaveBeenCalledWith("hold_1");
  });

  it("says try again when holding stock fails outright", async () => {
    holdStock.mockRejectedValueOnce(new Error("db timeout"));
    const result = await createCheckout(bag, address);
    expect(result).toMatchObject({
      status: "error",
      message: "Couldn't start checkout. Please try again.",
    });
    expect(ordersCreate).not.toHaveBeenCalled();
  });

  it("stops while the store is closed", async () => {
    storeStatus = { open: false, message: "We're closed for a stock-take." };
    const result = await createCheckout(bag, address);
    expect(result).toEqual({
      status: "error",
      message: "We're closed for a stock-take.",
    });
  });

  it("stops while Razorpay isn't set up", async () => {
    configured = false;
    const result = await createCheckout(bag, address);
    expect(result).toEqual({
      status: "error",
      message: "Checkout isn't available yet.",
    });
  });

  it("slows down a shopper making too many attempts", async () => {
    allowed = false;
    const result = await createCheckout(bag, address);
    expect(result).toMatchObject({
      status: "error",
      message: "Too many checkout attempts. Please wait a few minutes.",
    });
  });

  it("refuses a PIN code no courier serves", async () => {
    shippingOn = true;
    isServiceable.mockResolvedValueOnce(false);
    const result = await createCheckout(bag, address);
    expect(result).toMatchObject({
      status: "error",
      fieldErrors: { pincode: "We don't deliver here yet." },
    });
  });

  it("asks to retry when the delivery check itself fails", async () => {
    shippingOn = true;
    isServiceable.mockRejectedValueOnce(new Error("Shiprocket 500"));
    const result = await createCheckout(bag, address);
    expect(result).toMatchObject({
      status: "error",
      message: "Couldn't check delivery to your PIN code. Please try again.",
    });
    expect(holdStock).not.toHaveBeenCalled();
  });
});

describe("verifyPayment", () => {
  const callback = {
    orderId: "order_1",
    paymentId: "pay_1",
    signature: "sig",
  };

  it("saves the order once Razorpay's signature checks out", async () => {
    recordRazorpayPayment.mockResolvedValueOnce({
      status: "recorded",
      orderId: 16,
      orderNumber: "SB-1010",
    });
    const { after } = await import("next/server");

    expect(await verifyPayment(callback)).toEqual({
      status: "ok",
      orderId: 16,
      orderNumber: "SB-1010",
    });
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("confirms an order the webhook already saved, without redoing follow-ups", async () => {
    recordRazorpayPayment.mockResolvedValueOnce({
      status: "duplicate",
      orderId: 16,
      orderNumber: "SB-1010",
    });
    const { after } = await import("next/server");

    expect((await verifyPayment(callback)).status).toBe("ok");
    expect(after).not.toHaveBeenCalled();
  });

  it("never trusts a callback with a forged signature", async () => {
    signatureOk = false;
    const result = await verifyPayment(callback);
    expect(result.status).toBe("error");
    expect(recordRazorpayPayment).not.toHaveBeenCalled();
  });

  it("refuses a malformed callback", async () => {
    const result = await verifyPayment({ orderId: "", paymentId: 5 });
    expect(result.status).toBe("error");
    expect(recordRazorpayPayment).not.toHaveBeenCalled();
  });

  it("reports an error, without throwing, when saving fails", async () => {
    recordRazorpayPayment.mockRejectedValueOnce(new Error("db down"));
    const result = await verifyPayment(callback);
    expect(result).toEqual({
      status: "error",
      message: "We couldn't confirm your payment. Contact support if charged.",
    });
  });

  it("reports a payment Razorpay says wasn't made", async () => {
    recordRazorpayPayment.mockResolvedValueOnce({
      status: "rejected",
      reason: "Payment is failed",
    });
    expect((await verifyPayment(callback)).status).toBe("error");
  });
});
