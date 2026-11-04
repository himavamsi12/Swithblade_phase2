import "server-only";
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type PayloadRequest,
} from "payload";
import { getPayloadClient } from "@/features/account/customer";
import { lockKey } from "@/payload/transaction";
import {
  createOrder,
  createReturnOrder,
  shiprocketEnabled,
} from "./shiprocket";
import { toShiprocketOrder } from "./shiprocket-order";
import { returnIdOf, toShiprocketReturn } from "./shiprocket-return";
import {
  trackingChange,
  type FulfillmentStatus,
  type TrackingEvent,
} from "./tracking-update";

/*
 * Hands a paid order to Shiprocket and notes the result in the order's
 * `metadata.shiprocket`, so it shows in the admin and is never sent twice.
 * Never throws: a Shiprocket outage must not affect a recorded payment.
 */

type ShiprocketMeta = {
  orderId?: string;
  shipmentId?: string | null;
  error?: string;
  at: string;
};

/** Whether this order still has to reach Shiprocket. */
export function shiprocketPending(metadata: unknown): boolean {
  if (!shiprocketEnabled()) return false;
  const meta = (metadata ?? {}) as { shiprocket?: ShiprocketMeta };
  return !meta.shiprocket?.orderId;
}

/** Why this order hasn't reached Shiprocket, if it hasn't. */
export function shiprocketError(metadata: unknown): string | null {
  if (!shiprocketPending(metadata)) return null;
  const meta = (metadata ?? {}) as { shiprocket?: ShiprocketMeta };
  return meta.shiprocket?.error ?? "not sent yet";
}

export async function sendOrderToShiprocket(orderId: number): Promise<void> {
  if (!shiprocketEnabled()) return;
  try {
    const payload = await getPayloadClient();
    const order = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
    });
    const metadata =
      order.metadata && typeof order.metadata === "object"
        ? (order.metadata as Record<string, unknown>)
        : {};
    if ((metadata.shiprocket as ShiprocketMeta | undefined)?.orderId) return;

    let shiprocket: ShiprocketMeta;
    const mapped = toShiprocketOrder(order);
    if (!mapped.ok) {
      shiprocket = { error: mapped.reason, at: new Date().toISOString() };
    } else {
      try {
        const created = await createOrder(mapped.order);
        shiprocket = { ...created, at: new Date().toISOString() };
      } catch (error) {
        shiprocket = {
          error: error instanceof Error ? error.message : String(error),
          at: new Date().toISOString(),
        };
      }
    }
    if (shiprocket.error) {
      console.error(`Shiprocket: order ${orderId} not sent:`, shiprocket.error);
    }

    // Re-read: the email and staff-alert results are written to the same
    // field, possibly while Shiprocket was answering.
    const fresh = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      select: { metadata: true },
    });
    const freshMeta =
      fresh.metadata && typeof fresh.metadata === "object"
        ? (fresh.metadata as Record<string, unknown>)
        : {};
    await payload.update({
      collection: "orders",
      id: orderId,
      data: { metadata: { ...freshMeta, shiprocket } },
      depth: 0,
    });
  } catch (error) {
    console.error(`Shiprocket: order ${orderId} failed`, error);
  }
}

/** Set on the update that notes the result, so the returns hook skips it. */
export const SHIPROCKET_RETURN_CONTEXT = "shiprocketReturn";

/**
 * Creates the Shiprocket return order for an approved return, once, and
 * notes the result in the return's `metadata.shiprocket`. Runs inside the
 * admin save (`req`), so it sees a return that was just created. Never
 * throws: a Shiprocket outage must not stop staff saving a return. Returns
 * the return's new metadata, or null if nothing was sent.
 */
export async function sendReturnToShiprocket(
  returnId: number,
  req: PayloadRequest,
): Promise<Record<string, unknown> | null> {
  if (!shiprocketEnabled()) return null;
  try {
    const { payload } = req;
    const ret = await payload.findByID({
      collection: "returns",
      id: returnId,
      depth: 2,
      req,
    });
    const metadata =
      ret.metadata && typeof ret.metadata === "object"
        ? (ret.metadata as Record<string, unknown>)
        : {};
    if (ret.status !== "approved") return null;
    if ((metadata.shiprocket as ShiprocketMeta | undefined)?.orderId) {
      return null;
    }
    const order =
      typeof ret.order === "object"
        ? ret.order
        : await payload.findByID({
            collection: "orders",
            id: ret.order,
            depth: 0,
            req,
          });

    let shiprocket: ShiprocketMeta;
    const mapped = toShiprocketReturn(ret, order);
    if (!mapped.ok) {
      shiprocket = { error: mapped.reason, at: new Date().toISOString() };
    } else {
      try {
        const created = await createReturnOrder(mapped.order);
        shiprocket = { ...created, at: new Date().toISOString() };
      } catch (error) {
        shiprocket = {
          error: error instanceof Error ? error.message : String(error),
          at: new Date().toISOString(),
        };
      }
    }
    if (shiprocket.error) {
      console.error(
        `Shiprocket: return ${returnId} not sent:`,
        shiprocket.error,
      );
    }

    const next = { ...metadata, shiprocket };
    await payload.update({
      collection: "returns",
      id: returnId,
      data: { metadata: next },
      depth: 0,
      req,
      context: { [SHIPROCKET_RETURN_CONTEXT]: true },
    });
    return next;
  } catch (error) {
    console.error(`Shiprocket: return ${returnId} failed`, error);
    return null;
  }
}

