import type {
  ImageFrame,
  ProductColor,
  ProductSize,
} from "@/features/catalog/types";

/** What the wishlist keeps about a saved product: enough to show and buy it. */
export type WishlistItem = {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  imageFrame?: ImageFrame;
  /** Integer minor units (cents). */
  price: number;
  currency: string;
  inStock: boolean;
  colors: ProductColor[];
  sizes: ProductSize[];
};

export const MAX_WISHLIST_ITEMS = 100;

export const isSaved = (items: WishlistItem[], productId: string) =>
  items.some((i) => i.productId === productId);

/** Adds the product (newest first) or removes it if already saved. */
export function toggleItem(
  items: WishlistItem[],
  item: WishlistItem,
): WishlistItem[] {
  return isSaved(items, item.productId)
    ? removeItem(items, item.productId)
    : [item, ...items].slice(0, MAX_WISHLIST_ITEMS);
}

export const removeItem = (items: WishlistItem[], productId: string) =>
  items.filter((i) => i.productId !== productId);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/** Validates data read back from storage; drops anything malformed. */
export function parseItems(value: unknown): WishlistItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (i): i is WishlistItem =>
      isRecord(i) &&
      typeof i.productId === "string" &&
      typeof i.slug === "string" &&
      typeof i.name === "string" &&
      typeof i.price === "number" &&
      Number.isInteger(i.price) &&
      typeof i.currency === "string" &&
      typeof i.inStock === "boolean" &&
      Array.isArray(i.colors) &&
      Array.isArray(i.sizes),
  );
}
