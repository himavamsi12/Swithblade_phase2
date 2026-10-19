import type { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";
import { group } from "../groups";

/** Product options such as Size or Colour (Medusa: product options). */
export const variantTypesOverride: CollectionOverride = ({
  defaultCollection,
}) => ({
  ...defaultCollection,
  labels: { singular: "Option", plural: "Options" },
  admin: { ...defaultCollection.admin, group: group.products },
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
