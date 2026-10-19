import type { Plugin } from "payload";

/**
 * Sorts collections into the given order. Payload orders the sidebar by
 * collection order, and the ecommerce plugin appends its collections last,
 * so this runs after it to get Medusa's sidebar order. Unlisted collections
 * keep their relative order at the end.
 */
export const orderCollections =
  (slugs: string[]): Plugin =>
  (config) => {
    const rank = (slug: string) => {
      const i = slugs.indexOf(slug);
      return i === -1 ? slugs.length : i;
    };
    return {
      ...config,
      collections: [...(config.collections ?? [])].sort(
        (a, b) => rank(a.slug) - rank(b.slug),
      ),
    };
  };
