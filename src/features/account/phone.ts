import { supportedCountries } from "@/payload/countries";

/* Phone numbers are stored as "+<dial code> <digits>", e.g. "+91 9025992830". */

const dialCodes: Record<string, string> = {
  US: "1",
  CA: "1",
  GB: "44",
  IE: "353",
  DE: "49",
  FR: "33",
  IT: "39",
  ES: "34",
  NL: "31",
  BE: "32",
  SE: "46",
  DK: "45",
  IN: "91",
  AE: "971",
  SG: "65",
  JP: "81",
  AU: "61",
};

export type PhoneCountry = {
  code: string;
  name: string;
  dial: string;
  flag: string;
};

/** Emoji flag from an ISO country code ("IN" → 🇮🇳). */
export const flagOf = (code: string) =>
  String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );

export const phoneCountries: PhoneCountry[] = supportedCountries
  .filter((c) => dialCodes[c.value])
  .map((c) => ({
    code: c.value,
    name: c.label,
    dial: dialCodes[c.value]!,
    flag: flagOf(c.value),
  }));

export const DEFAULT_PHONE_COUNTRY = "IN";

export function composePhone(countryCode: string, number: string) {
  const dial = dialCodes[countryCode];
  const digits = number.replace(/\D/g, "");
  return dial && digits ? `+${dial} ${digits}` : null;
}

/** Splits a stored phone into its country and national digits. */
export function parsePhone(phone: string | null | undefined): {
  country: PhoneCountry | null;
  national: string;
} {
  const m = phone?.match(/^\+(\d+)\s(\d+)$/);
  if (!m) return { country: null, national: phone?.replace(/\D/g, "") ?? "" };
  const country =
    phoneCountries.find(
      (c) => c.code === DEFAULT_PHONE_COUNTRY && c.dial === m[1],
    ) ??
    phoneCountries.find((c) => c.dial === m[1]) ??
    null;
  return { country, national: m[2]! };
}

/** "+91 90259 92830": national digits grouped in fives for reading. */
export function formatPhone(phone: string | null | undefined) {
  const { country, national } = parsePhone(phone);
  if (!national) return "";
  const grouped = national.replace(/(\d{5})(?=\d)/g, "$1 ");
  return country ? `+${country.dial} ${grouped}` : grouped;
}
