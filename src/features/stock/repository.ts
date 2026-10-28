import "server-only";
import { sql } from "@payloadcms/db-postgres";
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type PayloadRequest,
  type Where,
} from "payload";
import { getPayloadClient } from "@/features/account/customer";
import { matchVariant } from "@/features/catalog/payload-product";
import { DB_SCHEMA } from "@/payload/constants";
import { lockKey, transactionDb } from "@/payload/transaction";
import { HOLD_MINUTES } from "./hold";

/*
 * Stock holds and stock taking.
 *
 * Available stock = inventory - active holds that haven't expired. Starting
 * checkout holds the bag's items for HOLD_MINUTES; Razorpay's payment window
 * is shorter (PAYMENT_WINDOW_SECONDS), so a payment can't land after its
 * hold ends. Holds simply expire, so an abandoned checkout needs no cleanup
 * to free its stock. Stock rows are locked in a fixed order inside a
 * transaction, so two checkouts for the last unit can't both get it, and
 * can't deadlock each other.
 */

export type StockLine = {
  slug: string;
  /** Product name, for messages; the slug is used without it. */
  name?: string;
  color: string | null;
  size: string | null;
  quantity: number;
};

type StockItem = {
  /** "products:<id>" or "variants:<id>". */
  key: string;
  collection: "products" | "variants";
  id: number;
  label: string;
  quantity: number;
};

/**
 * The product or variant row behind each line, with lines that share a row
 * merged, sorted by key so every caller locks rows in the same order.
 */
async function resolveItems(lines: StockLine[], req: PayloadRequest) {
  const items = new Map<string, StockItem>();
  const missing: string[] = [];
  for (const line of lines) {
    const options = [line.color, line.size].filter(Boolean).join(", ");
    const label = `${line.name ?? line.slug}${options ? ` (${options})` : ""}`;
    const { docs } = await req.payload.find({
      collection: "products",
      where: { handle: { equals: line.slug } },
      depth: 2,
      joins: { variants: { limit: 100 } },
      limit: 1,
      req,
    });
    const product = docs[0];
    const variant = product?.enableVariants
      ? matchVariant(product, line.color, line.size)
      : null;
    if (!product || (product.enableVariants && !variant)) {
      missing.push(label);
      continue;
    }
    const collection = variant ? "variants" : "products";
    const id = variant?.id ?? product.id;
    const key = `${collection}:${id}`;
    const existing = items.get(key);
    if (existing) existing.quantity += line.quantity;
    else
      items.set(key, { key, collection, id, label, quantity: line.quantity });
  }
  const sorted = [...items.values()].sort((a, b) => a.key.localeCompare(b.key));
  return { items: sorted, missing };
}

/** Locks the item's row until the transaction ends, then reads its stock. */
async function lockStock(item: StockItem, req: PayloadRequest) {
  const db = await transactionDb(req);
  await db.execute(
    sql`select 1 from ${sql.identifier(DB_SCHEMA)}.${sql.identifier(item.collection)} where id = ${item.id} for update`,
  );
  const current =
    item.collection === "variants"
      ? await req.payload.findByID({
          collection: "variants",
          id: item.id,
          depth: 0,
          req,
        })
      : await req.payload.findByID({
          collection: "products",
          id: item.id,
          depth: 0,
          req,
        });
  return {
    inventory: current.inventory ?? 0,
    managed: !(
      "manageInventory" in current && current.manageInventory === false
    ),
    backorder: "allowBackorder" in current && current.allowBackorder === true,
  };
}

/** Units held by active, unexpired holds, other than `exceptCheckout`'s. */
async function heldUnits(
  key: string,
  req: PayloadRequest,
  exceptCheckout?: string,
) {
  const where: Where[] = [
    { item: { equals: key } },
    { status: { equals: "active" } },
    { expiresAt: { greater_than: new Date().toISOString() } },
  ];
  if (exceptCheckout) where.push({ checkout: { not_equals: exceptCheckout } });
  const { docs } = await req.payload.find({
    collection: "stock-holds",
    where: { and: where },
    pagination: false,
    depth: 0,
    select: { quantity: true },
    req,
  });
  return docs.reduce((sum, hold) => sum + hold.quantity, 0);
}

function shortMessage(label: string, available: number, inStock: boolean) {
  if (available > 0) {
    return `Only ${available} of ${label} left. Lower the quantity in your bag and try again.`;
  }
  return inStock
    ? `${label} is in someone else's checkout right now. If they don't finish, it's back within ${HOLD_MINUTES} minutes.`
    : `${label} just sold out.`;
}

export type HoldResult =
  { ok: true; checkout: string } | { ok: false; message: string };

