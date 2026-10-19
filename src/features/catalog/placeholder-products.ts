import { existsSync } from "node:fs";
import path from "node:path";
import type {
  ImageFrame,
  Product,
  ProductCollection,
  ProductColor,
  ProductSize,
} from "./types";

/*
 * TEMPORARY: the homepage shelves from the designs, shown until real products
 * in Supabase are tagged with that collection. Delete this file (and its use
 * in repository.ts) once the shelves are populated.
 */

type ListingProduct = Omit<
  Product,
  "gallery" | "colors" | "sizes" | "details" | "shippingReturns"
>;

const detailGallery = [1, 2, 3, 4, 5, 6].map(
  (n) => `/images/products/detail/${n}.png`,
);
const detailColors: ProductColor[] = [
  { name: "Maroon", swatch: "#4b1f1f" },
  { name: "Cream", swatch: "#e8e0d3" },
  { name: "Olive", swatch: "#5d6b3d" },
];
const detailSizes: ProductSize[] = [
  { label: "XS", available: true },
  { label: "S", available: true },
  { label: "M", available: true },
  { label: "L", available: true },
  { label: "XL", available: false },
  { label: "2XL", available: true },
];
const placeholderDescription =
  "Shirt in embossed checked cotton fabric, sequin detail on the upper part, mandarin collar with press studs, patch pocket";

/** Percent placement of a shot given its pixel box inside a card of `cardW` x `cardH`. */
function frame(
  [x, y, w, h]: [number, number, number, number],
  cardW: number,
  cardH: number,
): ImageFrame {
  const pct = (n: number, of: number) => Math.round((n / of) * 1e4) / 1e2;
  return {
    left: pct(x, cardW),
    top: pct(y, cardH),
    width: pct(w, cardW),
    height: pct(h, cardH),
  };
}

/**
 * Model shot shown when hovering a card: a file named like the product photo
 * with `-hover` added (e.g. `arrival-1-hover.png` next to `arrival-1.png` in
 * public/images/products/new-arrivals/) is picked up automatically. Checked on
 * each call, so a newly added photo shows without a restart.
 */
function withHoverImage<
  T extends { image: string | null; hoverImage?: string | null },
>(product: T): T {
  const match = product.image?.match(/^\/(.+)\.[a-z]+$/);
  if (!match) return product;
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const file = `${match[1]}-hover.${ext}`;
    if (existsSync(path.join(process.cwd(), "public", file))) {
      return { ...product, hoverImage: `/${file}` };
    }
  }
  return product;
}

// TEMPORARY sample model shots for the hover effect, reusing the Recommended
// photos. A matching `arrival-<n>-hover` file (see above) replaces them.
const sampleHoverImages = [
  "/images/products/recommended/look-1.png",
  "/images/products/recommended/look-2.png",
  "/images/products/recommended/look-3.png",
  "/images/products/recommended/look-4.png",
  "/images/products/recommended/look-2.png",
];

const newArrivals: ListingProduct[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `prod_new_${n}`,
  slug: `pink-checkered-blouse-${n}`,
  name: "Pink Checkered Blouse",
  description: placeholderDescription,
  price: 499000,
  currency: "INR",
  image: `/images/products/new-arrivals/arrival-${n}.png`,
  hoverImage: sampleHoverImages[n - 1],
  inStock: true,
  collections: ["new-arrivals"],
  highlighted: n === 3,
  imageFrame:
    n === 5 ? frame([46.05, 56.86, 170.3, 210.28], 262.4, 324) : undefined,
}));

// Pixel boxes of each shot inside its 262x324 card, from the design.
const recommendedShots: [string, [number, number, number, number]][] = [
  ["look-1", [-2.5, -19.16, 267, 401]],
  ["look-2", [-15, -82.09, 292, 438]],
  ["look-3", [2.5, 10.09, 257, 425]],
  ["look-4", [2.9, 18.69, 259, 324]],
  ["look-3", [2.5, 10.09, 257, 425]],
];
const recommended: ListingProduct[] = recommendedShots.map(
  ([file, box], i) => ({
    id: `prod_rec_${i + 1}`,
    slug: `pink-checkered-blouse-rec-${i + 1}`,
    name: "Pink Checkered Blouse",
    description: placeholderDescription,
    price: 499000,
    currency: "INR",
    image: `/images/products/recommended/${file}.png`,
    inStock: true,
    collections: ["recommended"],
    imageFrame: frame(box, 262, 324),
  }),
);

// 200 listing items (10 pages of 20) cycling through the four product shots
// from the design.
const sweatshirts: ListingProduct[] = Array.from({ length: 200 }, (_, i) => ({
  id: `prod_sweat_${i + 1}`,
  slug: `pink-checkered-blouse-s${i + 1}`,
  name: "Pink Checkered Blouse",
  description: placeholderDescription,
  price: 499000,
  currency: "INR",
  image: `/images/products/new-arrivals/arrival-${(i % 4) + 1}.png`,
  inStock: true,
  category: "sweatshirts",
  colorCount: 2,
  collections: [],
  // The olive top's shot is tightly cropped, so it sits inset in the card.
  imageFrame:
    i % 4 === 3 ? { left: 14.5, top: 14.5, width: 71, height: 71 } : undefined,
}));

const placeholderProducts: Product[] = [
  ...newArrivals,
  ...recommended,
  ...sweatshirts,
].map((p) => ({
  ...p,
  gallery: detailGallery,
  colors: detailColors,
  sizes: detailSizes,
  details: "Placeholder product details.",
  shippingReturns: "Placeholder shipping and returns information.",
}));

export function placeholderShelf(collection: ProductCollection): Product[] {
  return placeholderProducts
    .filter((p) => p.collections.includes(collection))
    .map(withHoverImage);
}

export function placeholderCategory(category: string): Product[] {
  return placeholderProducts.filter((p) => p.category === category);
}

export function placeholderSearch(term: string): Product[] {
  const t = term.toLowerCase();
  return placeholderProducts
    .filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        p.category?.toLowerCase().includes(t),
    )
    .map(withHoverImage);
}

export function placeholderProductBySlug(slug: string): Product | null {
  return placeholderProducts.find((p) => p.slug === slug) ?? null;
}

// "You may also like" row from the product page design: the four listing
// shots, repeated. The olive top's shot is tightly cropped, so it sits inset.
const related: Product[] = Array.from({ length: 12 }, (_, i) => ({
  id: `prod_related_${i + 1}`,
  slug: `pink-checkered-blouse-${(i % 4) + 1}`,
  name: "Pink Checkered Blouse",
  description: placeholderDescription,
  price: 499000,
  currency: "INR",
  image: `/images/products/new-arrivals/arrival-${(i % 4) + 1}.png`,
  inStock: true,
  colorCount: 2,
  collections: [],
  imageFrame:
    i % 4 === 3 ? { left: 14.5, top: 14.5, width: 71, height: 71 } : undefined,
  gallery: detailGallery,
  colors: detailColors,
  sizes: detailSizes,
  details: "Placeholder product details.",
  shippingReturns: "Placeholder shipping and returns information.",
}));

export function placeholderRelated(limit: number): Product[] {
  return related.slice(0, limit);
}
