import type { CollectionConfig } from "payload";
import { isAdmin } from "../access";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/**
 * Shoppers. They sign in with Supabase Auth on the storefront; this collection
 * mirrors each Supabase account so staff can see and manage customers here.
 * Rows are created and kept in sync by a database trigger on `auth.users`
 * (see the `sync_supabase_customers` and `phone_customers` migrations), so
 * nothing is missed. Phone sign-ups have a phone number but no email.
 */
export const Customers: CollectionConfig = {
  slug: "customers",
  admin: {
    group: group.customers,
    useAsTitle: "email",
    defaultColumns: [
      "email",
      "firstName",
      "lastName",
      "supabase.provider",
      "supabase.lastSignInAt",
      "createdAt",
    ],
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: "email",
      type: "email",
      // Empty for shoppers who signed up with a phone number.
      unique: true,
      index: true,
    },
    {
      type: "row",
      fields: [
        { name: "firstName", type: "text" },
        { name: "lastName", type: "text" },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "company", type: "text" },
        { name: "phone", type: "text" },
      ],
    },
    {
      name: "supabase",
      label: "Supabase account",
      type: "group",
      admin: {
        position: "sidebar",
        description: "Synced from Supabase Auth. Read-only.",
      },
      // Written by the database trigger, never by the admin UI or API.
      access: { create: () => false, update: () => false },
      fields: [
        {
          name: "userId",
          label: "User ID",
          type: "text",
          unique: true,
          index: true,
          admin: { readOnly: true },
        },
        {
          name: "provider",
          label: "Signed up with",
          type: "text",
          admin: { readOnly: true },
        },
        {
          name: "emailConfirmedAt",
          label: "Email confirmed",
          type: "date",
          admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } },
        },
        {
          name: "lastSignInAt",
          label: "Last sign-in",
          type: "date",
          admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } },
        },
      ],
    },
    {
      name: "groups",
      type: "relationship",
      relationTo: "customer-groups",
      hasMany: true,
      admin: { position: "sidebar" },
      access: { update: ({ req }) => req.user?.collection === "users" },
    },
    {
      name: "addresses",
      type: "join",
      collection: "addresses",
      on: "customer",
      admin: {
        defaultColumns: ["firstName", "addressLine1", "city", "country"],
      },
    },
    {
      name: "orders",
      type: "join",
      collection: "orders",
      on: "customer",
      admin: { defaultColumns: ["displayId", "status", "amount", "createdAt"] },
    },
    {
      ...metadataField,
      access: { read: ({ req }) => req.user?.collection === "users" },
    },
  ],
};
