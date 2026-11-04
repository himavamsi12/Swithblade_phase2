import type { CollectionConfig } from "payload";
import { isAdmin } from "../access";
import { group } from "../groups";

/**
 * Photos shoppers attach to a return request. Staff only: they're served
 * through Payload with these access rules, never from a public URL.
 */
export const ReturnPhotos: CollectionConfig = {
  slug: "return-photos",
  labels: { singular: "Return photo", plural: "Return photos" },
  admin: { group: group.orders, hidden: true, useAsTitle: "caption" },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  upload: {
    staticDir: "media/returns",
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    imageSizes: [{ name: "thumbnail", width: 300 }],
    adminThumbnail: ({ doc }) => {
      const sizes = doc.sizes as { thumbnail?: { url?: string } } | undefined;
      return sizes?.thumbnail?.url ?? (doc.url as string);
    },
  },
  fields: [
    {
      name: "caption",
      type: "text",
      admin: { description: "What the shopper says this shows, e.g. Front." },
    },
    {
      name: "customer",
      type: "relationship",
      relationTo: "customers",
      admin: { readOnly: true },
    },
  ],
};
