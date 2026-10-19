import type { CollectionConfig } from "payload";
import { isAdmin, isDocumentOwner } from "../access";
import { currencyOptions } from "../currencies";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/** Customer returns and their refunds (Medusa: Orders → Returns). */
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
        { label: "Requested", value: "requested" },
        { label: "Received", value: "received" },
        { label: "Partially received", value: "partially_received" },
        { label: "Canceled", value: "canceled" },
      ],
      admin: { position: "sidebar" },
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
    { name: "receivedAt", type: "date", admin: { position: "sidebar" } },
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
          return { ...data, customer: order.customer ?? null };
        }
        return data;
      },
    ],
  },
};
