import type { PayloadRequest } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Creating Shiprocket return orders from the admin: sent once, only once
 * staff approve the return, failures noted, and never an error that stops a save.
 */

const mocks = vi.hoisted(() => ({
  enabled: true,
  createReturnOrder: vi.fn(),
  toShiprocketReturn: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/features/account/customer", () => ({ getPayloadClient: vi.fn() }));
vi.mock("./shiprocket", () => ({
  shiprocketEnabled: () => mocks.enabled,
  createOrder: vi.fn(),
  createReturnOrder: mocks.createReturnOrder,
}));
vi.mock("./shiprocket-return", async (original) => ({
  ...(await original<typeof import("./shiprocket-return")>()),
  toShiprocketReturn: mocks.toShiprocketReturn,
}));

const { sendReturnToShiprocket, SHIPROCKET_RETURN_CONTEXT } =
  await import("./repository");
const { createReturnOrder, toShiprocketReturn } = mocks;

let stored: Record<string, unknown>;
const payload = {
  findByID: vi.fn(async () => structuredClone(stored)),
  update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    stored = { ...stored, ...structuredClone(data) };
    return stored;
  }),
};
const req = { payload } as unknown as PayloadRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enabled = true;
  stored = {
    id: 3,
    status: "approved",
    order: { id: 7 },
    metadata: { note: "keep" },
  };
  toShiprocketReturn.mockReturnValue({
    ok: true,
    order: { order_id: "1007-R3" },
  });
  createReturnOrder.mockResolvedValue({ orderId: "SR9", shipmentId: "SH9" });
});

describe("sendReturnToShiprocket", () => {
  it("creates the return order and notes its ids, keeping other metadata", async () => {
    const metadata = await sendReturnToShiprocket(3, req);

    expect(createReturnOrder).toHaveBeenCalledWith({ order_id: "1007-R3" });
    expect(stored.metadata).toMatchObject({
      note: "keep",
      shiprocket: { orderId: "SR9", shipmentId: "SH9" },
    });
    expect(metadata).toEqual(stored.metadata);
    // Its own write must not set the hook off again.
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { [SHIPROCKET_RETURN_CONTEXT]: true },
      }),
    );
  });

  it("never sends a return twice", async () => {
    stored.metadata = { shiprocket: { orderId: "SR9" } };
    expect(await sendReturnToShiprocket(3, req)).toBeNull();
    expect(createReturnOrder).not.toHaveBeenCalled();
  });

  it("waits until staff approve the return", async () => {
    stored.status = "requested";
    expect(await sendReturnToShiprocket(3, req)).toBeNull();
    expect(createReturnOrder).not.toHaveBeenCalled();
  });

  it("notes Shiprocket's error so saving again retries", async () => {
    createReturnOrder.mockRejectedValueOnce(
      new Error("pincode not serviceable"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    await sendReturnToShiprocket(3, req);

    expect(stored.metadata).toMatchObject({
      shiprocket: { error: "pincode not serviceable" },
    });
  });

  it("notes why a return can't go without calling Shiprocket", async () => {
    toShiprocketReturn.mockReturnValue({ ok: false, reason: "No phone" });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await sendReturnToShiprocket(3, req);

    expect(createReturnOrder).not.toHaveBeenCalled();
    expect(stored.metadata).toMatchObject({
      shiprocket: { error: "No phone" },
    });
  });

  it("swallows a database outage rather than failing the save", async () => {
    payload.findByID.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendReturnToShiprocket(3, req)).resolves.toBeNull();
  });

  it("does nothing while Shiprocket isn't set up", async () => {
    mocks.enabled = false;
    expect(await sendReturnToShiprocket(3, req)).toBeNull();
    expect(payload.findByID).not.toHaveBeenCalled();
  });
});
