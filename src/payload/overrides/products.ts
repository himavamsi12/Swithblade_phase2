import type { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";
import { countryOptions } from "../countries";
import { group } from "../groups";
import { handleField } from "../fields/handle";
import { withCatalogRevalidation } from "../hooks/revalidate-catalog";
import { metadataField } from "../fields/metadata";
import { staffOnly } from "../fields/staff-only";

/**
 * Medusa's product model on top of the ecommerce plugin's products. The
 * plugin's own fields (variants, prices, inventory) live in the
 * "Variants & pricing" tab; tabs are unnamed so field paths stay flat.
 */
export const productsOverride: CollectionOverride = ({
  defaultCollection,
}) => ({
  ...defaultCollection,
  hooks: withCatalogRevalidation(defaultCollection.hooks),
  // The plugin autosaves drafts, which saves an empty product the moment
  // "Create new" opens. Keep drafts (Save draft / Publish) without that.
  versions: { drafts: { autosave: false } },
  admin: {
    ...defaultCollection.admin,
    group: group.products,
    useAsTitle: "title",
    defaultColumns: [
      "title",
      "stockSummary",
      "priceSummary",
      "collection",
      "_status",
      "updatedAt",
    ],
    listSearchableFields: ["title", "handle", "subtitle"],
    // "Preview" button: the product page on the same site as this admin.
    preview: (doc) =>
      typeof doc.handle === "string" && doc.handle
        ? `/products/${encodeURIComponent(doc.handle)}`
        : null,
    description:
      "Add a product, then use Variants & pricing to create its colours and sizes and set stock.",
    components: {
      ...defaultCollection.admin?.components,
      beforeList: ["/payload/admin/back-link#BackLink"],
      edit: {
        ...defaultCollection.admin?.components?.edit,
        beforeDocumentControls: ["/payload/admin/back-link#BackLink"],
      },
    },
  },
  fields: staffOnly(
    [
      {
        type: "tabs",
        tabs: [
          {
            label: "General",
            fields: [
              {
                name: "title",
                type: "text",
                required: true,
                admin: {
                  components: {
                    Cell: "/payload/admin/product-cells#ProductCell",
                  },
                },
              },
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
            fields: [
              ...defaultCollection.fields,
              {
                name: "variantManager",
                type: "ui",
                admin: {
                  components: {
                    Field: "/payload/admin/variant-manager#VariantManager",
                  },
                },
              },
              // List-view columns only.
              {
                name: "stockSummary",
                label: "Stock",
                type: "ui",
                admin: {
                  components: {
                    Cell: "/payload/admin/product-cells#StockCell",
                  },
                },
              },
              {
                name: "priceSummary",
                label: "Price",
                type: "ui",
                admin: {
                  components: {
                    Cell: "/payload/admin/product-cells#PriceCell",
                  },
                },
              },
            ],
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
                  description:
                    "Leave empty to sell only in the default channel.",
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
            label: "Storefront",
            description:
              "How the product appears in the shop. Price: set INR under Variants & pricing (variant prices are ignored). Stock: the inventory number, or each variant's when variants are on. Sizes and colours come from the variants' Size and Color options.",
            fields: [
              {
                name: "details",
                type: "textarea",
                admin: { description: "The product page's Details accordion." },
              },
              {
                name: "shippingReturns",
                label: "Shipping & returns",
                type: "textarea",
                admin: {
                  description:
                    "The product page's Shipping & Returns accordion.",
                },
              },
              {
                name: "colorImages",
                label: "Colour photos",
                labels: { singular: "Colour", plural: "Colours" },
                type: "array",
                admin: {
                  description:
                    "Optional. Photos per colour: the first is the colour's tile in the picker, and picking the colour shows these in the gallery. Colours without photos show their swatch.",
                },
                fields: [
                  {
                    type: "row",
                    fields: [
                      {
                        name: "color",
                        label: "Colour",
                        type: "relationship",
                        relationTo: "variantOptions",
                        required: true,
                        filterOptions: {
                          "variantType.name": { in: ["color", "colour"] },
                        },
                      },
                      {
                        name: "images",
                        label: "Photos",
                        type: "upload",
                        relationTo: "media",
                        hasMany: true,
                        required: true,
                      },
                    ],
                  },
                ],
              },
              {
                name: "imageFrame",
                label: "Card image frame",
                type: "group",
                admin: {
                  description:
                    "Optional. Where the product shot sits inside the listing card, in % of the card. Leave empty for a full-bleed photo.",
                },
                fields: [
                  {
                    type: "row",
                    fields: (["left", "top", "width", "height"] as const).map(
                      (name) => ({
                        name,
                        type: "number" as const,
                        min: 0,
                        max: 100,
                      }),
                    ),
                  },
                ],
              },
            ],
          },
          {
            label: "Attributes",
            fields: [
              {
                type: "row",
                fields: [
                  {
                    name: "weight",
                    label: "Weight (g)",
                    type: "number",
                    min: 0,
                  },
                  {
                    name: "length",
                    label: "Length (cm)",
                    type: "number",
                    min: 0,
                  },
                  {
                    name: "width",
                    label: "Width (cm)",
                    type: "number",
                    min: 0,
                  },
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
        admin: {
          position: "sidebar",
          description: "Allow promotions to apply.",
        },
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
    // Not shown in the shop: stock levels and internal/integration data.
    [
      "inventory",
      "metadata",
      "hsCode",
      "midCode",
      "salesChannels",
      "shippingProfile",
      "discountable",
    ],
  ),
});
