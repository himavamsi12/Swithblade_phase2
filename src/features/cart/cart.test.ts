import { describe, expect, it } from "vitest";
import {
  addLine,
  itemCount,
  lineKey,
  MAX_QUANTITY,
  mergeLines,
  parseLines,
  removeLine,
  repriceLines,
  setLineQuantity,
  subtotals,
} from "./cart";
import type { CartItemInput } from "./types";

const vest: CartItemInput = {
  productId: "p1",
  slug: "vest",
  name: "Blocked Fleece Vest",
  image: null,
  price: 25000,
  currency: "USD",
  color: "Maroon",
  size: "XS",
};

describe("cart", () => {
  it("stacks the same product, colour and size", () => {
    const lines = addLine(addLine([], vest), vest, 2);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.quantity).toBe(3);
  });

  it("keeps different sizes as separate lines", () => {
    const lines = addLine(addLine([], vest), { ...vest, size: "M" });
    expect(lines).toHaveLength(2);
    expect(itemCount(lines)).toBe(2);
  });

  it("clamps quantity between 1 and the maximum", () => {
    const key = lineKey(vest);
    const lines = addLine([], vest);
    expect(setLineQuantity(lines, key, 0)[0]!.quantity).toBe(1);
    expect(setLineQuantity(lines, key, 99)[0]!.quantity).toBe(MAX_QUANTITY);
  });

  it("removes a line", () => {
    expect(removeLine(addLine([], vest), lineKey(vest))).toEqual([]);
  });

  it("totals per currency in minor units", () => {
    const lines = addLine(addLine([], vest, 2), {
      ...vest,
      productId: "p2",
      currency: "INR",
      price: 499000,
    });
    expect(subtotals(lines)).toEqual([
      { currency: "USD", amount: 50000 },
      { currency: "INR", amount: 499000 },
    ]);
  });

  it("drops malformed stored data", () => {
    expect(parseLines("nope")).toEqual([]);
    expect(
      parseLines([{ ...vest, quantity: 1 }, { productId: 1 }, null]),
    ).toHaveLength(1);
    expect(parseLines([{ ...vest, quantity: 1, price: 1.5 }])).toEqual([]);
  });
});

describe("repriceLines", () => {
  it("updates every line of a product to its current price", () => {
    const lines = repriceLines(
      [
        { ...vest, quantity: 1 },
        { ...vest, size: "S", quantity: 1 },
      ],
      [{ slug: "vest", price: 499000, currency: "INR" }],
    );
    expect(lines.map((l) => [l.price, l.currency])).toEqual([
      [499000, "INR"],
      [499000, "INR"],
    ]);
  });
});

describe("mergeLines", () => {
  it("adds a guest bag into the saved one at sign-in", () => {
    const saved = addLine([], vest, 2);
    const guest = addLine(addLine([], vest, MAX_QUANTITY), {
      ...vest,
      size: "M",
    });
    const merged = mergeLines(saved, guest);
    expect(merged.map((l) => [l.size, l.quantity])).toEqual([
      ["XS", MAX_QUANTITY],
      ["M", 1],
    ]);
  });
});
