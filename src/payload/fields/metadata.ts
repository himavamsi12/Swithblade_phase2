import type { Field } from "payload";

/** Free-form key/value data for integrations, like Medusa's `metadata`. */
export const metadataField = {
  name: "metadata",
  type: "json",
  admin: {
    description: "Custom key/value data for integrations.",
  },
} as const satisfies Field;
