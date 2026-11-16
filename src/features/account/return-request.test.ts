import { describe, expect, it } from "vitest";
import {
  canRequestReturn,
  orderReasons,
  orderReturnBadge,
  returnedByLine,
  returnPickupOf,
  returnRequestHref,
  returnSteps,
  type ReturnPickup,
  type ReturnStatus,
} from "./return-request";

const now = new Date("2026-10-30T12:00:00.000Z");

describe("canRequestReturn", () => {
  it("allows delivered orders inside the return window", () => {
    expect(canRequestReturn("delivered", "2026-10-25T12:00:00.000Z", now)).toBe(
      true,
    );
  });

  it("refuses once the window has passed", () => {
    expect(canRequestReturn("delivered", "2026-10-20T12:00:00.000Z", now)).toBe(
      false,
    );
  });

  it("refuses orders that aren't delivered", () => {
    expect(canRequestReturn("shipped", null, now)).toBe(false);
    expect(canRequestReturn("processing", null, now)).toBe(false);
  });

  it("allows delivered orders without a delivery date", () => {
    expect(canRequestReturn("delivered", null, now)).toBe(true);
  });
});

describe("returnRequestHref", () => {
  it("fills in the order number and items", () => {
    const href = returnRequestHref("help@example.com", {
      number: "SB-1010",
      items: [{ title: "Tee", options: "Red · Size S", quantity: 1 }],
    });
    expect(href.startsWith("mailto:help@example.com?")).toBe(true);
    expect(href).not.toContain("+");
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("subject")).toBe("Return request: SB-1010");
    expect(params.get("body")).toContain("- Tee (Red · Size S) × 1");
  });
});

describe("returnedByLine", () => {
  it("counts items in returns that still hold them", () => {
    const returned = returnedByLine([
      { status: "requested", items: [{ lineId: "a", quantity: 1 }] },
      { status: "refunded", items: [{ lineId: "a", quantity: 1 }] },
      { status: "approved", items: [{ lineId: "b", quantity: 2 }] },
    ]);
    expect(Object.fromEntries(returned)).toEqual({ a: 2, b: 2 });
  });

  it("frees items from rejected and cancelled returns", () => {
    const returned = returnedByLine([
      { status: "rejected", items: [{ lineId: "a", quantity: 1 }] },
      { status: "canceled", items: [{ lineId: "a", quantity: 1 }] },
    ]);
    expect(returned.size).toBe(0);
  });

  it("ignores items made in the admin without a line", () => {
    const returned = returnedByLine([
      { status: "requested", items: [{ lineId: null, quantity: 1 }] },
    ]);
    expect(returned.size).toBe(0);
  });
});

