import { describe, expect, it } from "vitest";
import { freeShippingFrom, shippingFor, type ShippingRate } from "./rates";

// ₹99 delivery below ₹1,999, free from ₹1,999 (amounts in paise).
const rates: ShippingRate[] = [
  {
    id: 1,
    name: "Standard delivery",
    amount: 9900,
    minSubtotal: null,
    maxSubtotal: 199899,
  },
  {
    id: 2,
    name: "Free delivery",
    amount: 0,
    minSubtotal: 199900,
    maxSubtotal: null,
  },
];

describe("shippingFor", () => {
  it("charges ₹99 below ₹1,999", () => {
    expect(shippingFor(rates, 199899)).toEqual({
      optionId: 1,
      name: "Standard delivery",
      fee: 9900,
    });
  });

  it("is free from ₹1,999", () => {
    expect(shippingFor(rates, 199900)).toEqual({
      optionId: 2,
      name: "Free delivery",
      fee: 0,
    });
    expect(shippingFor(rates, 500000).fee).toBe(0);
  });

  it("picks the cheapest option that fits", () => {
    const overlapping = [
      ...rates,
      {
        id: 3,
        name: "Express",
        amount: 19900,
        minSubtotal: null,
        maxSubtotal: null,
      },
    ];
    expect(shippingFor(overlapping, 100000).fee).toBe(9900);
  });

  it("is free when no options are set up", () => {
    expect(shippingFor([], 100000)).toMatchObject({ optionId: null, fee: 0 });
  });
});

describe("freeShippingFrom", () => {
  it("is the lowest subtotal with free delivery", () => {
    expect(freeShippingFrom(rates)).toBe(199900);
  });

  it("is null without a free option", () => {
    expect(freeShippingFrom([rates[0]!])).toBeNull();
  });
});
