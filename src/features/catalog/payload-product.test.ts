import { describe, expect, it } from "vitest";
import type {
  Media,
  Product as PayloadProduct,
  Variant,
  VariantOption,
  VariantType,
} from "@/payload-types";
import {
  matchVariant,
  mediaPath,
  toStorefrontProduct,
  variantAvailable,
} from "./payload-product";

const ORIGIN = "https://shop.example";
const at = "2026-10-01T00:00:00.000Z";

let mediaId = 0;
const media = (name: string): Media => ({
  id: ++mediaId,
  alt: name,
  url: `${ORIGIN}/api/media/file/${name}.jpg`,
  sizes: { card: { url: `${ORIGIN}/api/media/file/${name}-700.jpg` } },
  createdAt: at,
  updatedAt: at,
});

const colorType: VariantType = {
  id: 1,
  name: "color",
  label: "Color",
  createdAt: at,
  updatedAt: at,
};
const sizeType: VariantType = {
  id: 2,
  name: "size",
  label: "Size",
  createdAt: at,
  updatedAt: at,
};
const option = (
  id: number,
  type: VariantType,
  label: string,
  order: string,
  swatch?: string,
): VariantOption => ({
  id,
  variantType: type.id,
  label,
  value: label.toLowerCase(),
  swatch,
  _variantOptions_options_order: order,
  createdAt: at,
  updatedAt: at,
});
const navy = option(10, colorType, "Navy", "a1", "#1f2a44");
const black = option(11, colorType, "Black", "a0");
const small = option(20, sizeType, "S", "b0");
const medium = option(21, sizeType, "M", "b1");

const variant = (
  id: number,
  options: VariantOption[],
  stock: Partial<Variant> = {},
): Variant => ({
  id,
  product: 1,
  options,
  inventory: 3,
  createdAt: at,
  updatedAt: at,
  ...stock,
});

const front = media("front");

const doc = (over: Partial<PayloadProduct> = {}): PayloadProduct => ({
  id: 1,
  title: "Blocked Fleece Vest",
  handle: "blocked-fleece-vest",
  priceInINREnabled: true,
  priceInINR: 249900,
  inventory: 5,
  discountable: true,
  highlighted: false,
  thumbnail: front,
  images: [front, media("model")],
  createdAt: at,
  updatedAt: at,
  ...over,
});

const withVariants = doc({
  enableVariants: true,
  variantTypes: [colorType, sizeType],
  variants: {
    docs: [
      variant(100, [navy, small]),
      variant(101, [navy, medium], { inventory: 0 }),
      variant(102, [black, small], { inventory: 0, allowBackorder: true }),
    ],
  },
});

describe("toStorefrontProduct", () => {
  it("maps a simple product, with same-site media as paths", () => {
    expect(toStorefrontProduct(doc(), ORIGIN)).toMatchObject({
      id: "1",
      slug: "blocked-fleece-vest",
      price: 249900,
      currency: "INR",
      image: "/api/media/file/front-700.jpg",
      hoverImage: "/api/media/file/model.jpg",
      inStock: true,
      colors: [],
      sizes: [],
    });
    expect(toStorefrontProduct(doc(), ORIGIN)?.variants).toBeUndefined();
  });

  it("can't sell a product without an INR price or a handle", () => {
    expect(toStorefrontProduct(doc({ priceInINREnabled: false }))).toBeNull();
    expect(toStorefrontProduct(doc({ handle: null }))).toBeNull();
  });

  it("is out of stock at zero inventory", () => {
    expect(toStorefrontProduct(doc({ inventory: 0 }))?.inStock).toBe(false);
  });

  it("gives colours with photos a picker tile and their own gallery", () => {
    const navyFront = media("navy-front");
    const navyBack = media("navy-back");
    const product = toStorefrontProduct(
      {
        ...withVariants,
        colorImages: [{ color: navy, images: [navyFront, navyBack] }],
      },
      ORIGIN,
    )!;
    expect(product.colors).toEqual([
      { name: "Black", swatch: "black" },
      {
        name: "Navy",
        swatch: "#1f2a44",
        image: "/api/media/file/navy-front-700.jpg",
        gallery: [
          "/api/media/file/navy-front.jpg",
          "/api/media/file/navy-back.jpg",
        ],
      },
    ]);
  });

  it("builds colours and sizes from variants, in admin order", () => {
    const product = toStorefrontProduct(withVariants)!;
    expect(product.colors).toEqual([
      { name: "Black", swatch: "black" },
      { name: "Navy", swatch: "#1f2a44" },
    ]);
    // M's only variant is sold out; S has stock (and a backorder variant).
    expect(product.sizes).toEqual([
      { label: "S", available: true },
      { label: "M", available: false },
    ]);
    expect(product.variants).toEqual([
      { id: 100, color: "Navy", size: "S", available: true },
      { id: 101, color: "Navy", size: "M", available: false },
      { id: 102, color: "Black", size: "S", available: true },
    ]);
    expect(product.inStock).toBe(true);
  });

  it("is out of stock when variants are on but none can be sold", () => {
    const product = toStorefrontProduct(
      doc({ enableVariants: true, variants: { docs: [] } }),
    );
    expect(product?.inStock).toBe(false);
  });
});

describe("matchVariant", () => {
  it("finds the variant for a colour/size pick", () => {
    expect(matchVariant(withVariants, "Navy", "M")?.id).toBe(101);
    expect(matchVariant(withVariants, "Red", "M")).toBeNull();
  });
});

describe("variantAvailable", () => {
  it("sells untracked and backorder items at zero stock", () => {
    expect(variantAvailable({ inventory: 0 })).toBe(false);
    expect(variantAvailable({ inventory: 0, manageInventory: false })).toBe(
      true,
    );
    expect(variantAvailable({ inventory: 0, allowBackorder: true })).toBe(true);
  });
});

describe("mediaPath", () => {
  it("only strips this site's origin", () => {
    expect(mediaPath(`${ORIGIN}/api/media/file/a.jpg`, ORIGIN)).toBe(
      "/api/media/file/a.jpg",
    );
    expect(mediaPath("https://cdn.example/a.jpg", ORIGIN)).toBe(
      "https://cdn.example/a.jpg",
    );
  });
});
