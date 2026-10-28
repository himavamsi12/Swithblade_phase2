"use server";

import { getSignedInCustomer } from "@/features/account/customer";
import { rateLimit } from "@/lib/rate-limit";
import { parseLines } from "./cart";
import { saveCustomerBag } from "./repository";
import type { CartLine } from "./types";

/** Keeps a bag a person could really fill; anything bigger is refused. */
const MAX_LINES = 50;
const MAX_BYTES = 50_000;

export type SavedBag = { customerId: number; lines: CartLine[] } | null;

/** The signed-in shopper's saved bag, or null for guests. */
export async function loadSavedBag(): Promise<SavedBag> {
  const session = await getSignedInCustomer();
  if (!session) return null;
  return {
    customerId: session.customer.id,
    lines: parseLines(session.customer.bag),
  };
}

/** Saves the bag to the signed-in shopper's account. False if not saved. */
export async function saveBag(lines: unknown): Promise<boolean> {
  const session = await getSignedInCustomer();
  if (!session) return false;
  const parsed = parseLines(lines);
  if (
    parsed.length > MAX_LINES ||
    JSON.stringify(parsed).length > MAX_BYTES ||
    !(await rateLimit("bagSave", String(session.customer.id)))
  ) {
    return false;
  }
  await saveCustomerBag(session.customer.id, parsed);
  return true;
}
