/**
 * Cache tag for storefront catalog data. Lives apart from the repository
 * (which is server-only) so Payload hooks can import it, CLI included.
 */
export const PRODUCTS_TAG = "products";
