import type { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";
import type { Field } from "payload";
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
  // As for products: no empty variant saved on opening "Create new".
  versions: { drafts: { autosave: false } },
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
      ...defaultCollection.fields.map((field) => {
        if (!("name" in field)) return field;
        if (field.name === "product") {
          // The plugin makes this read-only, expecting variants to be made
          // from their product's page; that left Inventory → Create new
          // unsaveable. Pickable on create, fixed once saved.
          return {
            ...field,
            admin: { ...field.admin, readOnly: false },
            access: {
              ...("access" in field ? field.access : {}),
              update: () => false,
            },
          } as Field;
        }
        if (field.name === "options") {
          return {
            ...field,
            admin: {
              ...field.admin,
              components: {
                ...field.admin?.components,
                // Guards the plugin's picker against a missing product.
                Field:
                  "/payload/admin/variant-options-field#VariantOptionsField",
              },
            },
          } as Field;
        }
        return field;
      }),
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
