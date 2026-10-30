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
