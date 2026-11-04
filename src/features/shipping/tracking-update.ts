import { z } from "zod";

/*
 * Turns a Shiprocket tracking webhook into changes to our order: its
 * fulfillment status (the label on the shopper's order card) and the dates
 * the Track order timeline shows. Pure, so every courier status is tested.
 */

/** The fields we use from Shiprocket's tracking webhook body. */
export const trackingEventSchema = z.object({
  awb: z.union([z.string(), z.number()]).nullish(),
  courier_name: z.string().nullish(),
  current_status: z.string().nullish(),
  shipment_status: z.string().nullish(),
  /** "23 05 2023 11:43:52", India time. */
  current_timestamp: z.string().nullish(),
  /** The order id we sent Shiprocket: our order number. */
  order_id: z.union([z.string(), z.number()]),
});

export type TrackingEvent = z.infer<typeof trackingEventSchema>;

export type FulfillmentStatus =
  | "not_fulfilled"
  | "partially_fulfilled"
  | "fulfilled"
  | "shipped"
  | "delivered"
  | "returned"
  | "canceled";

type Stage =
  "packed" | "shipped" | "out" | "delivered" | "returned" | "canceled";

/** Which stage a courier status means; null for ones we only note. */
export function stageOf(status: string): Stage | null {
  const s = status
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, " ");
  if (s.startsWith("RTO")) return s.includes("DELIVERED") ? "returned" : null;
  if (s === "DELIVERED") return "delivered";
  if (s === "OUT FOR DELIVERY") return "out";
  if (s.startsWith("CANCEL")) return "canceled";
  if (
    s.includes("TRANSIT") ||
    s.includes("PICKED UP") ||
    s.includes("SHIPPED") ||
    s.includes("DESTINATION HUB") ||
    s.includes("UNDELIVERED") ||
    s.includes("DELAYED") ||
    s.includes("MISROUTED")
  ) {
    return "shipped";
  }
  if (
    s.includes("PICKUP") ||
    s.includes("AWB") ||
    s.includes("LABEL") ||
    s.includes("MANIFEST") ||
    s.includes("READY TO SHIP")
  ) {
    return "packed";
  }
  return null;
}

/** "23 05 2023 11:43:52" (India time) as an ISO date; null if unreadable. */
export function parseShiprocketTime(value: string | null | undefined) {
  const m = value?.match(
    /^(\d{1,2})[ /-](\d{1,2})[ /-](\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!m) return null;
  const [, d, mo, y, h, mi, s = "00"] = m;
  const pad = (v: string) => v.padStart(2, "0");
  const date = new Date(
    `${y}-${pad(mo!)}-${pad(d!)}T${pad(h!)}:${mi}:${s}+05:30`,
  );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const RANK: Record<FulfillmentStatus, number> = {
  not_fulfilled: 0,
  partially_fulfilled: 0,
  fulfilled: 1,
  shipped: 2,
  delivered: 3,
  returned: 4,
  canceled: 4,
};

const STATUS_FOR: Record<Stage, FulfillmentStatus> = {
  packed: "fulfilled",
  shipped: "shipped",
  out: "shipped",
  delivered: "delivered",
  returned: "returned",
  canceled: "canceled",
};

export type TrackingChange = {
  /** The order's new fulfillment status, or null to leave it. */
  fulfillmentStatus: FulfillmentStatus | null;
  carrier: string | null;
  trackingNumber: string | null;
  /** Set once, the first time the parcel is seen moving. */
  shippedAt: string | null;
  deliveredAt: string | null;
  outForDeliveryAt: string | null;
  /** The courier's own wording and time, kept for the admin. */
  courierStatus: string;
  at: string;
};

/**
 * What a tracking event changes on an order whose fulfillment status is
 * `current`. Events can arrive late or out of order, so status only moves
 * forward (a late "In transit" never undoes "Delivered"), and a parcel the
 * courier has picked up can no longer be cancelled from here.
 */
export function trackingChange(
  event: TrackingEvent,
  current: FulfillmentStatus,
  now: Date,
): TrackingChange {
  const courierStatus = (
    event.current_status ??
    event.shipment_status ??
    ""
  ).trim();
  const at = parseShiprocketTime(event.current_timestamp) ?? now.toISOString();
  const stage = stageOf(courierStatus);
  const next = stage ? STATUS_FOR[stage] : null;

  const finished = current === "returned" || current === "canceled";
  const moves =
    next !== null &&
    !finished &&
    RANK[next] > RANK[current] &&
    !(next === "canceled" && RANK[current] >= RANK.shipped);

  const moving =
    stage === "shipped" || stage === "out" || stage === "delivered";
  return {
    fulfillmentStatus: moves ? next : null,
    carrier: event.courier_name?.trim() || null,
    trackingNumber: event.awb != null ? String(event.awb).trim() || null : null,
    shippedAt: moving ? at : null,
    deliveredAt: stage === "delivered" ? at : null,
    outForDeliveryAt: stage === "out" ? at : null,
    courierStatus,
    at,
  };
}
