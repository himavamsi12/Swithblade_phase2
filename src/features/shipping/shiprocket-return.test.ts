import { describe, expect, it } from "vitest";
import type { Order, Return } from "@/payload-types";
import {
  returnIdOf,
  returnOrderId,
  toShiprocketReturn,
} from "./shiprocket-return";

const order = (over: Partial<Order> = {}): Order =>
  ({
    id: 7,
    displayId: 1007,
    createdAt: "2026-10-19T06:53:41.260Z",
    currency: "INR",
    customerEmail: "shopper@example.com",
    shippingAddress: {
      firstName: "Asha",
      lastName: "Rao",
      addressLine1: "12 MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "IN",
      phone: "+91 98765 43210",
    },
    lineItems: [
      {
        title: "Checkered Blouse",
        options: "Maroon · Size XS",
        productSlug: "checkered-blouse",
        unitPrice: 499000,
        quantity: 2,
      },
      {
        title: "Checkered Blouse",
        options: "Maroon · Size M",
        productSlug: "checkered-blouse",
        unitPrice: 499000,
        quantity: 1,
      },
    ],
    ...over,
  }) as Order;

const variant = (...labels: string[]) => ({
  id: 1,
  options: labels.map((label, i) => ({ id: i, label })),
});

const ret = (items: Partial<Return["items"][number]>[]): Return =>
  ({
    id: 3,
    status: "requested",
    createdAt: "2026-10-25T04:30:00.000Z",
    items: items.map((i) => ({
      product: { id: 1, title: "Checkered Blouse", handle: "checkered-blouse" },
      quantity: 1,
      ...i,
    })),
  }) as Return;

describe("toShiprocketReturn", () => {
  it("collects from the shopper's address, priced in rupees", () => {
    const mapped = toShiprocketReturn(ret([{}]), order());
    expect(mapped).toMatchObject({
      ok: true,
      order: {
        order_id: "1007-R3",
        order_date: "2026-10-25 10:00",
        pickup_customer_name: "Asha",
        pickup_pincode: "560001",
        pickup_phone: "9876543210",
        payment_method: "PREPAID",
        sub_total: 4990,
        weight: 0.5,
      },
    });
  });

  it("matches the variant to the line it was bought as", () => {
    const mapped = toShiprocketReturn(
      ret([{ variant: variant("Maroon", "M") as never }]),
      order(),
    );
    expect(mapped.ok && mapped.order.order_items).toEqual([
      expect.objectContaining({
        name: "Checkered Blouse · Maroon · Size M",
        sku: "checkered-blouse:Maroon · Size M",
        units: 1,
      }),
    ]);
  });

  it("refuses more units than were bought", () => {
    const mapped = toShiprocketReturn(
      ret([{ quantity: 2, variant: variant("Maroon", "M") as never }]),
      order(),
    );
    expect(mapped).toMatchObject({ ok: false });
  });

  it("refuses a product that isn't in the order", () => {
    const mapped = toShiprocketReturn(
      ret([{ product: { id: 2, title: "Cap", handle: "cap" } as never }]),
      order(),
    );
    expect(mapped).toEqual({ ok: false, reason: "Cap isn't in this order" });
  });

  it("refuses orders outside India", () => {
    const mapped = toShiprocketReturn(ret([{}]), order({ currency: "USD" }));
    expect(mapped).toMatchObject({ ok: false });
  });
});

describe("return order ids", () => {
  it("round-trips and never looks like an outbound order", () => {
    expect(returnIdOf(returnOrderId(1007, 3))).toBe(3);
    expect(returnIdOf("1007")).toBeNull();
    expect(returnIdOf(1007)).toBeNull();
    expect(Number(returnOrderId(1007, 3))).toBeNaN();
  });
});
