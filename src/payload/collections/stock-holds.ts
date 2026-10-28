import type { CollectionConfig } from "payload";
import { isAdmin } from "../access";
import { group } from "../groups";

/**
 * Stock reserved for a checkout in progress, one row per product or variant.
 * A hold counts against available stock until it expires, so two shoppers
 * can't both pay for the last unit. Written only by the storefront; staff can
 * look but not edit.
 */
export const StockHolds: CollectionConfig = {
  slug: "stock-holds",
  labels: { singular: "Stock hold", plural: "Stock holds" },
  admin: {
    group: group.inventory,
    useAsTitle: "item",
    defaultColumns: ["item", "quantity", "status", "expiresAt", "createdAt"],
    description:
      "Stock reserved for checkouts in progress. Holds end on their own after 15 minutes.",
  },
  access: {
    read: isAdmin,
    create: () => false,
    update: () => false,
    delete: isAdmin,
  },
  fields: [
    {
      name: "item",
      type: "text",
      required: true,
      index: true,
      admin: { description: "products:<id> or variants:<id>" },
    },
    { name: "label", type: "text" },
    { name: "quantity", type: "number", required: true, min: 1 },
    {
      name: "status",
      type: "select",
      required: true,
      index: true,
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Sold", value: "converted" },
        { label: "Released", value: "released" },
      ],
    },
    { name: "expiresAt", type: "date", required: true, index: true },
    {
      name: "checkout",
      type: "text",
      required: true,
      index: true,
      admin: { description: "Groups the holds of one checkout." },
    },
    {
      name: "holder",
      type: "text",
      required: true,
      index: true,
      admin: {
        description: "The shopper: customer:<id>, or guest:<browser id>.",
      },
    },
    { name: "razorpayOrderId", type: "text", index: true },
  ],
};
