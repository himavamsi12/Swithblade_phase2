import type { CollectionConfig } from "payload";
import { isAdmin, isDocumentOwner } from "../access";
import { currencyOptions } from "../currencies";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/**
 * Customer returns and their refunds (Medusa: Orders → Returns). Shoppers
 * request them from their order history with photos; staff review and set
 * Approved, which creates the return order in Shiprocket for the pickup.
 */
export const Returns: CollectionConfig = {
  slug: "returns",
  admin: {
    group: group.orders,
    useAsTitle: "id",
    defaultColumns: ["order", "status", "refundAmount", "createdAt"],
  },
  access: {
    read: isDocumentOwner,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: "order",
      type: "relationship",
      relationTo: "orders",
      required: true,
      index: true,
    },
    {
      name: "customer",
      type: "relationship",
      relationTo: "customers",
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "requested",
      options: [
        { label: "Requested (to review)", value: "requested" },
        { label: "Approved (book pickup)", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Received", value: "received" },
        { label: "Partially received", value: "partially_received" },
        { label: "Refunded", value: "refunded" },
        { label: "Canceled", value: "canceled" },
      ],
      admin: {
        position: "sidebar",
        description:
          "Approved creates the Shiprocket return order. The shopper sees each step under Track return.",
      },
    },
    {
      name: "customerNote",
      label: "Shopper's note",
      type: "textarea",
      admin: { readOnly: true },
    },
    {
      name: "photos",
      type: "relationship",
      relationTo: "return-photos",
      hasMany: true,
      admin: { readOnly: true },
    },
    {
      name: "items",
      type: "array",
      required: true,
      minRows: 1,
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "product",
              type: "relationship",
              relationTo: "products",
              required: true,
            },
            { name: "variant", type: "relationship", relationTo: "variants" },
            { name: "quantity", type: "number", required: true, min: 1 },
            {
              name: "lineId",
              label: "Order line",
              type: "text",
              admin: {
                readOnly: true,
                description: "The order line returned, set by the storefront.",
              },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "reason",
              type: "relationship",
              relationTo: "return-reasons",
            },
            { name: "note", type: "text" },
            {
              name: "receivedQuantity",
              label: "Received",
              type: "number",
              min: 0,
            },
          ],
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "location",
          label: "Return to",
          type: "relationship",
          relationTo: "stock-locations",
        },
        {
          name: "shippingOption",
          label: "Return shipping",
          type: "relationship",
          relationTo: "shipping-options",
          filterOptions: { isReturn: { equals: true } },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "refundAmount",
          label: "Refund amount",
          type: "number",
          min: 0,
        },
        { name: "currency", type: "select", options: currencyOptions },
      ],
    },
    { name: "approvedAt", type: "date", admin: { position: "sidebar" } },
    { name: "receivedAt", type: "date", admin: { position: "sidebar" } },
    { name: "refundedAt", type: "date", admin: { position: "sidebar" } },
    { name: "internalNote", label: "Internal note", type: "textarea" },
    metadataField,
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Keep the customer in sync with the order, so customers can read their own returns.
        if (operation === "create" && data.order) {
          const order = await req.payload.findByID({
            collection: "orders",
            id: typeof data.order === "object" ? data.order.id : data.order,
            depth: 0,
            req,
          });
          data = { ...data, customer: order.customer ?? null };
        }
        return data;
      },
      // Dates the shopper's Track return timeline shows, set once.
      ({ data, originalDoc }) => {
        const now = new Date().toISOString();
        const stamp = (field: string, statuses: string[]) => {
          if (
            statuses.includes(data.status) &&
            !data[field] &&
            !originalDoc?.[field]
          ) {
            data[field] = now;
          }
        };
        stamp("approvedAt", [
          "approved",
          "received",
          "partially_received",
          "refunded",
        ]);
        stamp("receivedAt", ["received", "partially_received", "refunded"]);
        stamp("refundedAt", ["refunded"]);
        return data;
      },
    ],
    afterChange: [
      // A requested or approved return gets its Shiprocket return order, once. Loaded
      // lazily: the shipping code is server-only and imports this config.
      async ({ doc, req, context }) => {
        const { SHIPROCKET_RETURN_CONTEXT, sendReturnToShiprocket } =
          await import("@/features/shipping/repository");
        if (context[SHIPROCKET_RETURN_CONTEXT]) return doc;
        const metadata = await sendReturnToShiprocket(doc.id, req);
        return metadata ? { ...doc, metadata } : doc;
      },
    ],
  },
};