describe("returnSteps", () => {
  const dates = {
    createdAt: "2026-11-01T10:00:00.000Z",
    approvedAt: "2026-11-02T10:00:00.000Z",
    receivedAt: "2026-11-04T10:00:00.000Z",
    refundedAt: "2026-11-05T10:00:00.000Z",
  };
  const pickup = (p: Partial<ReturnPickup>): ReturnPickup => ({
    stage: "scheduled",
    courier: "Delhivery",
    awb: "1234567890",
    scheduledAt: "2026-11-02T12:00:00.000Z",
    pickedUpAt: null,
    deliveredAt: null,
    ...p,
  });
  const states = (status: ReturnStatus, p: ReturnPickup | null = null) =>
    returnSteps({ status, ...dates, pickup: p }).map(
      (s) => `${s.key}:${s.state}`,
    );

  it("shows a new request under review", () => {
    expect(states("requested")).toEqual([
      "submitted:done",
      "review:current",
      "approved:upcoming",
      "pickup:upcoming",
      "refunded:upcoming",
    ]);
  });

  it("waits for the courier once approved", () => {
    expect(states("approved")).toEqual([
      "submitted:done",
      "review:done",
      "approved:done",
      "pickup:current",
      "refunded:upcoming",
    ]);
  });

  it("follows the courier pickup, even before staff update the status", () => {
    const scheduled = returnSteps({
      status: "requested",
      ...dates,
      approvedAt: null,
      pickup: pickup({}),
    });
    expect(scheduled.map((s) => `${s.key}:${s.state}`)).toEqual([
      "submitted:done",
      "review:done",
      "approved:done",
      "pickup:current",
      "refunded:upcoming",
    ]);
    expect(scheduled[2]!.at).toBe("2026-11-02T12:00:00.000Z");
    expect(scheduled[3]).toMatchObject({
      label: "Pickup scheduled",
      at: "2026-11-02T12:00:00.000Z",
      trackingUrl: "https://shiprocket.co/tracking/1234567890",
    });
    expect(scheduled[3]!.detail).toContain("Delhivery · AWB 1234567890");

    const picked = returnSteps({
      status: "approved",
      ...dates,
      pickup: pickup({
        stage: "picked_up",
        pickedUpAt: "2026-11-03T09:00:00.000Z",
      }),
    });
    expect(picked[3]).toMatchObject({
      label: "Picked up",
      state: "current",
      at: "2026-11-03T09:00:00.000Z",
    });

    const back = returnSteps({
      status: "approved",
      ...dates,
      pickup: pickup({
        stage: "delivered",
        deliveredAt: "2026-11-04T08:00:00.000Z",
      }),
    });
    expect(back[3]).toMatchObject({ label: "Back with us", state: "current" });
  });

  it("says when the courier pickup was cancelled", () => {
    const steps = returnSteps({
      status: "approved",
      ...dates,
      pickup: pickup({ stage: "canceled" }),
    });
    expect(steps[3]).toMatchObject({
      label: "Pickup cancelled",
      state: "failed",
    });
  });

  it("is received, then refunded", () => {
    const received = returnSteps({
      status: "received",
      ...dates,
      pickup: pickup({ stage: "delivered" }),
    });
    expect(received[3]).toMatchObject({
      label: "Return received",
      state: "current",
      at: "2026-11-04T10:00:00.000Z",
    });
    expect(states("refunded")).toEqual([
      "submitted:done",
      "review:done",
      "approved:done",
      "pickup:done",
      "refunded:done",
    ]);
  });

  it("says when a return wasn't approved", () => {
    const steps = returnSteps({
      status: "rejected",
      createdAt: "2026-11-01T10:00:00.000Z",
      approvedAt: null,
      receivedAt: null,
      refundedAt: null,
      pickup: pickup({}),
    });
    expect(steps[1]).toMatchObject({ state: "failed", label: "Not approved" });
    expect(steps.slice(2).every((s) => s.state === "upcoming")).toBe(true);
  });
});

describe("returnPickupOf", () => {
  it("reads the pickup saved by the tracking webhook", () => {
    expect(
      returnPickupOf({
        shiprocket: {
          orderId: "1",
          tracking: {
            status: "RETURN PICKED UP",
            stage: "picked_up",
            courier: "Delhivery",
            awb: "123",
            scheduledAt: "2026-11-02T12:00:00.000Z",
            pickedUpAt: "2026-11-03T09:00:00.000Z",
            deliveredAt: null,
          },
        },
      }),
    ).toEqual({
      stage: "picked_up",
      courier: "Delhivery",
      awb: "123",
      scheduledAt: "2026-11-02T12:00:00.000Z",
      pickedUpAt: "2026-11-03T09:00:00.000Z",
      deliveredAt: null,
    });
  });

  it("is null without a known stage", () => {
    expect(returnPickupOf(null)).toBeNull();
    expect(returnPickupOf({ shiprocket: { orderId: "1" } })).toBeNull();
    // Saved before stages were tracked: just the courier's wording.
    expect(
      returnPickupOf({ shiprocket: { tracking: { status: "PICKED UP" } } }),
    ).toBeNull();
    expect(
      returnPickupOf({ shiprocket: { tracking: { stage: "lost" } } }),
    ).toBeNull();
  });
});

describe("orderReasons", () => {
  it("keeps the order staff added them, with Other last", () => {
    const ordered = orderReasons([
      { id: 4, value: "other" },
      { id: 2, value: "damaged" },
      { id: 1, value: "size_fit" },
      { id: 5, value: "late" },
    ]);
    expect(ordered.map((r) => r.value)).toEqual([
      "size_fit",
      "damaged",
      "late",
      "other",
    ]);
  });
});

describe("orderReturnBadge", () => {
  const of = (...statuses: ReturnStatus[]) =>
    orderReturnBadge(statuses.map((status) => ({ status })));

  it("shows nothing without returns", () => {
    expect(of()).toBeNull();
  });

  it("shows processing while any return is open", () => {
    expect(of("requested")).toBe("processing");
    expect(of("approved")).toBe("processing");
    expect(of("partially_received")).toBe("processing");
    expect(of("refunded", "received")).toBe("processing");
  });

  it("shows refunded when the newest return was refunded", () => {
    expect(of("refunded")).toBe("refunded");
    expect(of("rejected", "refunded")).toBeNull();
  });

  it("shows nothing for rejected or cancelled returns", () => {
    expect(of("rejected")).toBeNull();
    expect(of("canceled")).toBeNull();
  });
});
