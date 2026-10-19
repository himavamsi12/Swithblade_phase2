import type { CollectionConfig } from "payload";
import { isAdmin } from "../access";
import { countryOptions } from "../countries";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

const rateFields = [
  {
    type: "row" as const,
    fields: [
      { name: "name", type: "text" as const, required: true },
      { name: "code", type: "text" as const, required: true },
      {
        name: "rate",
        label: "Rate (%)",
        type: "number" as const,
        required: true,
        min: 0,
        max: 100,
      },
    ],
  },
];

/** Tax rates per country and province (Medusa: Settings → Tax Regions). */
export const TaxRegions: CollectionConfig = {
  slug: "tax-regions",
  labels: { singular: "Tax region", plural: "Tax regions" },
  admin: {
    group: group.settings,
    useAsTitle: "label",
    defaultColumns: ["label", "country", "province", "defaultRate"],
  },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  hooks: {
    beforeChange: [
      ({ data }) => ({
        ...data,
        label: [data.country, data.province].filter(Boolean).join(" – "),
      }),
    ],
  },
  fields: [
    { name: "label", type: "text", admin: { hidden: true } },
    {
      type: "row",
      fields: [
        {
          name: "country",
          type: "select",
          required: true,
          options: countryOptions,
          index: true,
        },
        {
          name: "province",
          label: "Province code",
          type: "text",
          admin: {
            description:
              "ISO 3166-2 code, e.g. US-CA. Leave empty for the whole country.",
          },
        },
      ],
    },
    {
      name: "defaultRate",
      label: "Default rate",
      type: "group",
      fields: rateFields,
    },
    {
      name: "overrides",
      label: "Override rates",
      type: "array",
      admin: { description: "Different rates for specific product types." },
      fields: [
        ...rateFields,
        {
          name: "productTypes",
          label: "Product types",
          type: "relationship",
          relationTo: "product-types",
          hasMany: true,
        },
      ],
    },
    metadataField,
  ],
};
