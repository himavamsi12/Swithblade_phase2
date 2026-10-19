import "server-only";
import { z } from "zod";
import { supabaseSelect } from "@/lib/supabase";
import {
  placeholderCategory,
  placeholderProductBySlug,
  placeholderRelated,
  placeholderSearch,
  placeholderShelf,
} from "./placeholder-products";
import type { Product, ProductCollection } from "./types";

/**
 * Data-access boundary for the catalog. Pages and components only talk to
 * these functions; products are read from Supabase's `public.products` table.
 * RLS limits the publishable key to rows where `published` is true.
 */

const TABLE = "products";
/** Tag for `revalidateTag` after products change. */
export const PRODUCTS_TAG = "products";

const COLUMNS = [
  "id",
  "slug",
  "name",
  "description",
  "price",
  "currency",
  "image",
  "gallery",
  "in_stock",
  "category",
  "collections",
  "highlighted",
  "colors",
  "sizes",
  "image_frame",
  "details",
  "shipping_returns",
].join(",");

const ORDER = "sort_order.asc,created_at.desc";

const rowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number().int(),
  currency: z.string(),
  image: z.string().nullable(),
  gallery: z.array(z.string()),
  in_stock: z.boolean(),
  category: z.string().nullable(),
  collections: z.array(z.enum(["new-arrivals", "recommended"])),
  highlighted: z.boolean(),
  colors: z.array(z.object({ name: z.string(), swatch: z.string() })),
  sizes: z.array(z.object({ label: z.string(), available: z.boolean() })),
  image_frame: z
    .object({
      left: z.number(),
      top: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .nullable(),
  details: z.string(),
  shipping_returns: z.string(),
});

function toProduct(row: unknown): Product {
  const r = rowSchema.parse(row);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    price: r.price,
    currency: r.currency,
    image: r.image,
    // First gallery photo that isn't the main one, e.g. a model shot.
    hoverImage: r.gallery.find((g) => g && g !== r.image) ?? null,
    inStock: r.in_stock,
    category: r.category ?? undefined,
    colorCount: r.colors.length || undefined,
    collections: r.collections,
    highlighted: r.highlighted,
    imageFrame: r.image_frame ?? undefined,
    gallery: r.gallery,
    colors: r.colors,
    sizes: r.sizes,
    details: r.details,
    shippingReturns: r.shipping_returns,
  };
}

async function select(
  filters: Record<string, string>,
  options: { count?: boolean } = {},
) {
  const query = new URLSearchParams({
    select: COLUMNS,
    order: ORDER,
    ...filters,
  });
  const { rows, total } = await supabaseSelect<unknown>(TABLE, query, {
    tags: [PRODUCTS_TAG],
    ...options,
  });
  return { products: rows.map(toProduct), total };
}

export async function listProducts(): Promise<Product[]> {
  return (await select({})).products;
}

export async function listProductsByCollection(
  collection: ProductCollection,
): Promise<Product[]> {
  const { products } = await select({ collections: `cs.{${collection}}` });
  // TEMPORARY: design placeholders until real products join this shelf.
  return products.length > 0 ? products : placeholderShelf(collection);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { products } = await select({ slug: `eq.${slug}`, limit: "1" });
  return products[0] ?? placeholderProductBySlug(slug);
}

export type ProductPage = {
  items: Product[];
  total: number;
  pageCount: number;
};

export async function listProductsByCategory(
  category: string,
  { page, pageSize }: { page: number; pageSize: number },
): Promise<ProductPage> {
  const { products, total } = await select(
    {
      category: `eq.${category}`,
      limit: String(pageSize),
      offset: String((page - 1) * pageSize),
    },
    { count: true },
  );
  const count = total ?? products.length;
  if (count === 0) {
    // TEMPORARY: design placeholders until the category has real products.
    const all = placeholderCategory(category);
    const start = (page - 1) * pageSize;
    return {
      items: all.slice(start, start + pageSize),
      total: all.length,
      pageCount: Math.max(1, Math.ceil(all.length / pageSize)),
    };
  }
  return {
    items: products,
    total: count,
    pageCount: Math.max(1, Math.ceil(count / pageSize)),
  };
}

/** Longest search term we pass to the database. */
export const SEARCH_MAX_LENGTH = 80;

/**
 * Full-text product search, with typo tolerance, ranked by relevance.
 * Runs in Postgres as `public.search_products` (see the
 * `product_search` migration); the database cleans and parses the term.
 */
export async function searchProducts(
  term: string,
  limit = 48,
): Promise<Product[]> {
  const clean = term.trim().slice(0, SEARCH_MAX_LENGTH);
  if (!clean) return [];
  // No `order`: the function returns rows already ranked.
  const query = new URLSearchParams({
    search_term: clean,
    result_limit: String(limit),
    select: COLUMNS,
  });
  const { rows } = await supabaseSelect<unknown>("rpc/search_products", query, {
    tags: [PRODUCTS_TAG],
  });
  if (rows.length > 0) return rows.map(toProduct);
  // TEMPORARY: design placeholders while the catalog is empty (but a real,
  // stocked catalog with no match gets an honest empty result).
  return (await catalogIsEmpty())
    ? placeholderSearch(clean).slice(0, limit)
    : [];
}

async function catalogIsEmpty(): Promise<boolean> {
  const { rows } = await supabaseSelect<unknown>(
    TABLE,
    new URLSearchParams({ select: "id", limit: "1" }),
    { tags: [PRODUCTS_TAG] },
  );
  return rows.length === 0;
}

/** Other products from the same category (or the sweatshirts listing as a fallback). */
export async function listRelatedProducts(
  product: Product,
  limit: number,
): Promise<Product[]> {
  const category = product.category ?? "sweatshirts";
  const { products } = await select({
    category: `eq.${category}`,
    slug: `neq.${product.slug}`,
    limit: String(limit),
  });
  // TEMPORARY: design placeholders until the category has other products.
  return products.length > 0 ? products : placeholderRelated(limit);
}

/** General recommendations, e.g. for the bag page. */
export async function listRecommendedProducts(
  limit: number,
): Promise<Product[]> {
  const { products } = await select({
    category: "eq.sweatshirts",
    limit: String(limit),
  });
  // TEMPORARY: design placeholders until the catalog has products.
  return products.length > 0 ? products : placeholderRelated(limit);
}

/**
 * Products from a collaboration capsule.
 * TEMPORARY: design placeholders until products carry a collaboration field.
 */
export async function listCollaborationProducts(
  _partner: string,
  limit = 12,
): Promise<Product[]> {
  return placeholderRelated(limit);
}

/**
 * Promise pieces: products whose earnings go to the cause behind them. They
 * carry the star badge in the shop.
 * TEMPORARY: design placeholders until products carry a promise flag.
 */
export async function listPromiseProducts(limit = 8): Promise<Product[]> {
  return placeholderRelated(limit).map((p) => ({ ...p, highlighted: true }));
}
