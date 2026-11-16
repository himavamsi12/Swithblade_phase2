import { z } from "zod";
import type { ShippingCharge } from "./rates";

/*
 * Razorpay Magic Checkout's "shipping info" call: for each address the shopper
 * enters, say whether we deliver there and at what fee. The fee is the bag's
 * delivery charge (see ./rates); prepaid only (no cash on delivery). Fees are
 * in paise.
 */

const MAX_ADDRESSES = 20;

export const shippingInfoRequest = z.object({
  /** The order's receipt. */
  order_id: z.string().trim().max(64).nullish(),
  /** The Razorpay order id, maybe without its `order_` prefix. */
  razorpay_order_id: z.string().trim().max(64).nullish(),
  addresses: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).transform(String),
        zipcode: z.union([z.string(), z.number()]).transform(String),
        country: z.string().max(2),
      }),
    )
    .max(MAX_ADDRESSES),
});

export type ShippingInfoRequest = z.infer<typeof shippingInfoRequest>;

export type ShippingInfoResponse = {
  addresses: {
    id: string;
    zipcode: string;
    country: string;
    shipping_methods: {
      id: string;
      name: string;
      description: string;
      serviceable: boolean;
      shipping_fee: number;
      cod: boolean;
      cod_fee: number;
    }[];
  }[];
};

const PINCODE = /^[1-9]\d{5}$/;

export async function shippingInfo(
  request: ShippingInfoRequest,
  isServiceable: (pincode: string) => Promise<boolean>,
  charge: ShippingCharge,
): Promise<ShippingInfoResponse> {
  const addresses = await Promise.all(
    request.addresses.map(async ({ id, zipcode, country }) => {
      const pincode = zipcode.trim();
      const serviceable =
        country.toUpperCase() === "IN" &&
        PINCODE.test(pincode) &&
        // If Shiprocket can't be reached, say no rather than take an order
        // we may not be able to deliver.
        (await isServiceable(pincode).catch((error: unknown) => {
          console.error("Shiprocket serviceability check failed", error);
          return false;
        }));
      return {
        id,
        zipcode,
        country,
        shipping_methods: [
          {
            id: "standard",
            name: charge.fee === 0 ? "Free Delivery" : charge.name,
            description: "Delivery in 3–6 business days",
            serviceable,
            shipping_fee: charge.fee,
            cod: false,
            cod_fee: 0,
          },
        ],
      };
    }),
  );
  return { addresses };
}
