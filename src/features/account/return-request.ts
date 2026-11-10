import { RETURN_WINDOW_DAYS } from "@/features/legal/policy";

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
  key: "submitted" | "review" | "approved" | "refunded";
  label: string;
  detail: string;
  state: "done" | "current" | "upcoming" | "failed";
  at: string | null;
};

/** The Track return timeline: submitted → review → approved → refunded. */
export function returnSteps(r: {
  status: ReturnStatus;
  createdAt: string;
  approvedAt: string | null;
  receivedAt: string | null;
  refundedAt: string | null;
}): ReturnStep[] {
  const reviewed = r.status !== "requested";
  const approved = [
    "approved",
    "received",
    "partially_received",
    "refunded",
  ].includes(r.status);
  const received = ["received", "partially_received", "refunded"].includes(
    r.status,
  );
  const ended = r.status === "rejected" || r.status === "canceled";

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
      label: received ? "Return received" : "Return approved",
      detail: received
        ? "We've received your return and are checking it."
        : approved
          ? "A courier will collect it from your delivery address."
          : "Return instructions will be shared after approval.",
      state: ended
        ? "upcoming"
        : r.status === "refunded"
          ? "done"
          : approved
            ? "current"
            : "upcoming",
      at: received ? r.receivedAt : approved ? r.approvedAt : null,
    },
    {
      key: "refunded",
      label: "Refund processed",
      detail: "Your refund will be sent to the original payment method.",
      state: r.status === "refunded" ? "done" : "upcoming",
      at: r.status === "refunded" ? r.refundedAt : null,
    },
  ];
}
