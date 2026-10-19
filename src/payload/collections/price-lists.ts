import type { CollectionConfig } from "payload";
import { isAdmin } from "../access";
import { currencyOptions } from "../currencies";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/**
 * Sale prices or overrides for chosen customer groups and dates (Medusa:
 * Price Lists).
 */
export const PriceLists: CollectionConfig = {
  slug: "price-lists",
  labels: { singular: "Price list", plural: "Price lists" },
  admin: {
    group: group.pricing,
    useAsTitle: "title",
    defaultColumns: ["title", "type", "status", "startsAt", "endsAt"],
  },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "description", type: "textarea" },
    {
      type: "row",
      fields: [
        {
          name: "type",
          type: "select",
          required: true,
          defaultValue: "sale",
          options: [
            { label: "Sale (shows as discounted)", value: "sale" },
            { label: "Override (replaces price)", value: "override" },
          ],
        },
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "draft",
          index: true,
          options: [
            { label: "Draft", value: "draft" },
            { label: "Active", value: "active" },
          ],
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "startsAt",
          label: "Starts",
          type: "date",
          admin: { date: { pickerAppearance: "dayAndTime" } },
        },
        {
          name: "endsAt",
          label: "Ends",
          type: "date",
          admin: { date: { pickerAppearance: "dayAndTime" } },
        },
      ],
    },
    {
      name: "customerGroups",
      label: "Customer groups",
      type: "relationship",
      relationTo: "customer-groups",
      hasMany: true,
      admin: { description: "Leave empty to apply to everyone." },
    },
    {
      name: "prices",
      type: "array",
      admin: {
        description: "Amounts in the smallest currency unit (e.g. cents).",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "variant",
              type: "relationship",
              relationTo: "variants",
              required: true,
            },
            {
              name: "currency",
              type: "select",
              required: true,
              options: currencyOptions,
            },
            { name: "amount", type: "number", required: true, min: 0 },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "minQuantity",
              label: "Min quantity",
              type: "number",
              min: 1,
            },
            {
              name: "maxQuantity",
              label: "Max quantity",
              type: "number",
              min: 1,
            },
          ],
        },
      ],
    },
    metadataField,
  ],
};
