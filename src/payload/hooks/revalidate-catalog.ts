import { revalidateTag } from "next/cache";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from "payload";
import { PRODUCTS_TAG } from "@/features/catalog/cache";

function revalidateCatalog() {
  try {
    revalidateTag(PRODUCTS_TAG, "max");
  } catch {
    // Outside a Next.js request (e.g. a migration or script): nothing cached.
  }
}

const afterChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateCatalog();
  return doc;
};

const afterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidateCatalog();
  return doc;
};

/**
 * Hooks that refresh the storefront's cached catalog when anything it shows
 * changes: products, variants and stock, options, images, categories.
 */
export const revalidateCatalogHooks = { afterChange, afterDelete };

/** Adds the catalog hooks to a collection's existing hooks. */
export function withCatalogRevalidation<
  T extends {
    afterChange?: CollectionAfterChangeHook[];
    afterDelete?: CollectionAfterDeleteHook[];
  },
>(hooks: T | undefined) {
  return {
    ...hooks,
    afterChange: [...(hooks?.afterChange ?? []), afterChange],
    afterDelete: [...(hooks?.afterDelete ?? []), afterDelete],
  };
}
