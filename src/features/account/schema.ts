import { z } from "zod";
import { supportedCountries } from "@/payload/countries";

const countryCodes = supportedCountries.map((c) => c.value) as [
  string,
  ...string[],
];
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80),
  lastName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  phoneCountry: z.enum(countryCodes).optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^[\d\s()-]{6,20}$/.test(v),
      "Enter a valid phone number.",
    ),
});

export const addressTypes = ["Home", "Work", "Other"] as const;

export const addressSchema = z.object({
  /** Present when editing an existing address. */
  id: z.coerce.number().int().positive().optional(),
  fullName: z.string().trim().min(1, "Enter the full name.").max(160),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^[+\d\s()-]{6,20}$/.test(v),
      "Enter a valid phone number.",
    )
    .transform((v) => v || null),
  addressLine1: z.string().trim().min(1, "Enter the address.").max(160),
  addressLine2: optionalText(160),
  city: z.string().trim().min(1, "Enter the city.").max(80),
  state: optionalText(80),
  postalCode: z.string().trim().min(3, "Enter the PIN / postal code.").max(12),
  country: z.enum(countryCodes, { message: "Choose a country." }),
  title: z.enum(addressTypes).default("Home"),
});

/** "Swetha Seenivasan" → first "Swetha", last "Seenivasan". */
export function splitName(fullName: string) {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  return { firstName: first ?? "", lastName: rest.join(" ") || null };
}

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const idle: FormState = { status: "idle" };
