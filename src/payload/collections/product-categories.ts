import type { CollectionConfig, Where } from "payload";
import { isAdmin } from "../access";
import { group } from "../groups";
import { handleField } from "../fields/handle";
import { metadataField } from "../fields/metadata";
import { revalidateCatalogHooks } from "../hooks/revalidate-catalog";

const publicCategories: Where = {
  and: [{ isActive: { equals: true } }, { isInternal: { equals: false } }],
};

/** Nested category tree (Medusa: Products → Categories). */
export const ProductCategories: CollectionConfig = {
  slug: "product-categories",
  hooks: {
    afterChange: [revalidateCatalogHooks.afterChange],
    afterDelete: [revalidateCatalogHooks.afterDelete],
  },
  labels: { singular: "Category", plural: "Categories" },
  admin: {
    group: group.products,
    useAsTitle: "name",
    defaultColumns: ["name", "handle", "parent", "isActive", "rank"],
  },
  access: {
    read: ({ req }) =>
      req.user?.collection === "users" ? true : publicCategories,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  defaultSort: "rank",
  fields: [
    { name: "name", type: "text", required: true },
    { name: "description", type: "textarea" },
    handleField("name"),
    {
      name: "parent",
      type: "relationship",
      relationTo: "product-categories",
      admin: { position: "sidebar" },
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
    },
    {
      name: "isActive",
      label: "Active",
      type: "checkbox",
      defaultValue: true,
      index: true,
      admin: { position: "sidebar" },
    },
    {
      name: "isInternal",
      label: "Internal (hidden from storefront)",
      type: "checkbox",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "rank",
      type: "number",
      defaultValue: 0,
      admin: { position: "sidebar", description: "Lower numbers show first." },
    },
    {
      name: "children",
      type: "join",
      collection: "product-categories",
      on: "parent",
    },
    {
      name: "products",
      type: "join",
      collection: "products",
      on: "categories",
    },
    metadataField,
  ],
};
