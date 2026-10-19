import type { CollectionConfig } from "payload";
import { anyone, isAdmin } from "../access";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/** Why items come back (Medusa: Settings → Return Reasons). */
export const ReturnReasons: CollectionConfig = {
  slug: "return-reasons",
  labels: { singular: "Return reason", plural: "Return reasons" },
  admin: {
    group: group.settings,
    useAsTitle: "label",
    defaultColumns: ["label", "value"],
  },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "value",
          type: "text",
          required: true,
          unique: true,
          admin: { description: "Machine name, e.g. wrong_size" },
        },
        { name: "label", type: "text", required: true },
      ],
    },
    { name: "description", type: "textarea" },
    metadataField,
  ],
};
