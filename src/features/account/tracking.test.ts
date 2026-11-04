import { describe, expect, it } from "vitest";
import { trackingSteps, type TrackingDates } from "./tracking";

/* The Track order timeline for each stage an order can be at. */

const placed: TrackingDates = {
  placedAt: "2026-11-01T05:02:00Z",
  shippedAt: null,
  outForDeliveryAt: null,
  deliveredAt: null,
};

const states = (steps: ReturnType<typeof trackingSteps>) =>
  steps.map((s) => [s.key, s.state]);

describe("trackingSteps", () => {
  it("shows a paid order as processing", () => {
    expect(states(trackingSteps("processing", placed))).toEqual([
      ["placed", "done"],
      ["processing", "current"],
      ["shipped", "upcoming"],
      ["out", "upcoming"],
      ["delivered", "upcoming"],
    ]);
  });

  it("keeps a packed order at processing", () => {
    expect(trackingSteps("packed", placed)[1]!.state).toBe("current");
  });

  it("marks shipped with its date", () => {
    const steps = trackingSteps("shipped", {
      ...placed,
      shippedAt: "2026-11-02T03:30:00Z",
    });
    expect(states(steps).slice(0, 4)).toEqual([
      ["placed", "done"],
      ["processing", "done"],
      ["shipped", "current"],
      ["out", "upcoming"],
    ]);
    expect(steps[2]!.at).toBe("2026-11-02T03:30:00Z");
  });

  it("shows the parcel out for delivery, with its time", () => {
    const steps = trackingSteps("shipped", {
      ...placed,
      shippedAt: "2026-11-02T03:30:00Z",
      outForDeliveryAt: "2026-11-04T03:15:00Z",
    });
    expect(steps[2]!.state).toBe("done");
    expect(steps[3]).toMatchObject({
      state: "current",
      at: "2026-11-04T03:15:00Z",
    });
  });

  it("fills every step once delivered", () => {
    const steps = trackingSteps("delivered", {
      ...placed,
      shippedAt: "2026-11-02T03:30:00Z",
      deliveredAt: "2026-11-04T07:52:00Z",
    });
    expect(states(steps)).toEqual([
      ["placed", "done"],
      ["processing", "done"],
      ["shipped", "done"],
      ["out", "done"],
      ["delivered", "current"],
    ]);
    expect(steps[0]!.at).toBe(placed.placedAt);
    expect(steps[4]!.at).toBe("2026-11-04T07:52:00Z");
  });

  it("trusts a recorded shipping date even if the status lags", () => {
    const steps = trackingSteps("processing", {
      ...placed,
      shippedAt: "2026-11-02T03:30:00Z",
    });
    expect(steps[2]!.state).toBe("current");
  });

  it("ends a cancelled order at cancelled", () => {
    expect(states(trackingSteps("cancelled", placed))).toEqual([
      ["placed", "done"],
      ["cancelled", "current"],
    ]);
  });

  it("adds a returned step after delivery", () => {
    const steps = trackingSteps("returned", placed);
    expect(steps.at(-2)).toMatchObject({ key: "delivered", state: "done" });
    expect(steps.at(-1)).toMatchObject({ key: "returned", state: "current" });
  });
});
