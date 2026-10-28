import { z } from "zod";
import { indianMobile } from "@/features/shipping/shiprocket-order";

/*
 * The delivery address the shopper enters on the bag page. India only, since
 * orders ship with Shiprocket. It travels in the Razorpay order's notes (like
 * the cart) so the webhook can still record it if the browser never returns.
 */

const text = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max);

export const deliveryAddressSchema = z.object({
  /** Not part of the address notes: travels in its own `email` note. */
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.").max(254)),
  fullName: text(80, "Enter the full name."),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const mobile = indianMobile(v);
      if (!mobile) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a 10-digit Indian mobile number.",
        });
        return z.NEVER;
      }
      return mobile;
    }),
  addressLine1: text(120, "Enter the house / flat and street."),
  addressLine2: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || null),
  city: text(60, "Enter the city."),
  state: text(60, "Enter the state."),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, "Enter a 6-digit PIN code."),
});

export type DeliveryAddressInput = z.input<typeof deliveryAddressSchema>;
export type DeliveryAddress = z.output<typeof deliveryAddressSchema>;

/** Notes values are capped at 256 characters, so split over two keys. */
const NOTE_CHUNK = 255;
const NOTE_KEYS = ["ship0", "ship1"] as const;

export function encodeAddressNotes(
  a: DeliveryAddress,
): Record<string, string> | null {
  const json = JSON.stringify([
    a.fullName,
    a.phone,
    a.addressLine1,
    a.addressLine2,
    a.city,
    a.state,
    a.pincode,
  ]);
  if (json.length > NOTE_CHUNK * NOTE_KEYS.length) return null;
  return Object.fromEntries(
    NOTE_KEYS.map((key, i) => [
      key,
      json.slice(i * NOTE_CHUNK, (i + 1) * NOTE_CHUNK),
    ]).filter(([, chunk]) => chunk),
  );
}

/** Same shape as Magic Checkout's `customer_details.shipping_address`. */
export function decodeAddressNotes(notes: unknown) {
  if (typeof notes !== "object" || notes === null) return null;
  const record = notes as Record<string, unknown>;
  const json = NOTE_KEYS.map((k) =>
    typeof record[k] === "string" ? record[k] : "",
  ).join("");
  try {
    const row: unknown = JSON.parse(json);
    if (!Array.isArray(row) || row.length !== 7) return null;
    const [name, contact, line1, line2, city, state, zipcode] =
      row as unknown[];
    if (
      typeof name !== "string" ||
      typeof contact !== "string" ||
      typeof line1 !== "string" ||
      typeof city !== "string" ||
      typeof state !== "string" ||
      typeof zipcode !== "string"
    ) {
      return null;
    }
    return {
      name,
      contact,
      line1,
      line2: typeof line2 === "string" ? line2 : null,
      city,
      state,
      zipcode,
      country: "IN",
    };
  } catch {
    return null;
  }
}
