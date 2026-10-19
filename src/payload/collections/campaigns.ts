import type { CollectionConfig } from "payload";
import { isAdmin } from "../access";
import { currencyOptions } from "../currencies";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/** Time-boxed marketing pushes that group promotions and cap their budget. */
export const Campaigns: CollectionConfig = {
  slug: "campaigns",
  admin: {
    group: group.promotions,
    useAsTitle: "name",
    defaultColumns: ["name", "identifier", "startsAt", "endsAt"],
  },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    {
      type: "row",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "identifier", type: "text", required: true, unique: true },
      ],
    },
    { name: "description", type: "textarea" },
    {
      type: "row",
      fields: [
        {
          name: "startsAt",
          label: "Start date",
          type: "date",
          admin: { date: { pickerAppearance: "dayAndTime" } },
        },
        {
          name: "endsAt",
          label: "End date",
          type: "date",
          admin: { date: { pickerAppearance: "dayAndTime" } },
        },
      ],
    },
    {
      name: "budget",
      type: "group",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "type",
              type: "select",
              options: [
                { label: "Total spend", value: "spend" },
                { label: "Number of uses", value: "usage" },
              ],
            },
            {
              name: "currency",
              type: "select",
              options: currencyOptions,
              admin: { condition: (_, s) => s?.type === "spend" },
            },
            { name: "limit", type: "number", min: 0 },
            {
              name: "used",
              type: "number",
              defaultValue: 0,
              admin: { readOnly: true },
            },
          ],
        },
      ],
    },
    {
      name: "promotions",
      type: "join",
      collection: "promotions",
      on: "campaign",
    },
    metadataField,
  ],
};
