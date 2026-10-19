import { describe, expect, it } from "vitest";
import type { Product } from "@/features/catalog/types";
import { decodeCartNotes, encodeCartNotes, priceCart } from "./pricing";

const product = (over: Partial<Product> = {}): Product => ({
  id: "p1",
  slug: "vest",
  name: "Blocked Fleece Vest",
  description: "",
  price: 25000,
  currency: "INR",
  image: null,
  inStock: true,
  collections: [],
  gallery: [],
  colors: [],
  sizes: [
    { label: "S", available: true },
    { label: "M", available: false },
  ],
  details: "",
  shippingReturns: "",
  ...over,
});

const item = {
  slug: "vest",
  color: null,
  size: "S",
  quantity: 2,
  price: 25000,
  currency: "INR",
};

describe("priceCart", () => {
  it("charges catalog prices, not browser ones", () => {
    const cart = priceCart([item], new Map([["vest", product()]]));
    expect(cart).toMatchObject({ ok: true, currency: "INR", total: 50000 });
  });

  it("rejects missing, out-of-stock and unavailable-size items", () => {
    expect(priceCart([item], new Map([["vest", null]])).ok).toBe(false);
    expect(
      priceCart([item], new Map([["vest", product({ inStock: false })]])).ok,
    ).toBe(false);
    expect(
      priceCart([{ ...item, size: "M" }], new Map([["vest", product()]])).ok,
    ).toBe(false);
  });

  it("flags a bag saved with old prices and returns the current ones", () => {
    const cart = priceCart(
      [{ ...item, price: 24500, currency: "USD" }],
      new Map([["vest", product()]]),
    );
    expect(cart).toMatchObject({
      ok: false,
      repriced: [{ slug: "vest", price: 25000, currency: "INR" }],
    });
  });

  it("rejects an empty bag and mixed currencies", () => {
    expect(priceCart([], new Map()).ok).toBe(false);
    const products = new Map([
      ["vest", product()],
      ["tee", product({ slug: "tee", currency: "USD" })],
    ]);
    const tee = { ...item, slug: "tee", currency: "USD" };
    expect(priceCart([item, tee], products).ok).toBe(false);
  });
});

describe("cart notes", () => {
  it("round-trips the bag through Razorpay notes", () => {
    const cart = priceCart([item], new Map([["vest", product()]]));
    if (!cart.ok) throw new Error("expected a priced cart");
    const notes = encodeCartNotes(cart.lines);
    expect(Object.values(notes!).every((v) => v.length <= 256)).toBe(true);
    expect(decodeCartNotes({ ...notes, customer: "7" })).toEqual([
      { slug: "vest", color: null, size: "S", quantity: 2, unitPrice: 25000 },
    ]);
  });

  it("refuses bags too large for the notes, and garbage notes", () => {
    const line = {
      product: product({ slug: "x".repeat(200) }),
      color: null,
      size: null,
      quantity: 1,
      unitPrice: 1,
    };
    expect(encodeCartNotes(Array(30).fill(line))).toBeNull();
    expect(decodeCartNotes({ cart0: "not json" })).toBeNull();
    expect(decodeCartNotes(undefined)).toBeNull();
  });
});
