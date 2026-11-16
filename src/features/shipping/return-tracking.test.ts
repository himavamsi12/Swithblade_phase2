import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Shiprocket tracking events for a return pickup ("1012-R3"): saved on the
 * return so the shopper's Track return timeline can follow the courier.
 */

let stored: Record<string, unknown>;
const payload = {
  findByID: vi.fn(async () => structuredClone(stored)),
  update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    stored = { ...stored, ...structuredClone(data) };
    return stored;
  }),
};

vi.mock("server-only", () => ({}));
vi.mock("payload", () => ({
  createLocalReq: vi.fn(async () => ({})),
  initTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  killTransaction: vi.fn(),
}));
vi.mock("@/payload/transaction", () => ({ lockKey: vi.fn() }));
vi.mock("@/features/account/customer", () => ({
  getPayloadClient: async () => payload,
}));
vi.mock("./shiprocket", () => ({
  shiprocketEnabled: () => true,
  createOrder: vi.fn(),
  createReturnOrder: vi.fn(),
}));

const { applyTrackingEvent } = await import("./repository");
const { returnPickupOf } = await import("@/features/account/return-request");

const event = (current_status: string, current_timestamp: string) => ({
  awb: "777001",
  courier_name: "Delhivery",
  current_status,
  current_timestamp,
  order_id: "1012-R3",
});

const pickup = () => returnPickupOf(stored.metadata);

beforeEach(() => {
  vi.clearAllMocks();
  stored = {
    id: 3,
    status: "requested",
    metadata: { shiprocket: { orderId: "SR9", shipmentId: "SH9" } },
  };
});

describe("applyTrackingEvent for a return", () => {
  it("follows the pickup from booked to back with us, keeping the ids", async () => {
    await applyTrackingEvent(
      event("RETURN PICKUP GENERATED", "11 11 2026 10:00:00"),
    );
    expect(pickup()).toEqual({
      stage: "scheduled",
      courier: "Delhivery",
      awb: "777001",
      scheduledAt: "2026-11-11T04:30:00.000Z",
      pickedUpAt: null,
      deliveredAt: null,
    });

    await applyTrackingEvent(event("RETURN PICKED UP", "12 11 2026 15:00:00"));
    await applyTrackingEvent(event("RETURN DELIVERED", "14 11 2026 11:00:00"));
    expect(pickup()).toMatchObject({
      stage: "delivered",
      scheduledAt: "2026-11-11T04:30:00.000Z",
      pickedUpAt: "2026-11-12T09:30:00.000Z",
      deliveredAt: "2026-11-14T05:30:00.000Z",
    });
    expect(stored.metadata).toMatchObject({
      shiprocket: { orderId: "SR9", shipmentId: "SH9" },
    });
  });

  it("ignores a late event for an earlier stage", async () => {
    await applyTrackingEvent(event("RETURN PICKED UP", "12 11 2026 15:00:00"));
    await applyTrackingEvent(
      event("RETURN OUT FOR PICKUP", "12 11 2026 09:00:00"),
    );
    expect(pickup()?.stage).toBe("picked_up");
  });

  it("doesn't touch the return's own status, which staff set", async () => {
    await applyTrackingEvent(event("RETURN DELIVERED", "14 11 2026 11:00:00"));
    expect(stored.status).toBe("requested");
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { metadata: expect.any(Object) },
      }),
    );
  });

  it("reports a return it doesn't know", async () => {
    payload.findByID.mockRejectedValueOnce(new Error("Not Found"));
    expect(
      await applyTrackingEvent(event("RETURN PICKED UP", "12 11 2026 15:00")),
    ).toBe("unknown-order");
  });
});
