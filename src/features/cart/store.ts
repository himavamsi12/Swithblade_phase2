"use client";

import { createLocalStore, useIsClient } from "@/lib/local-store";
import { loadSavedBag, saveBag } from "./actions";
import {
  addLine,
  itemCount,
  lineKey,
  mergeLines,
  parseLines,
  removeLine,
  repriceLines,
  setLineQuantity,
} from "./cart";
import type { CartItemInput, CartLine } from "./types";

/*
 * The bag, kept in localStorage and synced across tabs. For a signed-in
 * shopper it is also saved on their account, so every device shows the same
 * bag; a guest's bag stays in this browser.
 */

const EMPTY: CartLine[] = [];
const store = createLocalStore("switchblade.bag.v1", parseLines, EMPTY);

/** The customer whose saved bag this browser holds; null for a guest bag. */
const owner = createLocalStore<number | null>(
  "switchblade.bag.owner.v1",
  (v) => (Number.isInteger(v) ? (v as number) : null),
  null,
);

const SAVE_DELAY_MS = 500;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saving: Promise<unknown> = Promise.resolve();
let syncing: Promise<void> | null = null;

function save() {
  saveTimer = undefined;
  saving = saveBag(store.get()).catch(() => false);
}

/** Applies a change made on this page, saving it to the account if signed in. */
function commit(next: CartLine[]) {
  store.set(next);
  if (owner.get() === null) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, SAVE_DELAY_MS);
}

export const cartActions = {
  add: (item: CartItemInput, quantity = 1) =>
    commit(addLine(store.get(), item, quantity)),
  setQuantity: (key: string, quantity: number) =>
    commit(setLineQuantity(store.get(), key, quantity)),
  remove: (key: string) => commit(removeLine(store.get(), key)),
  reprice: (prices: Parameters<typeof repriceLines>[1]) =>
    commit(repriceLines(store.get(), prices)),
  clear: () => commit(EMPTY),
};

/**
 * Brings this browser's bag in line with the account. Signing in merges the
 * guest bag into the saved one; signing out empties the bag here (it stays on
 * the account). Concurrent calls share one request.
 */
export function syncBag(): Promise<void> {
  syncing ??= pull().finally(() => {
    syncing = null;
  });
  return syncing;
}

async function pull() {
  // An edit waiting to be saved is newer than the account's copy.
  if (saveTimer) return;
  await saving;
  // undefined: offline or a server error, so leave the bag as it is.
  const saved = await loadSavedBag().catch(() => undefined);
  if (saved === undefined || saveTimer) return;

  if (!saved) {
    if (owner.get() !== null) {
      owner.set(null);
      store.set(EMPTY);
    }
    return;
  }

  const local = store.get();
  const fromGuest = owner.get() === null && local.length > 0;
  owner.set(saved.customerId);
  if (fromGuest) {
    store.set(mergeLines(saved.lines, local));
    save();
  } else {
    store.set(saved.lines);
  }
}

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
