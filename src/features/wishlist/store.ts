"use client";

import { createLocalStore, useIsClient } from "@/lib/local-store";
import {
  isSaved,
  parseItems,
  removeItem,
  toggleItem,
  type WishlistItem,
} from "./wishlist";

/*
 * Browser-side wishlist, persisted in localStorage and synced across tabs.
 * TEMPORARY until it's saved to the shopper's account.
 */

const EMPTY: WishlistItem[] = [];
const store = createLocalStore("switchblade.wishlist.v1", parseItems, EMPTY);

export const wishlistActions = {
  toggle: (item: WishlistItem) => store.set(toggleItem(store.get(), item)),
  remove: (productId: string) => store.set(removeItem(store.get(), productId)),
};

export function useWishlist() {
  const items = store.useValue();
  return {
    items,
    count: items.length,
    has: (productId: string) => isSaved(items, productId),
    /** False during server render and hydration. */
    ready: useIsClient(),
  };
}
