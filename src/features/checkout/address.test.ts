import { describe, expect, it } from "vitest";
import {
  decodeAddressNotes,
  deliveryAddressSchema,
  encodeAddressNotes,
} from "./address";

const input = {
  email: " Asha@Example.com ",
  fullName: "Asha Rao",
  phone: "+91 98765 43210",
  addressLine1: "Flat 117, Kondapur",
  addressLine2: "",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "500084",
};

describe("deliveryAddressSchema", () => {
  it("normalises the phone and blank optional lines", () => {
    expect(deliveryAddressSchema.parse(input)).toMatchObject({
      email: "asha@example.com",
      phone: "9876543210",
      addressLine2: null,
    });
  });

  it("rejects bad phones and PIN codes with field messages", () => {
    const result = deliveryAddressSchema.safeParse({
      ...input,
      phone: "12345",
      pincode: "50008",
    });
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["phone", "pincode"]));
  });
});

describe("address notes", () => {
  it("round-trips into Magic Checkout's shipping_address shape", () => {
    const notes = encodeAddressNotes(deliveryAddressSchema.parse(input));
    expect(decodeAddressNotes({ ...notes, cart0: "[]" })).toEqual({
      name: "Asha Rao",
      contact: "9876543210",
      line1: "Flat 117, Kondapur",
      line2: null,
      city: "Hyderabad",
      state: "Telangana",
      zipcode: "500084",
      country: "IN",
    });
  });

  it("splits long addresses across both note keys", () => {
    const notes = encodeAddressNotes(
      deliveryAddressSchema.parse({
        ...input,
        addressLine1: "a".repeat(120),
        addressLine2: "b".repeat(120),
      }),
    );
    expect(Object.keys(notes ?? {})).toEqual(["ship0", "ship1"]);
    expect(decodeAddressNotes(notes)?.line2).toBe("b".repeat(120));
  });

  it("refuses addresses that escape past the notes limit", () => {
    const quoted = '"'.repeat(120);
    expect(
      encodeAddressNotes(
        deliveryAddressSchema.parse({
          ...input,
          fullName: quoted.slice(0, 80),
          addressLine1: quoted,
          addressLine2: quoted,
        }),
      ),
    ).toBeNull();
  });

  it("ignores orders without an address", () => {
    expect(decodeAddressNotes({ cart0: "[]" })).toBeNull();
    expect(decodeAddressNotes(undefined)).toBeNull();
  });
});
