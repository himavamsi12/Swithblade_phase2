"use client";

import { createLocalStore, useIsClient } from "@/lib/local-store";
import {
  addLine,
  itemCount,
  lineKey,
  parseLines,
  removeLine,
  repriceLines,
  setLineQuantity,
} from "./cart";
import type { CartItemInput, CartLine } from "./types";

/*
 * Browser-side bag, persisted in localStorage and synced across tabs.
 * TEMPORARY until the bag moves to Payload's carts collection at checkout.
 */

const EMPTY: CartLine[] = [];
const store = createLocalStore("switchblade.bag.v1", parseLines, EMPTY);

export const cartActions = {
  add: (item: CartItemInput, quantity = 1) =>
    store.set(addLine(store.get(), item, quantity)),
  setQuantity: (key: string, quantity: number) =>
    store.set(setLineQuantity(store.get(), key, quantity)),
  remove: (key: string) => store.set(removeLine(store.get(), key)),
  reprice: (prices: Parameters<typeof repriceLines>[1]) =>
    store.set(repriceLines(store.get(), prices)),
  clear: () => store.set(EMPTY),
};

export function useCart() {
  const lines = store.useValue();
  return {
    lines,
    count: itemCount(lines),
    /** False during server render and hydration; the bag isn't known yet. */
    ready: useIsClient(),
  };
}

export { lineKey };
