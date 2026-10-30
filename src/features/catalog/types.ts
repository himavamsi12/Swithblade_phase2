export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Integer minor units (cents). */
  price: number;
  currency: string;
  image: string | null;
  /** Second photo (e.g. worn by a model), shown when hovering the card. */
  hoverImage?: string | null;
  inStock: boolean;
  /** Listing category slug, e.g. "sweatshirts". */
  category?: string;
  /** Number of colour variants, shown on listing cards. */
  colorCount?: number;
  /** Homepage shelves this product appears on. */
  collections: ProductCollection[];
  /** Shows the star badge on the product card. */
  highlighted?: boolean;
  /**
   * Where the product shot sits inside the card image area, as percentages of
   * the card. Omit for a full-bleed shot.
   */
  imageFrame?: ImageFrame;
  /** Product page photos, in display order. */
  gallery: string[];
  colors: ProductColor[];
  sizes: ProductSize[];
  /** Copy for the accordions on the product page. */
  details: string;
  shippingReturns: string;
  /**
   * Sellable colour/size combinations, for checkout. Absent on products
   * without variants (and on design placeholders).
   */
  variants?: ProductVariant[];
};

export type ProductVariant = {
  id: number;
  color: string | null;
  size: string | null;
  available: boolean;
};

export type ProductColor = {
  name: string;
  /** CSS colour shown in the swatch. */
  swatch: string;
  /** Photo tile shown in the colour picker instead of the swatch. */
  image?: string | null;
  /** This colour's product page photos; the full gallery when absent. */
  gallery?: string[];
};

export type ProductSize = {
  label: string;
  available: boolean;
};

export type ProductCollection = "new-arrivals" | "recommended";

export type ImageFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};
