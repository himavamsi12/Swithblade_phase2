import type { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";
import { staffOnly } from "../fields/staff-only";
import { withCatalogRevalidation } from "../hooks/revalidate-catalog";

/** Adds Medusa's variant identifiers and inventory flags. */
export const variantsOverride: CollectionOverride = ({
  defaultCollection,
}) => ({
  ...defaultCollection,
  hooks: withCatalogRevalidation(defaultCollection.hooks),
  // Listed under Inventory, like Medusa's inventory items.
  labels: { singular: "Inventory item", plural: "Inventory" },
  admin: {
    ...defaultCollection.admin,
    group: group.inventory,
    defaultColumns: ["title", "sku", "inventory", "updatedAt"],
    listSearchableFields: ["title", "sku", "barcode"],
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
      ...defaultCollection.fields,
      {
        type: "row",
        fields: [
          {
            name: "sku",
            label: "SKU",
            type: "text",
            unique: true,
            index: true,
          },
          { name: "barcode", type: "text" },
          { name: "ean", label: "EAN", type: "text" },
          { name: "upc", label: "UPC", type: "text" },
        ],
      },
      {
        type: "row",
        fields: [
          {
            name: "manageInventory",
            label: "Track inventory",
            type: "checkbox",
            defaultValue: true,
          },
          {
            name: "allowBackorder",
            label: "Allow backorders",
            type: "checkbox",
            defaultValue: false,
          },
        ],
      },
      {
        type: "row",
        fields: [
          { name: "weight", label: "Weight (g)", type: "number", min: 0 },
          { name: "length", label: "Length (cm)", type: "number", min: 0 },
          { name: "width", label: "Width (cm)", type: "number", min: 0 },
          { name: "height", label: "Height (cm)", type: "number", min: 0 },
        ],
      },
      metadataField,
    ],
    // Not shown in the shop: stock levels, codes and integration data.
    [
      "inventory",
      "manageInventory",
      "allowBackorder",
      "sku",
      "barcode",
      "ean",
      "upc",
      "weight",
      "length",
      "width",
      "height",
      "metadata",
    ],
  ),
});
