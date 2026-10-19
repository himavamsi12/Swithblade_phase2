import type { CollectionConfig } from "payload";
import { anyone, isAdmin } from "../access";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/** Product types, e.g. "Outerwear" (Medusa: Settings → Product Types). */
export const ProductTypes: CollectionConfig = {
  slug: "product-types",
  labels: { singular: "Product type", plural: "Product types" },
  admin: { group: group.settings, useAsTitle: "value" },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    {
      name: "value",
      label: "Name",
      type: "text",
      required: true,
      unique: true,
    },
    metadataField,
  ],
};
