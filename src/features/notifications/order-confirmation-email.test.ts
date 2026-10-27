import { describe, expect, it, vi } from "vitest";
import type { Order } from "@/payload-types";

vi.mock("@/config/site", () => ({
  siteConfig: {
    name: "Swithblade",
    url: "https://shop.example",
    accountHref: "/account",
  },
}));

const { orderConfirmationEmail, orderNumber } =
  await import("./order-confirmation-email");

const order = {
  id: 7,
  displayId: 1001,
  currency: "INR",
  amount: 899000,
  totals: { subtotal: 998000, discountTotal: 99000 },
  shippingAddress: {
    firstName: "Asha",
    lastName: "Rao",
    addressLine1: "12 <MG> Road",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560001",
    phone: "9876543210",
  },
  lineItems: [
    {
      title: "Loop Sweatshirt",
      options: "Maroon · Size M",
      unitPrice: 499000,
      quantity: 2,
      image: "/images/loop.jpg",
    },
  ],
} as Order;

describe("orderConfirmationEmail", () => {
  const email = orderConfirmationEmail(order);

  it("names the order in the subject", () => {
    expect(email.subject).toBe("Your Swithblade order SB-1001 is confirmed");
  });

  it("lists items and totals in the text version", () => {
    expect(email.text).toContain("2 × Loop Sweatshirt (Maroon · Size M)");
    expect(email.text).toContain("Total paid: ₹8,990.00");
    expect(email.text).toContain("Discount: −₹990.00");
  });

  it("escapes shopper input and links thumbnails absolutely", () => {
    expect(email.html).toContain("12 &lt;MG&gt; Road");
    expect(email.html).toContain(
      'src="https://shop.example/_next/image?url=%2Fimages%2Floop.jpg&amp;w=256&amp;q=75"',
    );
  });
});

describe("orderNumber", () => {
  it("falls back to the id without a display id", () => {
    expect(orderNumber({ id: 7, displayId: null })).toBe("SB-7");
  });
});
