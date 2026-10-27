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
      type: "collapsible",
      label: "Kill switches",
      admin: {
        description:
          "Emergency controls. They take effect on the storefront immediately, no deploy needed.",
      },
      fields: [
        {
          name: "checkoutPaused",
          label: "Pause checkout",
          type: "checkbox",
          defaultValue: false,
          admin: {
            description:
              "Shoppers can still browse and fill their bag, but can't start a payment. Payments already in progress still complete and are recorded.",
          },
        },
        {
          name: "checkoutPausedMessage",
          label: "Message shown while checkout is paused",
          type: "text",
          maxLength: 200,
          defaultValue:
            "Checkout is paused for a few minutes. Your bag is saved; please try again shortly.",
          admin: { condition: (data) => Boolean(data?.checkoutPaused) },
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
