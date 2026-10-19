import type { Field } from "payload";
import { countryOptions } from "../countries";

/** Postal address fields shared by stock locations and other settings. */
export const addressFields: Field[] = [
  {
    type: "row",
    fields: [
      { name: "address1", label: "Address", type: "text" },
      { name: "address2", label: "Apartment, suite, etc.", type: "text" },
    ],
  },
  {
    type: "row",
    fields: [
      { name: "city", type: "text" },
      { name: "province", label: "State / Province", type: "text" },
      { name: "postalCode", label: "Postal code", type: "text" },
    ],
  },
  {
    type: "row",
    fields: [
      { name: "country", type: "select", options: countryOptions },
      { name: "phone", type: "text" },
    ],
  },
];
