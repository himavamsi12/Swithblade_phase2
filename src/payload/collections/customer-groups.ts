import type { CollectionConfig } from "payload";
import { isAdmin } from "../access";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/** Segments used by price lists and promotions (e.g. VIP, wholesale). */
export const CustomerGroups: CollectionConfig = {
  slug: "customer-groups",
  labels: { singular: "Customer group", plural: "Customer groups" },
  admin: { group: group.customers, useAsTitle: "name" },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: "name", type: "text", required: true, unique: true },
    {
      name: "customers",
      type: "join",
      collection: "customers",
      on: "groups",
    },
    metadataField,
  ],
};
