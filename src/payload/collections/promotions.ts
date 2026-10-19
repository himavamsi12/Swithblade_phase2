import type { CollectionConfig } from "payload";
import { isAdmin } from "../access";
import { currencyOptions } from "../currencies";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/**
 * Discount codes and automatic discounts (Medusa: Promotions). The rules
 * decide eligibility; the application method decides what is discounted.
 */
export const Promotions: CollectionConfig = {
  slug: "promotions",
  admin: {
    group: group.promotions,
    useAsTitle: "code",
    defaultColumns: ["code", "type", "status", "campaign", "usedCount"],
  },
  access: {
    // Storefronts validate codes through the server, never by listing them.
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [
      ({ data }) =>
        data?.code
          ? { ...data, code: String(data.code).trim().toUpperCase() }
          : data,
    ],
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "code",
          type: "text",
          required: true,
          unique: true,
          index: true,
        },
        {
          name: "type",
          type: "select",
          required: true,
          defaultValue: "standard",
          options: [
            { label: "Standard", value: "standard" },
            { label: "Buy X get Y", value: "buyget" },
          ],
        },
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
        { label: "Inactive", value: "inactive" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "isAutomatic",
      label: "Apply automatically (no code needed)",
      type: "checkbox",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "campaign",
      type: "relationship",
      relationTo: "campaigns",
      admin: { position: "sidebar" },
    },
    {
      name: "applicationMethod",
      label: "Discount",
      type: "group",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "type",
              type: "select",
              required: true,
              defaultValue: "percentage",
              options: [
                { label: "Percentage", value: "percentage" },
                { label: "Fixed amount", value: "fixed" },
              ],
            },
            {
              name: "value",
              type: "number",
              required: true,
              min: 0,
              admin: {
                description:
                  "Percent (0–100), or an amount in the smallest currency unit.",
              },
            },
            {
              name: "currency",
              type: "select",
              options: currencyOptions,
              admin: { condition: (_, s) => s?.type === "fixed" },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "targetType",
              label: "Applies to",
              type: "select",
              required: true,
              defaultValue: "order",
              options: [
                { label: "Order total", value: "order" },
                { label: "Specific items", value: "items" },
                { label: "Shipping", value: "shipping_methods" },
              ],
            },
            {
              name: "allocation",
              type: "select",
              defaultValue: "across",
              options: [
                { label: "Spread across items", value: "across" },
                { label: "Each item", value: "each" },
              ],
              admin: { condition: (_, s) => s?.targetType === "items" },
            },
            {
              name: "maxQuantity",
              label: "Max discounted quantity",
              type: "number",
              min: 1,
              admin: { condition: (_, s) => s?.targetType === "items" },
            },
          ],
        },
        {
          type: "row",
          admin: { condition: (_, s) => s?.targetType === "items" },
          fields: [
            {
              name: "targetProducts",
              label: "Products",
              type: "relationship",
              relationTo: "products",
              hasMany: true,
            },
            {
              name: "targetCategories",
              label: "Categories",
              type: "relationship",
              relationTo: "product-categories",
              hasMany: true,
            },
            {
              name: "targetCollections",
              label: "Collections",
              type: "relationship",
              relationTo: "product-collections",
              hasMany: true,
            },
          ],
        },
        {
          name: "buyRules",
          label: "Buy X",
          type: "group",
          admin: {
            condition: (data) => data?.type === "buyget",
            description: "The customer must buy this many of these products.",
          },
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "minQuantity",
                  label: "Quantity",
                  type: "number",
                  min: 1,
                },
                {
                  name: "products",
                  type: "relationship",
                  relationTo: "products",
                  hasMany: true,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "rules",
      label: "Conditions",
      type: "group",
      admin: { description: "Leave empty to allow everyone." },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "customerGroups",
              label: "Customer groups",
              type: "relationship",
              relationTo: "customer-groups",
              hasMany: true,
            },
            {
              name: "regions",
              type: "relationship",
              relationTo: "regions",
              hasMany: true,
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "minSubtotal",
              label: "Minimum subtotal",
              type: "number",
              min: 0,
            },
            { name: "currency", type: "select", options: currencyOptions },
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
      type: "row",
      fields: [
        { name: "usageLimit", label: "Usage limit", type: "number", min: 1 },
        {
          name: "usedCount",
          label: "Times used",
          type: "number",
          defaultValue: 0,
          admin: { readOnly: true },
        },
      ],
    },
    metadataField,
  ],
};
