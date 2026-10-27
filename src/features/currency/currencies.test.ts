import { describe, expect, it } from "vitest";
import { convert, type Rates } from "./currencies";

const rates: Rates = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  AED: 0.044,
};

describe("convert", () => {
  it("converts rupee minor units to the target currency", () => {
    expect(convert(499000, "INR", "USD", rates)).toBe(5988);
  });

  it("returns the amount unchanged for the same currency", () => {
    expect(convert(12345, "USD", "USD", rates)).toBe(12345);
  });

  it("converts between two non-INR currencies via INR", () => {
    expect(convert(1200, "USD", "EUR", rates)).toBe(1100);
  });

  it("returns null for an unknown source currency", () => {
    expect(convert(100, "JPY", "USD", rates)).toBeNull();
  });
});
