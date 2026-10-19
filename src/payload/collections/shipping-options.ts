import type { CollectionConfig } from "payload";
import { isAdmin } from "../access";
import { currencyOptions } from "../currencies";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/**
 * A delivery method customers can pick at checkout (or staff use for
 * returns), priced per currency.
 */
export const ShippingOptions: CollectionConfig = {
  slug: "shipping-options",
  labels: { singular: "Shipping option", plural: "Shipping options" },
  admin: {
    group: group.settings,
    useAsTitle: "name",
    defaultColumns: [
      "name",
      "stockLocation",
      "serviceZone",
      "isReturn",
      "enabled",
    ],
  },
  access: {
    read: ({ req }) =>
      req.user?.collection === "users" ? true : { enabled: { equals: true } },
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: "name", type: "text", required: true },
    {
      type: "row",
      fields: [
        {
          name: "stockLocation",
          label: "Ships from",
          type: "relationship",
          relationTo: "stock-locations",
          required: true,
        },
        {
          name: "serviceZone",
          label: "Service zone name",
          type: "text",
          required: true,
          admin: { description: "Must match a service zone on the location." },
        },
      ],
    },
    {
      name: "shippingProfile",
      label: "Shipping profile",
      type: "relationship",
      relationTo: "shipping-profiles",
      required: true,
    },
    {
      name: "priceType",
      label: "Price type",
      type: "radio",
      defaultValue: "flat",
      options: [
        { label: "Fixed", value: "flat" },
        { label: "Calculated by carrier", value: "calculated" },
      ],
    },
    {
      name: "prices",
      type: "array",
      admin: {
        condition: (_, sibling) => sibling?.priceType !== "calculated",
        description: "Amounts in the smallest currency unit (e.g. cents).",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "currency",
              type: "select",
              required: true,
              options: currencyOptions,
            },
            { name: "amount", type: "number", required: true, min: 0 },
          ],
        },
      ],
    },
    {
      name: "rules",
      type: "group",
      admin: { description: "Only offer this option when the cart matches." },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "minSubtotal",
              label: "Min subtotal",
              type: "number",
              min: 0,
            },
            {
              name: "maxSubtotal",
              label: "Max subtotal",
              type: "number",
              min: 0,
            },
          ],
        },
      ],
    },
    {
      name: "isReturn",
      label: "Return option",
      type: "checkbox",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "enabled",
      label: "Show in store",
      type: "checkbox",
      defaultValue: true,
      index: true,
      admin: { position: "sidebar" },
    },
    metadataField,
  ],
};
