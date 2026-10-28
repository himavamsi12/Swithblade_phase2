import type { Product } from "@/features/catalog/types";

/**
 * What the browser sends. `price` and `currency` are what the shopper was
 * shown; they only detect a stale bag and are never charged.
 */
export type CheckoutItem = {
  slug: string;
  color: string | null;
  size: string | null;
  quantity: number;
  price: number;
  currency: string;
};

/** A product's current price, for updating a stale bag. */
export type CurrentPrice = { slug: string; price: number; currency: string };

export type PricedLine = {
  product: Product;
  color: string | null;
  size: string | null;
  quantity: number;
  /** Unit price, integer minor units, from the catalog. */
  unitPrice: number;
};

export type PricedCart =
  | { ok: true; lines: PricedLine[]; currency: string; total: number }
  | { ok: false; message: string; repriced?: CurrentPrice[] };

/**
 * Prices the bag from catalog data so a tampered browser can't change what
 * is charged. `products` maps slug to the current product (or null if gone).
 */
export function priceCart(
  items: CheckoutItem[],
  products: Map<string, Product | null>,
): PricedCart {
  if (items.length === 0) return { ok: false, message: "Your bag is empty." };

  const lines: PricedLine[] = [];
  for (const item of items) {
    const product = products.get(item.slug);
    if (!product || !product.inStock) {
      return { ok: false, message: "An item in your bag is unavailable." };
    }
    if (product.variants) {
      // Stock is per colour/size combination.
      const variant = product.variants.find(
        (v) =>
          v.color === (item.color || null) && v.size === (item.size || null),
      );
      if (!variant?.available) {
        const option = [item.color, item.size].filter(Boolean).join(", ");
        return {
          ok: false,
          message: option
            ? `${product.name} is no longer available in ${option}.`
            : `${product.name} is no longer available.`,
        };
      }
    } else if (
      item.size &&
      product.sizes.length > 0 &&
      !product.sizes.some((s) => s.label === item.size && s.available)
    ) {
      return {
        ok: false,
        message: `${product.name} is no longer available in ${item.size}.`,
      };
    }
    lines.push({
      product,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      unitPrice: product.price,
    });
  }

  // The bag was saved with old prices: charging now would surprise the shopper.
  const stale = items.filter((item) => {
    const product = products.get(item.slug)!;
    return item.price !== product.price || item.currency !== product.currency;
  });
  if (stale.length > 0) {
    return {
      ok: false,
      message: "Prices in your bag have changed. Please review your total.",
      repriced: [...new Set(stale.map((i) => i.slug))].map((slug) => {
        const { price, currency } = products.get(slug)!;
        return { slug, price, currency };
      }),
    };
  }

  const currencies = new Set(lines.map((l) => l.product.currency));
  if (currencies.size > 1) {
    return {
      ok: false,
      message: "Items in different currencies can't be paid for together.",
    };
  }

  return {
    ok: true,
    lines,
    currency: lines[0]!.product.currency,
    total: lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
  };
}

/** What we keep about each line once paid: enough to rebuild the order. */
export type LineSnapshot = {
  slug: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unitPrice: number;
};

/*
 * The bag is snapshotted into the Razorpay order's notes, which only our
 * server (holding the key secret) can write. Notes allow 15 keys of up to
 * 256 characters, so the JSON is split across `cart0`, `cart1`, … leaving one
 * key each for the customer id and contact email, and two for the delivery
 * address (see address.ts).
 */
const NOTE_CHUNK = 255;
const MAX_CART_NOTES = 11;

export function encodeCartNotes(
  lines: PricedLine[],
): Record<string, string> | null {
  const json = JSON.stringify(
    lines.map((l) => [
      l.product.slug,
      l.color,
      l.size,
      l.quantity,
      l.unitPrice,
    ]),
  );
  const chunks = Math.ceil(json.length / NOTE_CHUNK);
  if (chunks > MAX_CART_NOTES) return null;
  return Object.fromEntries(
    Array.from({ length: chunks }, (_, i) => [
      `cart${i}`,
      json.slice(i * NOTE_CHUNK, (i + 1) * NOTE_CHUNK),
    ]),
  );
}

const nullableString = (v: unknown) => (typeof v === "string" ? v : null);

export function decodeCartNotes(notes: unknown): LineSnapshot[] | null {
  if (typeof notes !== "object" || notes === null) return null;
  const record = notes as Record<string, unknown>;
  let json = "";
  for (let i = 0; typeof record[`cart${i}`] === "string"; i++) {
    json += record[`cart${i}`];
  }
  try {
    const rows: unknown = JSON.parse(json);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const lines = rows.map((row): LineSnapshot | null => {
      if (!Array.isArray(row)) return null;
      const [slug, color, size, quantity, unitPrice] = row as unknown[];
      if (
        typeof slug !== "string" ||
        !Number.isInteger(quantity) ||
        !Number.isInteger(unitPrice)
      ) {
        return null;
      }
      return {
        slug,
        color: nullableString(color),
        size: nullableString(size),
        quantity: quantity as number,
        unitPrice: unitPrice as number,
      };
    });
    return lines.every((l) => l !== null) ? (lines as LineSnapshot[]) : null;
  } catch {
    return null;
  }
}
