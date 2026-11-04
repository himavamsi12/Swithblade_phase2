import { describe, expect, it } from "vitest";
import {
  parseShiprocketTime,
  stageOf,
  trackingChange,
  trackingEventSchema,
  type TrackingEvent,
} from "./tracking-update";

/* Shiprocket tracking events and what they change on an order. */

const now = new Date("2026-11-04T08:00:00Z");

const event = (current_status: string, extra: Partial<TrackingEvent> = {}) =>
  trackingEventSchema.parse({
    awb: 19041424751540,
    courier_name: "Delhivery Surface",
    current_status,
    current_timestamp: "04 11 2026 13:22:05",
    order_id: "1010",
    ...extra,
  });

describe("stageOf", () => {
  it.each([
    ["PICKUP SCHEDULED", "packed"],
    ["Out For Pickup", "packed"],
    ["PICKED UP", "shipped"],
    ["SHIPPED", "shipped"],
    ["IN TRANSIT", "shipped"],
    ["Reached at Destination Hub", "shipped"],
    ["UNDELIVERED", "shipped"],
    ["OUT FOR DELIVERY", "out"],
    ["DELIVERED", "delivered"],
    ["CANCELED", "canceled"],
    ["RTO IN TRANSIT", null],
    ["RTO DELIVERED", "returned"],
    ["SOMETHING NEW", null],
  ])("%s → %s", (status, stage) => {
    expect(stageOf(status)).toBe(stage);
  });
});

describe("parseShiprocketTime", () => {
  it("reads Shiprocket's India-time format", () => {
    expect(parseShiprocketTime("04 11 2026 13:22:05")).toBe(
      "2026-11-04T07:52:05.000Z",
    );
  });

  it("returns null for anything else", () => {
    expect(parseShiprocketTime("yesterday")).toBeNull();
    expect(parseShiprocketTime(null)).toBeNull();
  });
});

describe("trackingChange", () => {
  it("marks a picked-up parcel shipped, with courier and AWB", () => {
    expect(trackingChange(event("PICKED UP"), "fulfilled", now)).toEqual({
      fulfillmentStatus: "shipped",
      carrier: "Delhivery Surface",
      trackingNumber: "19041424751540",
      shippedAt: "2026-11-04T07:52:05.000Z",
      deliveredAt: null,
      outForDeliveryAt: null,
      courierStatus: "PICKED UP",
      at: "2026-11-04T07:52:05.000Z",
    });
  });

  it("notes out for delivery without changing the label", () => {
    const change = trackingChange(event("OUT FOR DELIVERY"), "shipped", now);
    expect(change.fulfillmentStatus).toBeNull();
    expect(change.outForDeliveryAt).toBe("2026-11-04T07:52:05.000Z");
  });

  it("marks delivered with its time", () => {
    const change = trackingChange(event("DELIVERED"), "shipped", now);
    expect(change).toMatchObject({
      fulfillmentStatus: "delivered",
      deliveredAt: "2026-11-04T07:52:05.000Z",
    });
  });

  it("never moves an order backwards", () => {
    expect(
      trackingChange(event("IN TRANSIT"), "delivered", now).fulfillmentStatus,
    ).toBeNull();
  });

  it("doesn't cancel a parcel the courier already has", () => {
    expect(
      trackingChange(event("CANCELED"), "shipped", now).fulfillmentStatus,
    ).toBeNull();
    expect(
      trackingChange(event("CANCELED"), "fulfilled", now).fulfillmentStatus,
    ).toBe("canceled");
  });

  it("marks a parcel returned to us", () => {
    expect(
      trackingChange(event("RTO DELIVERED"), "delivered", now)
        .fulfillmentStatus,
    ).toBe("returned");
  });

  it("uses the time it arrived when Shiprocket's is unreadable", () => {
    const change = trackingChange(
      event("DELIVERED", { current_timestamp: "soon" }),
      "shipped",
      now,
    );
    expect(change.at).toBe(now.toISOString());
  });
});
