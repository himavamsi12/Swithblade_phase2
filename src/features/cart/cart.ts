import type { CartItemInput, CartLine } from "./types";

/*
 * Pure cart operations, shared by the browser store and tests. Lines are
 * keyed by product + colour + size, so the same item added twice stacks.
 */

export const MAX_QUANTITY = 10;

export const lineKey = (l: Pick<CartLine, "productId" | "color" | "size">) =>
  [l.productId, l.color ?? "", l.size ?? ""].join("|");

const clamp = (n: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.round(n)));

export function addLine(
  lines: CartLine[],
  item: CartItemInput,
  quantity = 1,
): CartLine[] {
  const key = lineKey(item);
  const existing = lines.find((l) => lineKey(l) === key);
  if (existing) {
    return lines.map((l) =>
      lineKey(l) === key ? { ...l, quantity: clamp(l.quantity + quantity) } : l,
    );
  }
  return [...lines, { ...item, quantity: clamp(quantity) }];
}

export function setLineQuantity(
  lines: CartLine[],
  key: string,
  quantity: number,
): CartLine[] {
  return lines.map((l) =>
    lineKey(l) === key ? { ...l, quantity: clamp(quantity) } : l,
  );
}

/** Applies current catalog prices to every line of the given products. */
export function repriceLines(
  lines: CartLine[],
  prices: { slug: string; price: number; currency: string }[],
): CartLine[] {
  const bySlug = new Map(prices.map((p) => [p.slug, p]));
  return lines.map((l) => {
    const current = bySlug.get(l.slug);
    return current
      ? { ...l, price: current.price, currency: current.currency }
      : l;
  });
}

export const removeLine = (lines: CartLine[], key: string) =>
  lines.filter((l) => lineKey(l) !== key);

export const itemCount = (lines: CartLine[]) =>
  lines.reduce((sum, l) => sum + l.quantity, 0);

/**
 * Subtotal per currency. Normally one entry; kept per currency so a mixed bag
 * never adds rupees to dollars.
 */
export function subtotals(
  lines: CartLine[],
): { currency: string; amount: number }[] {
  const totals = new Map<string, number>();
  for (const l of lines) {
    totals.set(
      l.currency,
      (totals.get(l.currency) ?? 0) + l.price * l.quantity,
    );
  }
  return [...totals].map(([currency, amount]) => ({ currency, amount }));
}

/** Validates data read back from storage; drops anything malformed. */
export function parseLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (l): l is CartLine =>
      typeof l === "object" &&
      l !== null &&
      typeof l.productId === "string" &&
      typeof l.slug === "string" &&
      typeof l.name === "string" &&
      typeof l.price === "number" &&
      Number.isInteger(l.price) &&
      typeof l.currency === "string" &&
      typeof l.quantity === "number" &&
      l.quantity >= 1,
  );
}

/**
 * Adds a guest bag into the one saved on the shopper's account at sign-in.
 * The same item stacks, still capped at MAX_QUANTITY.
 */
export const mergeLines = (saved: CartLine[], guest: CartLine[]) =>
  guest.reduce(
    (lines, { quantity, ...item }) => addLine(lines, item, quantity),
    saved,
  );
