import type { OrderStatusKey } from "./customer";

/*
 * The shipment progress shown in the Track order drawer, built from the
 * order's status and the dates staff (or the courier sync) record on its
 * fulfillments. A step without a recorded date is still shown as reached
 * once a later one is, so the timeline never has a gap.
 */

export type TrackingDates = {
  placedAt: string;
  shippedAt: string | null;
  /** From Shiprocket's tracking updates; staff can't set it. */
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
};

export type TrackingStep = {
  key: string;
  label: string;
  /** When the step happened, if recorded. */
  at: string | null;
  /** Done; the latest step reached; or still to come. */
  state: "done" | "current" | "upcoming";
};

const PROGRESS: OrderStatusKey[] = [
  "processing",
  "packed",
  "shipped",
  "delivered",
];

export function trackingSteps(
  status: OrderStatusKey,
  dates: TrackingDates,
): TrackingStep[] {
  // Returned orders were delivered first; cancelled ones stop after placing.
  const reachedStatus = status === "returned" ? "delivered" : status;
  const reached = Math.max(
    PROGRESS.indexOf(reachedStatus),
    dates.deliveredAt ? 3 : dates.shippedAt || dates.outForDeliveryAt ? 2 : 0,
  );

  const steps: Omit<TrackingStep, "state">[] =
    status === "cancelled"
      ? [
          { key: "placed", label: "Order placed", at: dates.placedAt },
          { key: "cancelled", label: "Cancelled", at: null },
        ]
      : [
          { key: "placed", label: "Order placed", at: dates.placedAt },
          { key: "processing", label: "Processing", at: null },
          { key: "shipped", label: "Shipped", at: dates.shippedAt },
          {
            key: "out",
            label: "Out for delivery",
            at: dates.outForDeliveryAt,
          },
          { key: "delivered", label: "Delivered", at: dates.deliveredAt },
          ...(status === "returned"
            ? [{ key: "returned", label: "Returned", at: null }]
            : []),
        ];

  // Index of the last step reached in the list above.
  const last =
    status === "cancelled" || status === "returned"
      ? steps.length - 1
      : reached === 3
        ? 4
        : // Shipped and out with the courier.
          reached === 2 && dates.outForDeliveryAt
          ? 3
          : // placed(0) and processing(1) are reached once the order is paid.
            [1, 1, 2][reached]!;

  return steps.map((step, i) => ({
    ...step,
    state: i < last ? "done" : i === last ? "current" : "upcoming",
  }));
}
