import type { CollectionConfig } from "payload";
import { anyone, isAdmin } from "../access";
import { group } from "../groups";
import { revalidateCatalogHooks } from "../hooks/revalidate-catalog";

/**
 * Product and content images. Stored in Supabase Storage when the S3_* env
 * vars are set (see payload.config.ts), otherwise on local disk under `/media`.
 */
export const Media: CollectionConfig = {
  slug: "media",
  hooks: {
    afterChange: [revalidateCatalogHooks.afterChange],
    afterDelete: [revalidateCatalogHooks.afterDelete],
  },
  admin: { group: group.products },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  upload: {
    staticDir: "media",
    mimeTypes: ["image/*"],
    focalPoint: true,
    imageSizes: [
      { name: "thumbnail", width: 300 },
      { name: "card", width: 700 },
      { name: "large", width: 1600 },
    ],
    adminThumbnail: "thumbnail",
  },
  fields: [{ name: "alt", type: "text", required: true }],
};
