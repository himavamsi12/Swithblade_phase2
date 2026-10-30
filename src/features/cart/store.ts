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

/** One edit to the bag, replayable on any copy of it. */
type Edit = (lines: CartLine[]) => CartLine[];

/** Edits made here and not yet saved to the account. */
let unsaved: Edit[] = [];

const replay = (lines: CartLine[], edits: Edit[]) =>
  edits.reduce((acc, edit) => edit(acc), lines);

/**
 * Saves this page's edits to the account. They are replayed on the account's
 * latest bag rather than sending this page's whole bag, so items another
 * device added or removed since this page last synced are kept.
 */
function save() {
  saveTimer = undefined;
  const edits = unsaved;
  const local = store.get();
  unsaved = [];
  saving = (async () => {
    // undefined: offline or a server error, so fall back to this page's bag.
    const saved = await loadSavedBag().catch(() => undefined);
    if (saved === null) return; // Signed out meanwhile: nothing to save.
    const next = saved ? replay(saved.lines, edits) : local;
    // Edits made while the account was being read go on top.
    store.set(replay(next, unsaved));
    await saveBag(next);
  })().catch(() => false);
}

/** Applies an edit made on this page, saving it to the account if signed in. */
function commit(edit: Edit) {
  store.set(edit(store.get()));
  if (owner.get() === null) return;
  unsaved.push(edit);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, SAVE_DELAY_MS);
}

export const cartActions = {
  add: (item: CartItemInput, quantity = 1) =>
    commit((lines) => addLine(lines, item, quantity)),
  setQuantity: (key: string, quantity: number) =>
    commit((lines) => setLineQuantity(lines, key, quantity)),
  remove: (key: string) => commit((lines) => removeLine(lines, key)),
  reprice: (prices: Parameters<typeof repriceLines>[1]) =>
    commit((lines) => repriceLines(lines, prices)),
  clear: () => commit(() => EMPTY),
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
    const merge: Edit = (lines) => mergeLines(lines, local);
    store.set(merge(saved.lines));
    unsaved.push(merge);
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
