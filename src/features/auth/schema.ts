import { z } from "zod";
import { indianMobile } from "@/features/shipping/shiprocket-order";

const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");

/** Shared by the form (instant feedback) and the server action (the real check). */
export const credentialsSchema = z.object({
  // Trim before checking the format, or " me@example.com" is rejected.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
  password,
});

export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords don't match.",
  });

export type Credentials = z.infer<typeof credentialsSchema>;

/** A 10-digit Indian mobile, sent to Supabase in E.164 ("+919876543210"). */
export const phoneSchema = z
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
    return `+91${mobile}`;
  });

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code.");

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<
    Record<"email" | "password" | "confirm" | "phone" | "otp", string>
  >;
  /** Echoed back so the email survives a failed submit. */
  email?: string;
  /** The number a code was sent to (E.164); set once the OTP step starts. */
  phone?: string;
  /** When that code was sent (ms), for the resend countdown. */
  sentAt?: number;
};

export const initialAuthState: AuthFormState = { status: "idle" };
