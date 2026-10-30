import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The safety-net job: recovers paid orders nobody recorded, retries failed
 * follow-ups, and emails staff about what's still stuck, once per order.
 */

type Meta = Record<string, unknown>;
let orders: { id: number; displayId: number; metadata: Meta }[];
let payments: { id: string; order_id?: string; status: string }[];

vi.mock("server-only", () => ({}));
vi.mock("@/config/site", () => ({ siteConfig: { name: "Shop" } }));
const recordRazorpayPayment = vi.fn();
const markOrdersAlerted = vi.fn(async (ids: number[], at: Date) => {
  for (const o of orders) {
    if (ids.includes(o.id)) o.metadata.alertedAt = at.toISOString();
  }
});
vi.mock("./repository", () => ({
  listOrdersPlacedBetween: vi.fn(async () => orders),
  markOrdersAlerted,
  recordRazorpayPayment,
}));
const afterOrderRecorded = vi.fn(async () => {});
vi.mock("./after-payment", () => ({ afterOrderRecorded }));
const paymentsAll = vi.fn(async () => ({ items: payments }));
vi.mock("./razorpay", () => ({
  razorpayConfig: () => ({ keyId: "k", keySecret: "s" }),
  razorpayClient: () => ({ payments: { all: paymentsAll } }),
}));
const sendStaffAlert = vi.fn(async () => true);
vi.mock("@/features/notifications/repository", () => ({
  sendStaffAlert,
  orderPlacedEmailPending: (m: Meta) => !m.emailSent,
  orderPlacedEmailError: (m: Meta) => (m.emailSent ? null : "Resend down"),
}));
vi.mock("@/features/shipping/repository", () => ({
  shiprocketPending: (m: Meta) => !m.shipped,
  shiprocketError: (m: Meta) => (m.shipped ? null : "Shiprocket 422"),
}));

const { retryOrderFollowUps } = await import("./retry");

const done = { shipped: true, emailSent: true };

beforeEach(() => {
  vi.resetAllMocks();
  orders = [];
  payments = [];
});

describe("retryOrderFollowUps", () => {
  it("does nothing, and emails nobody, when all is well", async () => {
    orders = [{ id: 1, displayId: 1001, metadata: { ...done } }];
    payments = [{ id: "pay_1", order_id: "order_1", status: "captured" }];
    recordRazorpayPayment.mockResolvedValue({ status: "duplicate" });

    const summary = await retryOrderFollowUps();

    expect(summary).toMatchObject({
      paymentsChecked: 1,
      ordersRecovered: 0,
      followUpsRetried: 0,
      errors: 0,
    });
    expect(afterOrderRecorded).not.toHaveBeenCalled();
    expect(sendStaffAlert).not.toHaveBeenCalled();
  });

  it("recovers a paid order the checkout and webhook both missed", async () => {
    payments = [{ id: "pay_9", order_id: "order_9", status: "captured" }];
    recordRazorpayPayment.mockResolvedValueOnce({
      status: "recorded",
      orderId: 9,
      orderNumber: "SB-1009",
    });

    const summary = await retryOrderFollowUps();

    expect(summary.ordersRecovered).toBe(1);
    expect(afterOrderRecorded).toHaveBeenCalledWith(9);
    // Worth a person checking the webhook setup.
    expect(sendStaffAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: expect.arrayContaining(["SB-1009"]),
      }),
    );
  });

  it("skips payments that weren't completed or aren't shop orders", async () => {
    payments = [
      { id: "pay_1", order_id: "order_1", status: "failed" },
      { id: "pay_2", status: "captured" },
    ];
    await retryOrderFollowUps();
    expect(recordRazorpayPayment).not.toHaveBeenCalled();
  });

  it("retries shipping and email for orders where they failed", async () => {
    orders = [
      { id: 1, displayId: 1001, metadata: { ...done } },
      { id: 2, displayId: 1002, metadata: { emailSent: true } },
    ];
    const summary = await retryOrderFollowUps();
    expect(summary.followUpsRetried).toBe(1);
    expect(afterOrderRecorded).toHaveBeenCalledWith(2);
  });

  it("emails staff about a stuck order once, not every run", async () => {
    orders = [{ id: 2, displayId: 1002, metadata: { emailSent: true } }];

    await retryOrderFollowUps();
    await retryOrderFollowUps();

    expect(sendStaffAlert).toHaveBeenCalledTimes(1);
    expect(sendStaffAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: expect.arrayContaining([
          "SB-1002: Shiprocket failed (Shiprocket 422)",
        ]),
      }),
    );
  });

  it("flags an order that sold out after payment, for a refund", async () => {
    orders = [
      {
        id: 3,
        displayId: 1003,
        metadata: { ...done, oversold: ["Tee (M): 1 sold, 0 were available"] },
      },
    ];
    await retryOrderFollowUps();
    expect(sendStaffAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: expect.arrayContaining([
          "SB-1003: oversold (Tee (M): 1 sold, 0 were available)",
        ]),
      }),
    );
  });

  it("tries the alert again next run if it couldn't be sent", async () => {
    orders = [{ id: 2, displayId: 1002, metadata: { emailSent: true } }];
    sendStaffAlert.mockResolvedValueOnce(false);

    await retryOrderFollowUps();
    expect(markOrdersAlerted).not.toHaveBeenCalled();

    await retryOrderFollowUps();
    expect(sendStaffAlert).toHaveBeenCalledTimes(2);
    expect(markOrdersAlerted).toHaveBeenCalledTimes(1);
  });

  it("keeps going when one payment can't be recorded", async () => {
    payments = [
      { id: "pay_1", order_id: "order_1", status: "captured" },
      { id: "pay_2", order_id: "order_2", status: "authorized" },
    ];
    recordRazorpayPayment
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce({
        status: "recorded",
        orderId: 2,
        orderNumber: "SB-1002",
      });

    const summary = await retryOrderFollowUps();

    expect(summary).toMatchObject({ errors: 1, ordersRecovered: 1 });
  });

  it("reads every page of Razorpay payments", async () => {
    const page = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: `pay_${i}`,
        status: "failed",
      }));
    paymentsAll
      .mockResolvedValueOnce({ items: page(100) })
      .mockResolvedValueOnce({ items: page(30) });

    await retryOrderFollowUps();

    expect(paymentsAll).toHaveBeenCalledTimes(2);
    expect(paymentsAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ skip: 100, count: 100 }),
    );
  });
});
