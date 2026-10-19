import { describe, expect, it } from "vitest";
import { formatPrice, formatPriceCompact } from "./format";

describe("formatPrice", () => {
  it("formats minor units as rupees by default", () => {
    expect(formatPrice(12999)).toBe("₹129.99");
  });

  it("groups large amounts the Indian way", () => {
    expect(formatPrice(10000000)).toBe("₹1,00,000.00");
  });

  it("handles zero", () => {
    expect(formatPrice(0)).toBe("₹0.00");
  });

  it("respects currency and locale", () => {
    // Intl uses a non-breaking space (U+00A0) before the currency symbol.
    expect(formatPrice(5000, "EUR", "de-DE")).toBe("50,00 €");
  });
});

describe("formatPriceCompact", () => {
  it("drops the fraction for whole amounts", () => {
    expect(formatPriceCompact(499000, "INR")).toBe("₹4,990");
  });

  it("keeps the fraction otherwise", () => {
    expect(formatPriceCompact(12999)).toBe("₹129.99");
  });
});
