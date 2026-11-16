import { RETURN_WINDOW_DAYS } from "@/features/legal/policy";
import type { ReturnPickupStage } from "@/features/shipping/tracking-update";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Whether a shopper can still ask to return an order: it's delivered and
 * within RETURN_WINDOW_DAYS of delivery. Orders marked delivered without a
 * delivery date stay eligible, so a missing date never blocks a return.
 */
export function canRequestReturn(
  status: string,
  deliveredAt: string | null,
  now: Date,
): boolean {
  if (status !== "delivered") return false;
  if (!deliveredAt) return true;
  const delivered = new Date(deliveredAt).getTime();
  if (Number.isNaN(delivered)) return true;
  return now.getTime() - delivered <= RETURN_WINDOW_DAYS * DAY;
}

/**
 * A mailto link to support with the order filled in, so staff get the order
 * number and items and can create the return in the admin.
 */
export function returnRequestHref(
  supportEmail: string,
  order: {
    number: string;
    items: { title: string; options: string | null; quantity: number }[];
  },
): string {
  const items = order.items.map(
    (i) => `- ${i.title}${i.options ? ` (${i.options})` : ""} × ${i.quantity}`,
  );
  const body = [
    `Order: ${order.number}`,
    "",
    "Items to return:",
    ...items,
    "",
    "Reason for return:",
    "",
    "Refund or exchange (and size, if exchanging):",
    "",
  ].join("\n");
  const query = new URLSearchParams({
    subject: `Return request: ${order.number}`,
    body,
  });
  // mailto wants %20 for spaces, not "+".
  return `mailto:${supportEmail}?${query.toString().replace(/\+/g, "%20")}`;
}

/** The reason value that needs the shopper to describe it. */
export const OTHER_REASON = "other";

/** Reasons in the order staff added them, with "Other" always last. */
export function orderReasons<T extends { id: number; value: string }>(
  reasons: T[],
): T[] {
  return [...reasons].sort(
    (a, b) =>
      Number(a.value === OTHER_REASON) - Number(b.value === OTHER_REASON) ||
      a.id - b.id,
  );
}

export type ReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "received"
  | "partially_received"
  | "refunded"
  | "canceled";

/** Whether a return still holds its items (they can't be returned again). */
export const holdsItems = (status: string) =>
  status !== "canceled" && status !== "rejected";

/** How many of each order line are already in a return that holds them. */
export function returnedByLine(
  returns: {
    status: string;
    items: { lineId?: string | null; quantity: number }[];
  }[],
): Map<string, number> {
  const returned = new Map<string, number>();
  for (const r of returns) {
    if (!holdsItems(r.status)) continue;
    for (const item of r.items) {
      if (!item.lineId) continue;
      returned.set(
        item.lineId,
        (returned.get(item.lineId) ?? 0) + item.quantity,
      );
    }
  }
  return returned;
}

/** The shopper-facing label for a return's status badge. */
export const returnStatusLabel: Record<ReturnStatus, string> = {
  requested: "Under review",
  approved: "Approved",
  rejected: "Not approved",
  received: "Received",
  partially_received: "Received",
  refunded: "Refunded",
  canceled: "Cancelled",
};

/**
 * The return badge for an order card, next to the order's own status:
 * "Return processing" while any return is open, else "Refunded" if the
 * newest return was refunded. Nothing for rejected or cancelled returns.
 */
export function orderReturnBadge(
  returns: { status: ReturnStatus }[],
): "processing" | "refunded" | null {
  if (
    returns.some((r) =>
      ["requested", "approved", "received", "partially_received"].includes(
        r.status,
      ),
    )
  ) {
    return "processing";
  }
  // Returns come newest first.
  return returns[0]?.status === "refunded" ? "refunded" : null;
}

export type ReturnStep = {
  key: "submitted" | "review" | "approved" | "pickup" | "refunded";
  label: string;
  detail: string;
  state: "done" | "current" | "upcoming" | "failed";
  at: string | null;
  /** The courier's tracking page, once the pickup has an AWB. */
  trackingUrl?: string | null;
};

/** The courier pickup for a return, from Shiprocket's tracking updates. */
export type ReturnPickup = {
  stage: ReturnPickupStage;
  courier: string | null;
  awb: string | null;
  scheduledAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
};

const PICKUP_STAGES: readonly string[] = [
  "scheduled",
  "picked_up",
  "delivered",
  "canceled",
] satisfies ReturnPickupStage[];

