import type { GlobalConfig } from "payload";
import { anyone, isSuperAdmin } from "../access";
import { currencyOptions } from "../currencies";
import { group } from "../groups";

/** Store-wide defaults (Medusa: Settings → Store). */
export const Store: GlobalConfig = {
  slug: "store",
  label: "Store",
  admin: { group: group.settings },
  access: { read: anyone, update: isSuperAdmin },
  fields: [
    { name: "name", type: "text", required: true, defaultValue: "Switchblade" },
    {
      name: "defaultCurrency",
      label: "Default currency",
      type: "select",
      required: true,
      defaultValue: "INR",
      options: currencyOptions,
    },
    {
      type: "row",
      fields: [
        {
          name: "defaultRegion",
          label: "Default region",
          type: "relationship",
          relationTo: "regions",
        },
        {
          name: "defaultSalesChannel",
          label: "Default sales channel",
          type: "relationship",
          relationTo: "sales-channels",
        },
        {
          name: "defaultLocation",
          label: "Default location",
          type: "relationship",
          relationTo: "stock-locations",
        },
      ],
    },
    {
      name: "orderNotificationEmail",
      label: "Order notification email",
      type: "email",
      admin: { description: "Receives a copy of every new order." },
    },
  ],
};
