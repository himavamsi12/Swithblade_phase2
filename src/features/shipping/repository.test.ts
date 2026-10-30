import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeOrders } from "@/test/fake-orders";

/*
 * Handing paid orders to Shiprocket: sent once, failures noted on the order
 * for the retry job, and never an error that could touch a paid order.
 */

const mocks = vi.hoisted(() => ({
  enabled: true,
  createOrder: vi.fn(),
  toShiprocketOrder: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/features/account/customer", async () => {
  const { fakeOrders } = await import("@/test/fake-orders");
  return { getPayloadClient: async () => fakeOrders.payload };
});
vi.mock("./shiprocket", () => ({
  shiprocketEnabled: () => mocks.enabled,
  createOrder: mocks.createOrder,
}));
vi.mock("./shiprocket-order", () => ({
  toShiprocketOrder: mocks.toShiprocketOrder,
}));

const { sendOrderToShiprocket, shiprocketPending, shiprocketError } =
  await import("./repository");

const { createOrder, toShiprocketOrder } = mocks;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.enabled = true;
  fakeOrders.set({ id: 7, metadata: { razorpay: { method: "upi" } } });
  toShiprocketOrder.mockReturnValue({ ok: true, order: { order_id: "1007" } });
  createOrder.mockResolvedValue({ orderId: "SR1", shipmentId: "SH1" });
});

describe("sendOrderToShiprocket", () => {
  it("creates the Shiprocket order and notes its ids, keeping other metadata", async () => {
    await sendOrderToShiprocket(7);

    expect(createOrder).toHaveBeenCalledWith({ order_id: "1007" });
    expect(fakeOrders.order.metadata).toMatchObject({
      razorpay: { method: "upi" },
      shiprocket: { orderId: "SR1", shipmentId: "SH1", at: expect.any(String) },
    });
    expect(shiprocketPending(fakeOrders.order.metadata)).toBe(false);
  });

  it("keeps results other follow-ups wrote while Shiprocket was answering", async () => {
    createOrder.mockImplementationOnce(async () => {
      // The confirmation email finishes during the Shiprocket call.
      fakeOrders.set({
        ...fakeOrders.order,
        metadata: {
          ...fakeOrders.order.metadata,
          notifications: { orderPlaced: { email: { sentAt: "now" } } },
        },
      });
      return { orderId: "SR1", shipmentId: "SH1" };
    });

    await sendOrderToShiprocket(7);

    expect(fakeOrders.order.metadata).toMatchObject({
      razorpay: { method: "upi" },
      notifications: { orderPlaced: { email: { sentAt: "now" } } },
      shiprocket: { orderId: "SR1" },
    });
  });

  it("never sends an order twice", async () => {
    await sendOrderToShiprocket(7);
    await sendOrderToShiprocket(7);
    expect(createOrder).toHaveBeenCalledTimes(1);
  });

  it("notes Shiprocket's error so the retry job tries again", async () => {
    createOrder.mockRejectedValueOnce(
      new Error("Phone number is in invalid format"),
    );

    await expect(sendOrderToShiprocket(7)).resolves.toBeUndefined();

    expect(shiprocketPending(fakeOrders.order.metadata)).toBe(true);
    expect(shiprocketError(fakeOrders.order.metadata)).toBe(
      "Phone number is in invalid format",
    );

    await sendOrderToShiprocket(7);
    expect(createOrder).toHaveBeenCalledTimes(2);
    expect(shiprocketPending(fakeOrders.order.metadata)).toBe(false);
  });

  it("notes why an order can't be shipped without calling Shiprocket", async () => {
    toShiprocketOrder.mockReturnValueOnce({
      ok: false,
      reason: "Order has no valid Indian mobile number",
    });

    await sendOrderToShiprocket(7);

    expect(createOrder).not.toHaveBeenCalled();
    expect(shiprocketError(fakeOrders.order.metadata)).toBe(
      "Order has no valid Indian mobile number",
    );
  });

  it("swallows a database outage rather than failing the caller", async () => {
    fakeOrders.payload.findByID.mockRejectedValueOnce(new Error("db down"));
    await expect(sendOrderToShiprocket(7)).resolves.toBeUndefined();
  });

  it("does nothing while Shiprocket isn't set up", async () => {
    mocks.enabled = false;
    await sendOrderToShiprocket(7);
    expect(fakeOrders.payload.findByID).not.toHaveBeenCalled();
    expect(shiprocketPending({})).toBe(false);
  });
});