/**
 * Holds every item in the bag for HOLD_MINUTES, or none of them. `holder`
 * identifies the shopper; their earlier holds are released first, so
 * starting checkout again (a second tap, tab or device) never blocks them.
 */
export async function holdStock(
  lines: StockLine[],
  holder: string,
): Promise<HoldResult> {
  const payload = await getPayloadClient();
  const req = await createLocalReq({}, payload);
  await initTransaction(req);
  try {
    // One checkout at a time per shopper (a double tap, two tabs), so the
    // later one sees, and replaces, the earlier one's hold.
    await lockKey(req, `stock-hold:${holder}`);
    await payload.update({
      collection: "stock-holds",
      where: {
        and: [{ holder: { equals: holder } }, { status: { equals: "active" } }],
      },
      data: { status: "released" },
      depth: 0,
      req,
    });

    const { items, missing } = await resolveItems(lines, req);
    if (missing.length > 0) {
      await killTransaction(req);
      return { ok: false, message: `${missing[0]} is no longer available.` };
    }

    const checkout = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + HOLD_MINUTES * 60_000,
    ).toISOString();
    for (const item of items) {
      const stock = await lockStock(item, req);
      if (!stock.managed || stock.backorder) continue;
      const available = stock.inventory - (await heldUnits(item.key, req));
      if (item.quantity > available) {
        await killTransaction(req);
        return {
          ok: false,
          message: shortMessage(item.label, available, stock.inventory > 0),
        };
      }
      await payload.create({
        collection: "stock-holds",
        data: {
          item: item.key,
          label: item.label,
          quantity: item.quantity,
          status: "active",
          expiresAt,
          checkout,
          holder,
        },
        depth: 0,
        req,
      });
    }
    await commitTransaction(req);
    return { ok: true, checkout };
  } catch (error) {
    await killTransaction(req);
    throw error;
  }
}

/** Links a checkout's holds to its Razorpay order, for when it's paid. */
export async function attachHolds(checkout: string, razorpayOrderId: string) {
  const payload = await getPayloadClient();
  await payload.update({
    collection: "stock-holds",
    where: { checkout: { equals: checkout } },
    data: { razorpayOrderId },
    depth: 0,
  });
}

/** Frees a checkout's holds straight away (e.g. Razorpay order failed). */
export async function releaseHolds(checkout: string) {
  const payload = await getPayloadClient();
  await payload.update({
    collection: "stock-holds",
    where: {
      and: [
        { checkout: { equals: checkout } },
        { status: { equals: "active" } },
      ],
    },
    data: { status: "released" },
    depth: 0,
  });
}

/**
 * Takes sold items out of stock inside the order's transaction, turning the
 * checkout's holds into the sale. Other shoppers' active holds are honoured
 * even if this order's own hold has run out, so a late payment never takes
 * stock promised to someone else. Returns what couldn't be supplied (the
 * payment is already taken by then), for staff to refund; stock never goes
 * below zero.
 */
export async function takeStock(
  lines: StockLine[],
  razorpayOrderId: string,
  req: PayloadRequest,
): Promise<string[]> {
  const { payload } = req;
  const { items, missing } = await resolveItems(lines, req);
  const oversold = missing.map((label) => `${label}: no longer exists`);

  const own = await payload.find({
    collection: "stock-holds",
    where: { razorpayOrderId: { equals: razorpayOrderId } },
    limit: 1,
    depth: 0,
    select: { checkout: true },
    req,
  });
  const checkout = own.docs[0]?.checkout;

  for (const item of items) {
    const stock = await lockStock(item, req);
    if (!stock.managed) continue;
    const available = Math.max(
      0,
      stock.inventory - (await heldUnits(item.key, req, checkout)),
    );
    let taken = item.quantity;
    if (item.quantity > available && !stock.backorder) {
      oversold.push(
        `${item.label}: ${item.quantity} sold, ${available} were available`,
      );
      taken = available;
    }
    if (taken === 0) continue;
    const data = { inventory: Math.max(0, stock.inventory - taken) };
    if (item.collection === "variants") {
      await payload.update({
        collection: "variants",
        id: item.id,
        data,
        depth: 0,
        req,
      });
    } else {
      await payload.update({
        collection: "products",
        id: item.id,
        data,
        depth: 0,
        req,
      });
    }
  }

  if (checkout) {
    await payload.update({
      collection: "stock-holds",
      where: { checkout: { equals: checkout } },
      data: { status: "converted" },
      depth: 0,
      req,
    });
  }
  return oversold;
}

/** Deletes holds that ended over a day ago, to keep the table small. */
export async function purgeOldHolds() {
  const payload = await getPayloadClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { docs } = await payload.delete({
    collection: "stock-holds",
    where: { expiresAt: { less_than: cutoff } },
    depth: 0,
    select: { item: true },
  });
  return docs.length;
}
