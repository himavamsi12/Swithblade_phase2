import type { Field, FieldHook } from "payload";

export const toHandle = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const fillFrom =
  (source: string): FieldHook =>
  ({ value, data }) => {
    if (typeof value === "string" && value.trim()) return toHandle(value);
    const from = data?.[source];
    return typeof from === "string" ? toHandle(from) : value;
  };

/**
 * Medusa-style URL handle. Filled from `source` when left empty, always
 * normalised, unique and indexed for storefront lookups.
 */
export const handleField = (source = "title", name = "handle"): Field => ({
  name,
  type: "text",
  index: true,
  unique: true,
  admin: {
    position: "sidebar",
    description: `Used in the URL. Generated from the ${source} if left empty.`,
  },
  hooks: { beforeValidate: [fillFrom(source)] },
});
