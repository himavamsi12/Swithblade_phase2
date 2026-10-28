import "server-only";
import { siteConfig } from "@/config/site";
import { orderNumber } from "@/features/notifications/order-confirmation-email";
import {
  orderPlacedEmailError,
  orderPlacedEmailPending,
  sendStaffAlert,
} from "@/features/notifications/repository";
import {
  shiprocketError,
  shiprocketPending,
} from "@/features/shipping/repository";
import { afterOrderRecorded } from "./after-payment";
import { razorpayClient, razorpayConfig } from "./razorpay";
import {
  listOrdersPlacedBetween,
  markOrdersAlerted,
  recordRazorpayPayment,
} from "./repository";

/*
 * Safety net run by a cron job (see vercel.json). Recovers paid orders that
 * neither the browser callback nor the webhook recorded, and retries the
 * Shiprocket hand-off and confirmation email for orders where they failed.
 * Every step is idempotent, so overlapping or repeated runs are harmless.
 * Staff are emailed (STORE_ALERT_EMAIL) about anything still stuck.
 */

const MINUTE = 60_000;
/** Leave fresh orders to the checkout's own follow-up, still running. */
const SETTLE = 10 * MINUTE;
/** How far back to look for unrecorded payments. */
const PAYMENT_LOOKBACK = 2 * 24 * 60 * MINUTE;
/** How long to keep retrying a failed Shiprocket hand-off or email. */
const FOLLOW_UP_LOOKBACK = 3 * 24 * 60 * MINUTE;
/** Retries get this long before a person is told an order is stuck. */
const ALERT_AFTER = 60 * MINUTE;
/** Razorpay's maximum page size. */
const PAGE = 100;
const MAX_PAGES = 10;

export type RetrySummary = {
  paymentsChecked: number;
  ordersRecovered: number;
  followUpsRetried: number;
  errors: number;
  ordersAlerted: number;
};

export async function retryOrderFollowUps(
  now = new Date(),
): Promise<RetrySummary> {
  const summary: RetrySummary = {
    paymentsChecked: 0,
    ordersRecovered: 0,
    followUpsRetried: 0,
    errors: 0,
    ordersAlerted: 0,
  };
  const settled = new Date(now.getTime() - SETTLE);

  const recovered = await recoverUnrecordedPayments(settled, summary);

  const since = new Date(now.getTime() - FOLLOW_UP_LOOKBACK);
  const orders = await listOrdersPlacedBetween(since, settled);
  for (const order of orders) {
    if (
      shiprocketPending(order.metadata) ||
      orderPlacedEmailPending(order.metadata)
    ) {
      // Never throws; failures are noted on the order for the next run.
      await afterOrderRecorded(order.id);
      summary.followUpsRetried++;
    }
  }

  await alertStaff(now, since, recovered, summary);
  return summary;
}

/**
 * One email listing orders still stuck after ALERT_AFTER (each reported
 * once) and orders this run recovered, which means the checkout callback
 * and webhook both missed them: worth checking the webhook setup.
 */
async function alertStaff(
  now: Date,
  since: Date,
  recovered: string[],
  summary: RetrySummary,
) {
  const stuck = (
    await listOrdersPlacedBetween(since, new Date(now.getTime() - ALERT_AFTER))
  ).flatMap((order) => {
    const meta = (order.metadata ?? {}) as {
      alertedAt?: string;
      oversold?: string[];
    };
    if (meta.alertedAt) return [];
    const problems = [
      ["Shiprocket", shiprocketError(order.metadata)],
      ["Confirmation email", orderPlacedEmailError(order.metadata)],
      ["Stock", meta.oversold?.length ? meta.oversold.join(", ") : null],
    ].filter(([, error]) => error);
    if (problems.length === 0) return [];
    return [
      {
        id: order.id,
        line: `${orderNumber(order)}: ${problems
          .map(([what, error]) =>
            what === "Stock"
              ? `oversold (${error})`
              : `${what} failed (${error})`,
          )
          .join("; ")}`,
      },
    ];
  });
  if (stuck.length === 0 && recovered.length === 0) return;

  const lines = [
    ...(stuck.length > 0
      ? [
          "These orders are paid but need a person: shipping or the email is",
          "still failing after an hour of retries (retries continue for three",
          "days), or an item sold out before the payment came in.",
          "",
          ...stuck.map((s) => s.line),
          "",
        ]
      : []),
    ...(recovered.length > 0
      ? [
          "These paid orders were missed by checkout and the Razorpay webhook,",
          "and were recovered by the retry job. Check RAZORPAY_WEBHOOK_SECRET",
          "and the webhook's events in the Razorpay dashboard.",
          "",
          ...recovered,
        ]
      : []),
  ];
  const sent = await sendStaffAlert({
    subject: `${siteConfig.name}: ${stuck.length + recovered.length} order(s) need attention`,
    lines,
    idempotencyKey: `order-alert/${[...stuck.map((s) => s.id), ...recovered].join(",")}`,
  });
  // Unsent alerts are tried again next run.
  if (sent) {
    await markOrdersAlerted(
      stuck.map((s) => s.id),
      now,
    );
    summary.ordersAlerted = stuck.length;
  }
}

/** Returns the order numbers it recovered. */
async function recoverUnrecordedPayments(
  until: Date,
  summary: RetrySummary,
): Promise<string[]> {
  const recovered: string[] = [];
  const config = razorpayConfig();
  if (!config) return recovered;
  const razorpay = razorpayClient(config);
  const to = Math.floor(until.getTime() / 1000);
  const from = Math.floor((until.getTime() - PAYMENT_LOOKBACK) / 1000);

  for (let page = 0; page < MAX_PAGES; page++) {
    const { items } = await razorpay.payments.all({
      from,
      to,
      count: PAGE,
      skip: page * PAGE,
    });
    for (const payment of items) {
      if (
        !payment.order_id ||
        (payment.status !== "captured" && payment.status !== "authorized")
      ) {
        continue;
      }
      summary.paymentsChecked++;
      try {
        const result = await recordRazorpayPayment(
          config,
          payment.order_id,
          payment.id,
        );
        if (result.status === "recorded") {
          console.warn(
            `Recovered unrecorded Razorpay payment ${payment.id} as order ${result.orderNumber}`,
          );
          summary.ordersRecovered++;
          recovered.push(result.orderNumber);
          // Just created, so the follow-up pass (which skips orders newer
          // than SETTLE) won't pick it up on this run.
          await afterOrderRecorded(result.orderId);
        }
        // "rejected" is expected for payments that aren't storefront orders.
      } catch (error) {
        console.error(`Retry: payment ${payment.id} not recorded`, error);
        summary.errors++;
      }
    }
    if (items.length < PAGE) break;
  }
  return recovered;
}
