import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("./after-payment", () => ({ afterOrderRecorded: vi.fn() }));
vi.mock("./razorpay", () => ({
  razorpayConfig: () => ({ keyId: "rzp_test", keySecret: "secret" }),
  webhooksEnabled: () => true,
  isValidWebhook: () => true,
}));
const recordRazorpayPayment = vi.fn();
vi.mock("./repository", () => ({ recordRazorpayPayment }));

const { handleRazorpayWebhook } = await import("./webhook");

const event = (name: string) =>
  JSON.stringify({
    event: name,
    payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } },
  });

describe("handleRazorpayWebhook", () => {
  beforeEach(() => {
    recordRazorpayPayment.mockReset();
  });

  it("ignores payment.failed, so a paid order never goes back to failed", async () => {
    expect(await handleRazorpayWebhook(event("payment.failed"), "sig")).toBe(
      200,
    );
    expect(recordRazorpayPayment).not.toHaveBeenCalled();
  });

  it("answers a repeated event without recording the order again", async () => {
    recordRazorpayPayment
      .mockResolvedValueOnce({
        status: "recorded",
        orderId: 1,
        orderNumber: "#1001",
      })
      .mockResolvedValueOnce({
        status: "duplicate",
        orderId: 1,
        orderNumber: "#1001",
      });
    const { after } = await import("next/server");

    expect(await handleRazorpayWebhook(event("order.paid"), "sig")).toBe(200);
    expect(await handleRazorpayWebhook(event("order.paid"), "sig")).toBe(200);
    // Emails and shipping are queued for the first delivery only.
    expect(after).toHaveBeenCalledTimes(1);
  });
});
