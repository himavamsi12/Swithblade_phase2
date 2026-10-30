import "server-only";
import { unstable_cache } from "next/cache";
import type { Where } from "payload";
import { getPayloadClient } from "@/features/account/customer";
import { env } from "@/lib/env";
import { PRODUCTS_TAG } from "./cache";
import { toStorefrontProduct } from "./payload-product";
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
 * these functions; products come from the Payload admin (Products, with
 * variants and inventory). Only published products with an INR price show.
 */

/** Cache tag, revalidated by Payload hooks when catalog data changes. */
export { PRODUCTS_TAG };
/** Fallback cache lifetime, in seconds, in case a revalidation is missed. */
const REVALIDATE = 60;

const ORIGIN = new URL(env.NEXT_PUBLIC_SITE_URL).origin;

const SELLABLE: Where[] = [
  { _status: { equals: "published" } },
  { priceInINREnabled: { equals: true } },
  { handle: { exists: true } },
];

type Query = {
  where?: Where;
  limit?: number;
  page?: number;
  sort?: string;
};

async function queryProducts({
  where,
  limit = 48,
  page = 1,
  sort = "-createdAt",
}: Query): Promise<{ products: Product[]; total: number }> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "products",
    where: { and: [...SELLABLE, ...(where ? [where] : [])] },
    // Media, categories and variants, and the variants' options.
    depth: 2,
    joins: { variants: { limit: 100 } },
    limit,
    page,
    sort,
  });
  return {
    products: result.docs
      .map((doc) => toStorefrontProduct(doc, ORIGIN))
      .filter((p): p is Product => p !== null),
    total: result.totalDocs,
  };
}

const cachedProducts = unstable_cache(queryProducts, ["catalog"], {
  revalidate: REVALIDATE,
  tags: [PRODUCTS_TAG],
});

const select = (query: Query) => cachedProducts(query);

export async function listProducts(): Promise<Product[]> {
  return (await select({ limit: 1000 })).products;
}

export async function listProductsByCollection(
  collection: ProductCollection,
): Promise<Product[]> {
  const { products } = await select({
    where: { "collection.handle": { equals: collection } },
  });
  // TEMPORARY: design placeholders fill the shelf until it has enough real
  // products; real ones always come first.
  const fill = placeholderShelf(collection).slice(products.length);
  return [...products, ...fill];
}

/**
 * One product by its URL handle. `fresh` skips the cache and never falls back
 * to a design placeholder: checkout uses it, so only real, current products
 * can be sold.
 */
export async function getProductBySlug(
  slug: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<Product | null> {
  const query: Query = { where: { handle: { equals: slug } }, limit: 1 };
  if (fresh) return (await queryProducts(query)).products[0] ?? null;
  const { products } = await select(query);
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
  const { products, total } = await select({
    where: { "categories.handle": { equals: category } },
    limit: pageSize,
    page,
  });
  if (total === 0) {
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
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Longest search term we pass to the database. */
export const SEARCH_MAX_LENGTH = 80;

/** Product search: every word must appear in the title, subtitle or description. */
export async function searchProducts(
  term: string,
  limit = 48,
): Promise<Product[]> {
  const clean = term.trim().slice(0, SEARCH_MAX_LENGTH);
  if (!clean) return [];
  const { products } = await select({
    where: {
      or: [
        { title: { like: clean } },
        { subtitle: { like: clean } },
        { description: { like: clean } },
      ],
    },
    limit,
  });
  if (products.length > 0) return products;
  // TEMPORARY: design placeholders while the catalog is empty (but a real,
  // stocked catalog with no match gets an honest empty result).
  return (await select({ limit: 1 })).total === 0
    ? placeholderSearch(clean).slice(0, limit)
    : [];
}

/** Other products from the same category (or the sweatshirts listing as a fallback). */
export async function listRelatedProducts(
  product: Product,
  limit: number,
): Promise<Product[]> {
  const category = product.category ?? "sweatshirts";
  const { products } = await select({
    where: {
      and: [
        { "categories.handle": { equals: category } },
        { handle: { not_equals: product.slug } },
      ],
    },
    limit,
  });
  // TEMPORARY: design placeholders until the category has other products.
  return products.length > 0 ? products : placeholderRelated(limit);
}

/** General recommendations, e.g. for the bag page. */
export async function listRecommendedProducts(
  limit: number,
): Promise<Product[]> {
  const shelf = await select({
    where: { "collection.handle": { equals: "recommended" } },
    limit,
  });
  if (shelf.products.length > 0) return shelf.products;
  const latest = await select({ limit });
  // TEMPORARY: design placeholders until the catalog has products.
  return latest.products.length > 0
    ? latest.products
    : placeholderRelated(limit);
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
 * Promise pieces: products whose earnings go to the cause behind them, ticked
 * "Show star badge" in the admin. They carry the star badge in the shop.
 */
export async function listPromiseProducts(limit = 8): Promise<Product[]> {
  const { products } = await select({
    where: { highlighted: { equals: true } },
    limit,
  });
  // TEMPORARY: design placeholders until real products are promise pieces.
  return products.length > 0
    ? products
    : placeholderRelated(limit).map((p) => ({ ...p, highlighted: true }));
}
