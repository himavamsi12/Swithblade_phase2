import type { CollectionConfig } from "payload";
import { isAdmin, isSuperAdmin } from "../access";
import { group } from "../groups";

/** Staff accounts that sign in to the admin (Medusa: Settings → Users). */
export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    group: group.settings,
    useAsTitle: "email",
    defaultColumns: ["email", "firstName", "lastName", "role"],
  },
  access: {
    admin: ({ req }) => req.user?.collection === "users",
    read: isAdmin,
    create: isSuperAdmin,
    delete: isSuperAdmin,
    update: ({ req, id }) =>
      req.user?.collection === "users" &&
      ((req.user as { role?: string }).role === "admin" || req.user.id === id),
  },
  fields: [
    {
      type: "row",
      fields: [
        { name: "firstName", type: "text" },
        { name: "lastName", type: "text" },
      ],
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "member",
      saveToJWT: true,
      options: [
        { label: "Admin", value: "admin" },
        { label: "Member", value: "member" },
      ],
      admin: {
        position: "sidebar",
        description:
          "Admins can manage users and store settings. Members manage catalog and orders.",
      },
      access: {
        update: ({ req }) =>
          (req.user as { role?: string } | null)?.role === "admin",
      },
    },
  ],
  hooks: {
    // The very first account created through the admin becomes an admin.
    beforeChange: [
      async ({ req, operation, data }) => {
        if (operation !== "create") return data;
        const { totalDocs } = await req.payload.count({
          collection: "users",
          req,
        });
        return totalDocs === 0 ? { ...data, role: "admin" } : data;
      },
    ],
  },
};
