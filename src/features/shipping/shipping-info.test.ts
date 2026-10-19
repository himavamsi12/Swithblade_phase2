import { describe, expect, it, vi } from "vitest";
import { shippingInfo, shippingInfoRequest } from "./shipping-info";

const request = (addresses: unknown[]) =>
  shippingInfoRequest.parse({ addresses });

describe("shippingInfo", () => {
  it("offers free prepaid delivery where Shiprocket serves the pincode", async () => {
    const check = vi.fn(async (pin: string) => pin === "560001");
    const res = await shippingInfo(
      request([
        { id: "a1", zipcode: "560001", country: "IN" },
        { id: "a2", zipcode: 999999, country: "IN" },
      ]),
      check,
    );
    expect(res.addresses).toMatchObject([
      {
        id: "a1",
        shipping_methods: [
          { serviceable: true, shipping_fee: 0, cod: false, cod_fee: 0 },
        ],
      },
      { id: "a2", shipping_methods: [{ serviceable: false }] },
    ]);
  });

  it("skips the lookup for foreign or malformed pincodes", async () => {
    const check = vi.fn(async () => true);
    const res = await shippingInfo(
      request([
        { id: "a1", zipcode: "10001", country: "US" },
        { id: "a2", zipcode: "56000", country: "IN" },
      ]),
      check,
    );
    expect(check).not.toHaveBeenCalled();
    expect(
      res.addresses.every((a) => !a.shipping_methods[0]?.serviceable),
    ).toBe(true);
  });

  it("says not serviceable when Shiprocket is unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await shippingInfo(
      request([{ id: "a1", zipcode: "560001", country: "IN" }]),
      async () => {
        throw new Error("timeout");
      },
    );
    expect(res.addresses[0]?.shipping_methods[0]?.serviceable).toBe(false);
  });
});
