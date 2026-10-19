import type { CollectionConfig } from "payload";
import { isAdmin } from "../access";
import { countryOptions } from "../countries";
import { group } from "../groups";
import { addressFields } from "../fields/address";
import { metadataField } from "../fields/metadata";

/**
 * Warehouses and stores that ship or hold stock (Medusa: Settings →
 * Locations & Shipping). Service zones define where each location delivers.
 */
export const StockLocations: CollectionConfig = {
  slug: "stock-locations",
  labels: { singular: "Location", plural: "Locations & Shipping" },
  admin: {
    group: group.settings,
    useAsTitle: "name",
    defaultColumns: ["name", "address.city", "address.country"],
  },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: "name", type: "text", required: true, unique: true },
    { name: "address", type: "group", fields: addressFields },
    {
      type: "row",
      fields: [
        {
          name: "supportsShipping",
          label: "Ships orders",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "supportsPickup",
          label: "Offers pickup",
          type: "checkbox",
          defaultValue: false,
        },
      ],
    },
    {
      name: "serviceZones",
      label: "Service zones",
      type: "array",
      admin: { description: "Groups of countries this location delivers to." },
      fields: [
        {
          type: "row",
          fields: [
            { name: "name", type: "text", required: true },
            {
              name: "countries",
              type: "select",
              hasMany: true,
              required: true,
              options: countryOptions,
            },
          ],
        },
      ],
    },
    {
      name: "shippingOptions",
      label: "Shipping options",
      type: "join",
      collection: "shipping-options",
      on: "stockLocation",
    },
    metadataField,
  ],
};
