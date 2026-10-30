import { describe, expect, it } from "vitest";
import type { Order } from "@/payload-types";
import {
  indianMobile,
  shiprocketDate,
  toShiprocketOrder,
} from "./shiprocket-order";

const order = (over: Partial<Order> = {}): Order =>
  ({
    id: 7,
    displayId: 1007,
    createdAt: "2026-10-19T06:53:41.260Z",
    updatedAt: "2026-10-19T06:53:41.260Z",
    currency: "INR",
    amount: 998000,
    customerEmail: "shopper@example.com",
    totals: { subtotal: 998000 },
    shippingAddress: {
      firstName: "Asha",
      lastName: "Rao",
      addressLine1: "12 MG Road",
      addressLine2: null,
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "IN",
      phone: "+91 98765 43210",
    },
    lineItems: [
      {
        title: "Pink Checkered Blouse",
        options: "Maroon · Size XS",
        productSlug: "pink-checkered-blouse-1",
        unitPrice: 499000,
        quantity: 2,
      },
    ],
    ...over,
  }) as Order;

describe("toShiprocketOrder", () => {
  it("maps a paid order, converting paise to rupees", () => {
    const mapped = toShiprocketOrder(order());
    expect(mapped).toMatchObject({
      ok: true,
      order: {
        order_id: "1007",
        order_date: "2026-10-19 12:23",
        billing_customer_name: "Asha",
        billing_last_name: "Rao",
        billing_pincode: "560001",
        billing_phone: "9876543210",
        payment_method: "Prepaid",
        sub_total: 9980,
        total_discount: 0,
        weight: 1,
        order_items: [
          {
            name: "Pink Checkered Blouse · Maroon · Size XS",
            sku: "pink-checkered-blouse-1:Maroon · Size XS",
            units: 2,
            selling_price: 4990,
          },
        ],
      },
    });
  });

  it("records coupon savings as a discount", () => {
    const mapped = toShiprocketOrder(order({ amount: 948000 }));
    expect(mapped.ok && mapped.order.total_discount).toBe(500);
  });

  it("falls back to the phone the shopper paid with", () => {
    const mapped = toShiprocketOrder(
      order({
        shippingAddress: { ...order().shippingAddress, phone: null },
        metadata: { razorpay: { contact: "+919123456789" } },
      }),
    );
    expect(mapped.ok && mapped.order.billing_phone).toBe("9123456789");
  });

  it("refuses orders it can't ship", () => {
    expect(toShiprocketOrder(order({ shippingAddress: {} }))).toEqual({
      ok: false,
      reason: "Order has no complete shipping address",
    });
    expect(toShiprocketOrder(order({ currency: "USD" })).ok).toBe(false);
    expect(
      toShiprocketOrder(
        order({
          shippingAddress: { ...order().shippingAddress, phone: "12345" },
        }),
      ).ok,
    ).toBe(false);
  });
});

describe("indianMobile", () => {
  it("normalises common formats", () => {
    expect(indianMobile("+91 98765 43210")).toBe("9876543210");
    expect(indianMobile("09876543210")).toBe("9876543210");
    expect(indianMobile("9876543210")).toBe("9876543210");
  });

  it("rejects non-mobile numbers", () => {
    expect(indianMobile("0221234567")).toBeNull();
    expect(indianMobile(null)).toBeNull();
  });

  it("rejects dummy numbers Shiprocket refuses", () => {
    expect(indianMobile("9999999999")).toBeNull();
    expect(indianMobile("+91 7777777777")).toBeNull();
  });
});

describe("shiprocketDate", () => {
  it("formats in India time", () => {
    expect(shiprocketDate("2026-10-19T20:00:00.000Z")).toBe("2026-10-20 01:30");
  });
});
