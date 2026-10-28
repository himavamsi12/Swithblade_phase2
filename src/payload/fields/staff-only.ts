import type { Field } from "payload";
import { adminOnlyFieldAccess } from "../access";

/**
 * Hides the named fields from Payload's public API (REST/GraphQL), so stock
 * levels, SKUs and internal data can't be scraped from `/api/products` or
 * `/api/variants`. Staff still see them; the storefront reads through the
 * server-side local API, which isn't limited by access rules.
 *
 * Walks into rows, tabs and collapsibles, where field names stay flat.
 */
export function staffOnly(fields: Field[], names: readonly string[]): Field[] {
  return fields.map((field) => {
    if ("name" in field && names.includes(field.name)) {
      // Every field these names refer to supports `access`; a few field
      // types (e.g. join) don't, so the union needs a cast.
      const { access } = field as { access?: object };
      return {
        ...field,
        access: { ...access, read: adminOnlyFieldAccess },
      } as Field;
    }
    if (field.type === "row" || field.type === "collapsible") {
      return { ...field, fields: staffOnly(field.fields, names) };
    }
    if (field.type === "tabs") {
      return {
        ...field,
        tabs: field.tabs.map((tab) =>
          // Named tabs nest their fields under the tab's name; leave them be.
          "name" in tab && tab.name
            ? tab
            : { ...tab, fields: staffOnly(tab.fields, names) },
        ),
      };
    }
    return field;
  });
}
