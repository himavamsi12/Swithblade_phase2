import type { CollectionConfig } from "payload";
import { anyone, isAdmin } from "../access";
import { group } from "../groups";
import { handleField } from "../fields/handle";
import { metadataField } from "../fields/metadata";
import { revalidateCatalogHooks } from "../hooks/revalidate-catalog";

/** Curated groupings such as "Summer 2026" (Medusa: Products → Collections). */
export const ProductCollections: CollectionConfig = {
  slug: "product-collections",
  hooks: {
    afterChange: [revalidateCatalogHooks.afterChange],
    afterDelete: [revalidateCatalogHooks.afterDelete],
  },
  labels: { singular: "Collection", plural: "Collections" },
  admin: {
    group: group.products,
    useAsTitle: "title",
    defaultColumns: ["title", "handle", "updatedAt"],
  },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: "title", type: "text", required: true },
    handleField("title"),
    {
      name: "products",
      type: "join",
      collection: "products",
      on: "collection",
    },
    metadataField,
  ],
};
