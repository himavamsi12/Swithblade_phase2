import type { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";
import { group } from "../groups";
import { withCatalogRevalidation } from "../hooks/revalidate-catalog";

/** Product options such as Size or Colour (Medusa: product options). */
export const variantTypesOverride: CollectionOverride = ({
  defaultCollection,
}) => ({
  ...defaultCollection,
  labels: { singular: "Option", plural: "Options" },
  admin: { ...defaultCollection.admin, group: group.products },
});

/** Adds the swatch colour the storefront shows for Color options. */
export const variantOptionsOverride: CollectionOverride = ({
  defaultCollection,
}) => ({
  ...defaultCollection,
  hooks: withCatalogRevalidation(defaultCollection.hooks),
  fields: [
    ...defaultCollection.fields,
    {
      name: "swatch",
      type: "text",
      admin: {
        description:
          "Color options only: the swatch shown in the shop, as a CSS colour, e.g. #1f2a44.",
      },
    },
  ],
});

export const cartsOverride: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  admin: {
    ...defaultCollection.admin,
    group: group.orders,
    defaultColumns: ["createdAt", "customer", "status", "subtotal"],
  },
});

/** Medusa calls these payments. */
export const transactionsOverride: CollectionOverride = ({
  defaultCollection,
}) => ({
  ...defaultCollection,
  labels: { singular: "Payment", plural: "Payments" },
  admin: { ...defaultCollection.admin, group: group.orders },
});

export const addressesOverride: CollectionOverride = ({
  defaultCollection,
}) => ({
  ...defaultCollection,
  admin: { ...defaultCollection.admin, group: group.customers },
});
