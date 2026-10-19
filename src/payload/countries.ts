import type { CountryType } from "@payloadcms/plugin-ecommerce/types";

/** Countries the store sells to. Extend as new regions launch. */
export const supportedCountries: CountryType[] = [
  { label: "United States", value: "US" },
  { label: "Canada", value: "CA" },
  { label: "United Kingdom", value: "GB" },
  { label: "Ireland", value: "IE" },
  { label: "Germany", value: "DE" },
  { label: "France", value: "FR" },
  { label: "Italy", value: "IT" },
  { label: "Spain", value: "ES" },
  { label: "Netherlands", value: "NL" },
  { label: "Belgium", value: "BE" },
  { label: "Sweden", value: "SE" },
  { label: "Denmark", value: "DK" },
  { label: "India", value: "IN" },
  { label: "United Arab Emirates", value: "AE" },
  { label: "Singapore", value: "SG" },
  { label: "Japan", value: "JP" },
  { label: "Australia", value: "AU" },
];

export const countryOptions = supportedCountries.map(({ label, value }) => ({
  label,
  value,
}));