export type TrackingResult = "updated" | "unknown-order";

/**
 * Applies a Shiprocket tracking event to the order it's for: the order's
 * fulfillment status, its fulfillment (courier, AWB, tracking link, dates)
 * and the courier's latest status in `metadata.shiprocket.tracking`.
 * Events for the same order take turns, so none overwrites another.
 */
export async function applyTrackingEvent(
  event: TrackingEvent,
): Promise<TrackingResult> {
  const returnId = returnIdOf(event.order_id);
  if (returnId !== null) return applyReturnTrackingEvent(returnId, event);
  const displayId = Number(event.order_id);
  if (!Number.isInteger(displayId) || displayId <= 0) return "unknown-order";

  const payload = await getPayloadClient();
  const req = await createLocalReq({}, payload);
  await initTransaction(req);
  try {
    await lockKey(req, `tracking:${displayId}`);
    const { docs } = await payload.find({
      collection: "orders",
      where: { displayId: { equals: displayId } },
      limit: 1,
      depth: 0,
      select: { fulfillmentStatus: true, fulfillments: true, metadata: true },
      req,
    });
    const order = docs[0];
    if (!order) {
      await killTransaction(req);
      return "unknown-order";
    }

    const change = trackingChange(
      event,
      (order.fulfillmentStatus ?? "not_fulfilled") as FulfillmentStatus,
      new Date(),
    );

    // The fulfillment for this parcel: matched by AWB, else the first one
    // without a tracking number yet, else a new one.
    const fulfillments = [...(order.fulfillments ?? [])];
    let index = fulfillments.findIndex(
      (f) =>
        change.trackingNumber && f.trackingNumber === change.trackingNumber,
    );
    if (index === -1) index = fulfillments.findIndex((f) => !f.trackingNumber);
    const existing = index === -1 ? {} : fulfillments[index]!;
    const fulfillment = {
      ...existing,
      carrier: existing.carrier || change.carrier,
      trackingNumber: existing.trackingNumber || change.trackingNumber,
      trackingUrl:
        existing.trackingUrl ||
        (change.trackingNumber
          ? `https://shiprocket.co/tracking/${encodeURIComponent(change.trackingNumber)}`
          : null),
      shippedAt: existing.shippedAt ?? change.shippedAt,
      deliveredAt: change.deliveredAt ?? existing.deliveredAt ?? null,
    };
    const worthKeeping =
      fulfillment.trackingNumber ||
      fulfillment.shippedAt ||
      fulfillment.deliveredAt;
    if (index === -1) {
      if (worthKeeping) fulfillments.push(fulfillment);
    } else {
      fulfillments[index] = fulfillment;
    }

    const metadata =
      order.metadata && typeof order.metadata === "object"
        ? (order.metadata as Record<string, unknown>)
        : {};
    const shiprocket = (metadata.shiprocket ?? {}) as Record<string, unknown>;
    const previous = (shiprocket.tracking ?? {}) as {
      outForDeliveryAt?: string;
    };
    await payload.update({
      collection: "orders",
      id: order.id,
      data: {
        ...(change.fulfillmentStatus && {
          fulfillmentStatus: change.fulfillmentStatus,
        }),
        fulfillments,
        metadata: {
          ...metadata,
          shiprocket: {
            ...shiprocket,
            tracking: {
              status: change.courierStatus,
              at: change.at,
              outForDeliveryAt:
                change.outForDeliveryAt ?? previous.outForDeliveryAt ?? null,
            },
          },
        },
      },
      depth: 0,
      req,
    });
    await commitTransaction(req);
    return "updated";
  } catch (error) {
    await killTransaction(req);
    throw error;
  }
}

/**
 * Notes a return pickup's courier status, AWB and courier on the return.
 * Staff still mark it received after checking the parcel, so nothing else
 * changes. Events for the same return take turns.
 */
async function applyReturnTrackingEvent(
  returnId: number,
  event: TrackingEvent,
): Promise<TrackingResult> {
  const payload = await getPayloadClient();
  const req = await createLocalReq({}, payload);
  await initTransaction(req);
  try {
    await lockKey(req, `return-tracking:${returnId}`);
    const ret = await payload
      .findByID({
        collection: "returns",
        id: returnId,
        depth: 0,
        select: { metadata: true },
        req,
      })
      .catch(() => null);
    if (!ret) {
      await killTransaction(req);
      return "unknown-order";
    }
    const change = trackingChange(event, "not_fulfilled", new Date());
    const metadata =
      ret.metadata && typeof ret.metadata === "object"
        ? (ret.metadata as Record<string, unknown>)
        : {};
    const shiprocket = (metadata.shiprocket ?? {}) as Record<string, unknown>;
    const previous = (shiprocket.tracking ?? {}) as Record<string, unknown>;
    await payload.update({
      collection: "returns",
      id: returnId,
      data: {
        metadata: {
          ...metadata,
          shiprocket: {
            ...shiprocket,
            tracking: {
              status: change.courierStatus,
              at: change.at,
              awb: change.trackingNumber ?? previous.awb ?? null,
              courier: change.carrier ?? previous.courier ?? null,
            },
          },
        },
      },
      depth: 0,
      req,
      context: { [SHIPROCKET_RETURN_CONTEXT]: true },
    });
    await commitTransaction(req);
    return "updated";
  } catch (error) {
    await killTransaction(req);
    throw error;
  }
}
