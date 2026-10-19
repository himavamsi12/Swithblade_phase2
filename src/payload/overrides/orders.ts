import type { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
} from "payload";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

const FIRST_DISPLAY_ID = 1001;

/**
 * Gives each order a human-friendly number (#1001, #1002…). The unique index
 * on `displayId` makes a concurrent clash fail loudly instead of duplicating.
 */
const assignDisplayId: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== "create" || data.displayId) return data;
  const { docs } = await req.payload.find({
    collection: "orders",
    sort: "-displayId",
    limit: 1,
    depth: 0,
    select: { displayId: true },
    req,
  });
  const last = (docs[0] as { displayId?: number } | undefined)?.displayId;
  const displayId = (last ?? FIRST_DISPLAY_ID - 1) + 1;
  return { ...data, displayId, title: `#${displayId}` };
};

/** Counts promotion usage when an order is placed. */
const countPromotionUsage: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== "create") return doc;
  const ids = (
    (doc.promotions ?? []) as Array<number | string | { id: number | string }>
  ).map((p) => (typeof p === "object" ? p.id : p));
  for (const id of ids) {
    const promotion = await req.payload.findByID({
      collection: "promotions",
      id,
      depth: 0,
      req,
    });
    await req.payload.update({
      collection: "promotions",
      id,
      data: { usedCount: (promotion.usedCount ?? 0) + 1 },
      req,
    });
  }
  return doc;
};

/** Medusa's order fields: statuses, totals, shipping method and fulfillments. */
export const ordersOverride: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  admin: {
    ...defaultCollection.admin,
    group: group.orders,
    useAsTitle: "title",
    defaultColumns: [
      "title",
      "createdAt",
      "customerEmail",
      "paymentStatus",
      "fulfillmentStatus",
      "amount",
    ],
    listSearchableFields: ["title", "customerEmail"],
  },
  defaultSort: "-createdAt",
  hooks: {
    ...defaultCollection.hooks,
    beforeChange: [
      ...(defaultCollection.hooks?.beforeChange ?? []),
      assignDisplayId,
    ],
    afterChange: [
      ...(defaultCollection.hooks?.afterChange ?? []),
      countPromotionUsage,
    ],
  },
  fields: [
    {
      name: "displayId",
      label: "Order number",
      type: "number",
      unique: true,
      index: true,
      admin: { position: "sidebar", readOnly: true },
    },
    { name: "title", type: "text", admin: { hidden: true } },
    ...defaultCollection.fields,
    {
      name: "paymentStatus",
      label: "Payment status",
      type: "select",
      defaultValue: "awaiting",
      index: true,
      options: [
        { label: "Awaiting", value: "awaiting" },
        { label: "Authorized", value: "authorized" },
        { label: "Captured", value: "captured" },
        { label: "Partially refunded", value: "partially_refunded" },
        { label: "Refunded", value: "refunded" },
        { label: "Canceled", value: "canceled" },
        { label: "Requires action", value: "requires_action" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "fulfillmentStatus",
      label: "Fulfillment status",
      type: "select",
      defaultValue: "not_fulfilled",
      index: true,
      options: [
        { label: "Not fulfilled", value: "not_fulfilled" },
        { label: "Partially fulfilled", value: "partially_fulfilled" },
        { label: "Fulfilled", value: "fulfilled" },
        { label: "Shipped", value: "shipped" },
        { label: "Delivered", value: "delivered" },
        { label: "Returned", value: "returned" },
        { label: "Canceled", value: "canceled" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "razorpayOrderId",
      label: "Razorpay order",
      type: "text",
      // One Payload order per Razorpay order, even if the checkout callback
      // and the webhook both record the payment.
      unique: true,
      index: true,
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "razorpayPaymentId",
      label: "Razorpay payment",
      type: "text",
      admin: { position: "sidebar", readOnly: true },
    },
    {
      type: "row",
      admin: { position: "sidebar" },
      fields: [
        { name: "region", type: "relationship", relationTo: "regions" },
        {
          name: "salesChannel",
          label: "Sales channel",
          type: "relationship",
          relationTo: "sales-channels",
        },
      ],
    },
    {
      name: "totals",
      type: "group",
      admin: {
        description:
          "Amounts in the smallest currency unit. `amount` is the grand total.",
      },
      fields: [
        {
          type: "row",
          fields: [
            { name: "subtotal", type: "number", min: 0 },
            {
              name: "discountTotal",
              label: "Discounts",
              type: "number",
              min: 0,
            },
            {
              name: "shippingTotal",
              label: "Shipping",
              type: "number",
              min: 0,
            },
            { name: "taxTotal", label: "Tax", type: "number", min: 0 },
          ],
        },
      ],
    },
    {
      name: "shippingMethod",
      label: "Shipping method",
      type: "group",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "option",
              type: "relationship",
              relationTo: "shipping-options",
            },
            { name: "name", type: "text" },
            { name: "amount", type: "number", min: 0 },
          ],
        },
      ],
    },
    {
      name: "promotions",
      type: "relationship",
      relationTo: "promotions",
      hasMany: true,
    },
    {
      name: "expectedDeliveryAt",
      label: "Expected delivery",
      type: "date",
      admin: { position: "sidebar", date: { pickerAppearance: "dayOnly" } },
    },
    {
      name: "lineItems",
      label: "Line items (as purchased)",
      type: "array",
      admin: {
        description:
          "Snapshot of each item at checkout, so the order never changes if a product is later edited or removed.",
        initCollapsed: true,
      },
      fields: [
        {
          type: "row",
          fields: [
            { name: "title", type: "text", required: true },
            {
              name: "options",
              type: "text",
              admin: { description: "e.g. Maroon · Size XS" },
            },
            { name: "productSlug", label: "Product handle", type: "text" },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "unitPrice",
              label: "Unit price",
              type: "number",
              required: true,
              min: 0,
            },
            {
              name: "quantity",
              type: "number",
              required: true,
              min: 1,
              defaultValue: 1,
            },
            { name: "image", label: "Image URL", type: "text" },
          ],
        },
      ],
    },
    {
      name: "fulfillments",
      type: "array",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "location",
              type: "relationship",
              relationTo: "stock-locations",
            },
            { name: "carrier", type: "text" },
            { name: "trackingNumber", label: "Tracking number", type: "text" },
            { name: "trackingUrl", label: "Tracking URL", type: "text" },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "shippedAt", label: "Shipped", type: "date" },
            { name: "deliveredAt", label: "Delivered", type: "date" },
          ],
        },
      ],
    },
    {
      name: "returns",
      type: "join",
      collection: "returns",
      on: "order",
    },
    { name: "note", label: "Internal note", type: "textarea" },
    metadataField,
  ],
});
