import type { CollectionConfig } from "payload";
import { anyone, isAdmin } from "../access";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/** Where products are sold, e.g. "Webshop" or "Instagram" (Medusa: Settings → Sales Channels). */
export const SalesChannels: CollectionConfig = {
  slug: "sales-channels",
  labels: { singular: "Sales channel", plural: "Sales channels" },
  admin: {
    group: group.settings,
    useAsTitle: "name",
    defaultColumns: ["name", "description", "isDisabled"],
  },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: "name", type: "text", required: true, unique: true },
    { name: "description", type: "textarea" },
    {
      name: "isDisabled",
      label: "Disabled",
      type: "checkbox",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "stockLocations",
      label: "Stock locations",
      type: "relationship",
      relationTo: "stock-locations",
      hasMany: true,
      admin: {
        description: "Locations that can fulfil orders from this channel.",
      },
    },
    metadataField,
  ],
};
