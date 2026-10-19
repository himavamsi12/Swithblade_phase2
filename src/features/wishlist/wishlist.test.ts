import { describe, expect, it } from "vitest";
import {
  isSaved,
  MAX_WISHLIST_ITEMS,
  parseItems,
  removeItem,
  toggleItem,
  type WishlistItem,
} from "./wishlist";

const item = (id: string): WishlistItem => ({
  productId: id,
  slug: `p-${id}`,
  name: "Pink Checkered Blouse",
  image: null,
  price: 24500,
  currency: "USD",
  inStock: true,
  colors: [{ name: "Maroon", swatch: "#4b1f1f" }],
  sizes: [{ label: "XS", available: true }],
});

describe("wishlist", () => {
  it("toggles a product on and off", () => {
    const saved = toggleItem([], item("a"));
    expect(isSaved(saved, "a")).toBe(true);
    expect(toggleItem(saved, item("a"))).toEqual([]);
  });

  it("puts the newest first", () => {
    const items = toggleItem(toggleItem([], item("a")), item("b"));
    expect(items.map((i) => i.productId)).toEqual(["b", "a"]);
  });

  it("removes by product id", () => {
    expect(
      removeItem([item("a"), item("b")], "a").map((i) => i.productId),
    ).toEqual(["b"]);
  });

  it("caps the list size", () => {
    let items: WishlistItem[] = [];
    for (let n = 0; n < MAX_WISHLIST_ITEMS + 5; n++)
      items = toggleItem(items, item(String(n)));
    expect(items).toHaveLength(MAX_WISHLIST_ITEMS);
  });

  it("drops malformed stored data", () => {
    expect(parseItems("nope")).toEqual([]);
    expect(parseItems([item("a"), { productId: 1 }, null])).toHaveLength(1);
  });
});