/** The pickup saved on a return's `metadata.shiprocket.tracking`, if any. */
export function returnPickupOf(metadata: unknown): ReturnPickup | null {
  const tracking = (
    metadata as { shiprocket?: { tracking?: Record<string, unknown> } } | null
  )?.shiprocket?.tracking;
  if (!tracking || typeof tracking.stage !== "string") return null;
  if (!PICKUP_STAGES.includes(tracking.stage)) return null;
  const text = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    stage: tracking.stage as ReturnPickupStage,
    courier: text(tracking.courier),
    awb: text(tracking.awb),
    scheduledAt: text(tracking.scheduledAt),
    pickedUpAt: text(tracking.pickedUpAt),
    deliveredAt: text(tracking.deliveredAt),
  };
}

/** The courier pickup step: scheduled → picked up → back with us. */
function pickupStep(
  r: { status: ReturnStatus; receivedAt: string | null },
  pickup: ReturnPickup | null,
  approved: boolean,
  ended: boolean,
): ReturnStep {
  const trackingUrl = pickup?.awb
    ? `https://shiprocket.co/tracking/${encodeURIComponent(pickup.awb)}`
    : null;
  const courier = [pickup?.courier, pickup?.awb && `AWB ${pickup.awb}`]
    .filter(Boolean)
    .join(" · ");
  const via = courier ? ` (${courier})` : "";

  if (["received", "partially_received", "refunded"].includes(r.status)) {
    return {
      key: "pickup",
      label: "Return received",
      detail: "We've received your return and checked it.",
      state: r.status === "refunded" ? "done" : "current",
      at: r.receivedAt ?? pickup?.deliveredAt ?? null,
      trackingUrl,
    };
  }
  if (ended || !pickup) {
    return {
      key: "pickup",
      label: "Courier pickup",
      detail: "A courier will collect it from your delivery address.",
      state: !ended && approved ? "current" : "upcoming",
      at: null,
    };
  }
  switch (pickup.stage) {
    case "delivered":
      return {
        key: "pickup",
        label: "Back with us",
        detail: `Your return reached us${via}. We're checking it now.`,
        state: "current",
        at: pickup.deliveredAt,
        trackingUrl,
      };
    case "picked_up":
      return {
        key: "pickup",
        label: "Picked up",
        detail: `The courier collected it and it's on its way back to us${via}.`,
        state: "current",
        at: pickup.pickedUpAt,
        trackingUrl,
      };
    case "scheduled":
      return {
        key: "pickup",
        label: "Pickup scheduled",
        detail: `A courier will collect it from your delivery address${via}.`,
        state: "current",
        at: pickup.scheduledAt,
        trackingUrl,
      };
    case "canceled":
      return {
        key: "pickup",
        label: "Pickup cancelled",
        detail:
          "The courier pickup was cancelled. We'll arrange a new one, or contact us.",
        state: "failed",
        at: null,
      };
  }
}

/**
 * The Track return timeline: submitted → review → approved → courier
 * pickup (scheduled, picked up, back with us, received) → refunded. A
 * courier booked for the pickup means staff approved it, even before the
 * return's status is updated in the admin.
 */
export function returnSteps(r: {
  status: ReturnStatus;
  createdAt: string;
  approvedAt: string | null;
  receivedAt: string | null;
  refundedAt: string | null;
  pickup?: ReturnPickup | null;
}): ReturnStep[] {
  const pickup = r.pickup ?? null;
  const ended = r.status === "rejected" || r.status === "canceled";
  const courierBooked =
    !ended && pickup !== null && pickup.stage !== "canceled";
  const approved =
    courierBooked ||
    ["approved", "received", "partially_received", "refunded"].includes(
      r.status,
    );
  const reviewed = r.status !== "requested" || approved;

  return [
    {
      key: "submitted",
      label: "Request submitted",
      detail: "Your return request and pictures were received.",
      state: "done",
      at: r.createdAt,
    },
    ended
      ? {
          key: "review",
          label: r.status === "rejected" ? "Not approved" : "Cancelled",
          detail:
            r.status === "rejected"
              ? "We couldn't approve this return. Please contact us for details."
              : "This return was cancelled.",
          state: "failed",
          at: null,
        }
      : {
          key: "review",
          label: "Under review",
          detail: reviewed
            ? "Our team reviewed your request."
            : "Our team is reviewing your request.",
          state: reviewed ? "done" : "current",
          at: null,
        },
    {
      key: "approved",
      label: "Return approved",
      detail: approved
        ? "Your return was approved."
        : "Return instructions will be shared after approval.",
      state: !ended && approved ? "done" : "upcoming",
      at: approved ? (r.approvedAt ?? pickup?.scheduledAt ?? null) : null,
    },
    pickupStep(r, pickup, approved, ended),
    {
      key: "refunded",
      label: "Refund processed",
      detail: "Your refund will be sent to the original payment method.",
      state: r.status === "refunded" ? "done" : "upcoming",
      at: r.status === "refunded" ? r.refundedAt : null,
    },
  ];
}
