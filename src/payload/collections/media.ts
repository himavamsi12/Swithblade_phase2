import type { CollectionConfig } from "payload";
import { anyone, isAdmin } from "../access";
import { group } from "../groups";

/**
 * Product and content images. Stored on local disk under `/media`; switch to
 * the S3 storage adapter before deploying to a serverless host.
 */
export const Media: CollectionConfig = {
  slug: "media",
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
