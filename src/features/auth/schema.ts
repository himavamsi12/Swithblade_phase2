import { z } from "zod";

const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");

/** Shared by the form (instant feedback) and the server action (the real check). */
export const credentialsSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password,
});

export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords don't match.",
  });

export type Credentials = z.infer<typeof credentialsSchema>;

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "confirm", string>>;
  /** Echoed back so the email survives a failed submit. */
  email?: string;
};

export const initialAuthState: AuthFormState = { status: "idle" };
