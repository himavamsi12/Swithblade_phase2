import type { CollectionConfig } from "payload";
import { isAdmin } from "../access";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/** Groups products that ship the same way, e.g. "Default" or "Oversized". */
export const ShippingProfiles: CollectionConfig = {
  slug: "shipping-profiles",
  labels: { singular: "Shipping profile", plural: "Shipping profiles" },
  admin: { group: group.settings, useAsTitle: "name" },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: "name", type: "text", required: true, unique: true },
    {
      name: "type",
      type: "select",
      required: true,
      defaultValue: "default",
      options: [
        { label: "Default", value: "default" },
        { label: "Gift card", value: "gift_card" },
        { label: "Custom", value: "custom" },
      ],
    },
    metadataField,
  ],
};
