import type { CollectionConfig } from "payload";
import { anyone, isAdmin } from "../access";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/** Free-form product labels (Medusa: Settings → Product Tags). */
export const ProductTags: CollectionConfig = {
  slug: "product-tags",
  labels: { singular: "Product tag", plural: "Product tags" },
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
