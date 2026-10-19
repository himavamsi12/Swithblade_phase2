import type { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";
import { countryOptions } from "../countries";
import { group } from "../groups";
import { handleField } from "../fields/handle";
import { metadataField } from "../fields/metadata";

/**
 * Medusa's product model on top of the ecommerce plugin's products. The
 * plugin's own fields (variants, prices, inventory) live in the
 * "Variants & pricing" tab; tabs are unnamed so field paths stay flat.
 */
export const productsOverride: CollectionOverride = ({
  defaultCollection,
}) => ({
  ...defaultCollection,
  admin: {
    ...defaultCollection.admin,
    group: group.products,
    useAsTitle: "title",
    defaultColumns: [
      "title",
      "collection",
      "salesChannels",
      "_status",
      "updatedAt",
    ],
    listSearchableFields: ["title", "handle", "subtitle"],
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "General",
          fields: [
            { name: "title", type: "text", required: true },
            { name: "subtitle", type: "text" },
            { name: "description", type: "textarea" },
            {
              name: "thumbnail",
              type: "upload",
              relationTo: "media",
            },
            {
              name: "images",
              label: "Media",
              type: "upload",
              relationTo: "media",
              hasMany: true,
              admin: {
                description: "Gallery shown on the product page, in order.",
              },
            },
          ],
        },
        {
          label: "Variants & pricing",
          fields: defaultCollection.fields,
        },
        {
          label: "Organize",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "type",
                  type: "relationship",
                  relationTo: "product-types",
                },
                {
                  name: "collection",
                  type: "relationship",
                  relationTo: "product-collections",
                  index: true,
                },
              ],
            },
            {
              name: "categories",
              type: "relationship",
              relationTo: "product-categories",
              hasMany: true,
              index: true,
            },
            {
              name: "tags",
              type: "relationship",
              relationTo: "product-tags",
              hasMany: true,
            },
            {
              name: "salesChannels",
              label: "Sales channels",
              type: "relationship",
              relationTo: "sales-channels",
              hasMany: true,
              admin: {
                description: "Leave empty to sell only in the default channel.",
              },
            },
            {
              name: "shippingProfile",
              label: "Shipping profile",
              type: "relationship",
              relationTo: "shipping-profiles",
            },
          ],
        },
        {
          label: "Attributes",
          fields: [
            {
              type: "row",
              fields: [
                { name: "weight", label: "Weight (g)", type: "number", min: 0 },
                {
                  name: "length",
                  label: "Length (cm)",
                  type: "number",
                  min: 0,
                },
                { name: "width", label: "Width (cm)", type: "number", min: 0 },
                {
                  name: "height",
                  label: "Height (cm)",
                  type: "number",
                  min: 0,
                },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "material", type: "text" },
                {
                  name: "originCountry",
                  label: "Country of origin",
                  type: "select",
                  options: countryOptions,
                },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "hsCode", label: "HS code", type: "text" },
                { name: "midCode", label: "MID code", type: "text" },
              ],
            },
          ],
        },
      ],
    },
    handleField("title"),
    {
      name: "discountable",
      type: "checkbox",
      defaultValue: true,
      admin: { position: "sidebar", description: "Allow promotions to apply." },
    },
    {
      name: "highlighted",
      label: "Show star badge",
      type: "checkbox",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    metadataField,
  ],
});
