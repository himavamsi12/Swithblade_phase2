import type { CollectionConfig } from "payload";
import { anyone, isAdmin } from "../access";
import { countryOptions } from "../countries";
import { currencyOptions } from "../currencies";
import { group } from "../groups";
import { metadataField } from "../fields/metadata";

/**
 * A market with one currency and a set of countries (Medusa: Settings →
 * Regions). Checkout picks the region from the shipping country.
 */
export const Regions: CollectionConfig = {
  slug: "regions",
  admin: {
    group: group.settings,
    useAsTitle: "name",
    defaultColumns: ["name", "currency", "countries", "paymentProviders"],
  },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: "name", type: "text", required: true, unique: true },
    {
      name: "currency",
      type: "select",
      required: true,
      options: currencyOptions,
    },
    {
      name: "countries",
      type: "select",
      hasMany: true,
      required: true,
      options: countryOptions,
      admin: { description: "A country can belong to only one region." },
      validate: async (value, { req, id }) => {
        if (!Array.isArray(value) || value.length === 0) {
          return "Pick at least one country.";
        }
        const { docs } = await req.payload.find({
          collection: "regions",
          where: {
            and: [
              { countries: { in: value } },
              ...(id ? [{ id: { not_equals: id } }] : []),
            ],
          },
          limit: 1,
          depth: 0,
          req,
        });
        const clash = docs[0];
        return clash
          ? `Some of these countries already belong to "${clash.name}".`
          : true;
      },
    },
    {
      name: "paymentProviders",
      label: "Payment providers",
      type: "select",
      hasMany: true,
      defaultValue: ["stripe"],
      options: [
        { label: "Stripe", value: "stripe" },
        { label: "Manual / cash on delivery", value: "manual" },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "automaticTaxes",
          label: "Automatic taxes",
          type: "checkbox",
          defaultValue: true,
          admin: { description: "Calculate tax at checkout from tax regions." },
        },
        {
          name: "isTaxInclusive",
          label: "Prices include tax",
          type: "checkbox",
          defaultValue: false,
        },
      ],
    },
    metadataField,
  ],
};
