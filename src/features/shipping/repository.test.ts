import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Handing paid orders to Shiprocket: sent once, failures noted on the order
 * for the retry job, and never an error that could touch a paid order.
 */

let order: { id: number; metadata: Record<string, unknown> | null };
const payload = {
  findByID: vi.fn(async () => structuredClone(order)),
  update: vi.fn(
    async ({ data }: { data: { metadata: Record<string, unknown> } }) => {
      order.metadata = data.metadata;
    },
  ),
};

let enabled = true;
const createOrder = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/features/account/customer", () => ({
  getPayloadClient: async () => payload,
}));
vi.mock("./shiprocket", () => ({
  shiprocketEnabled: () => enabled,
  createOrder,
}));
const toShiprocketOrder = vi.fn();
vi.mock("./shiprocket-order", () => ({ toShiprocketOrder }));

const { sendOrderToShiprocket, shiprocketPending, shiprocketError } =
  await import("./repository");

beforeEach(() => {
  vi.clearAllMocks();
  enabled = true;
  order = { id: 7, metadata: { razorpay: { method: "upi" } } };
  toShiprocketOrder.mockReturnValue({ ok: true, order: { order_id: "1007" } });
  createOrder.mockResolvedValue({ orderId: "SR1", shipmentId: "SH1" });
});

describe("sendOrderToShiprocket", () => {
  it("creates the Shiprocket order and notes its ids, keeping other metadata", async () => {
    await sendOrderToShiprocket(7);

    expect(createOrder).toHaveBeenCalledWith({ order_id: "1007" });
    expect(order.metadata).toMatchObject({
      razorpay: { method: "upi" },
      shiprocket: { orderId: "SR1", shipmentId: "SH1", at: expect.any(String) },
    });
    expect(shiprocketPending(order.metadata)).toBe(false);
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

    expect(shiprocketPending(order.metadata)).toBe(true);
    expect(shiprocketError(order.metadata)).toBe(
      "Phone number is in invalid format",
    );

    await sendOrderToShiprocket(7);
    expect(createOrder).toHaveBeenCalledTimes(2);
    expect(shiprocketPending(order.metadata)).toBe(false);
  });

  it("notes why an order can't be shipped without calling Shiprocket", async () => {
    toShiprocketOrder.mockReturnValueOnce({
      ok: false,
      reason: "Order has no valid Indian mobile number",
    });

    await sendOrderToShiprocket(7);

    expect(createOrder).not.toHaveBeenCalled();
    expect(shiprocketError(order.metadata)).toBe(
      "Order has no valid Indian mobile number",
    );
  });

  it("swallows a database outage rather than failing the caller", async () => {
    payload.findByID.mockRejectedValueOnce(new Error("db down"));
    await expect(sendOrderToShiprocket(7)).resolves.toBeUndefined();
  });

  it("does nothing while Shiprocket isn't set up", async () => {
    enabled = false;
    await sendOrderToShiprocket(7);
    expect(payload.findByID).not.toHaveBeenCalled();
    expect(shiprocketPending({})).toBe(false);
  });
});
