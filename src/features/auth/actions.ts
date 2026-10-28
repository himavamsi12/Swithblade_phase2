"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isAuthProviderEnabled } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  credentialsSchema,
  newPasswordSchema,
  otpSchema,
  phoneSchema,
  type AuthFormState,
} from "./schema";

/*
 * Supabase Auth server actions for the /account pages. Everything runs on the
 * server; the browser only ever sees the session cookies.
 */

const GENERIC_ERROR = "Something went wrong. Please try again.";
const TOO_MANY_ATTEMPTS =
  "Too many attempts. Please wait a few minutes and try again.";

/**
 * Absolute URL of this site, for links in auth emails and OAuth redirects.
 * From config, never from request headers, which a caller can forge to point
 * a reset link at their own domain.
 */
const siteOrigin = () => new URL(env.NEXT_PUBLIC_SITE_URL).origin;

function fieldErrors(error: z.ZodError): AuthFormState["fieldErrors"] {
  const { fieldErrors } = z.flattenError(error);
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([k, v]) => [k, (v as string[])[0]]),
  );
}

/**
 * One step for both cases, as designed: sign in with email + password, and if
 * the email has no account yet, create one.
 */
export async function continueWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = credentialsSchema.safeParse({
    email,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", email, fieldErrors: fieldErrors(parsed.error) };
  }
  if (
    !(await rateLimit(
      "signIn",
      `ip:${await clientIp()}`,
      `email:${parsed.data.email}`,
    ))
  ) {
    return {
      status: "error",
      email: parsed.data.email,
      message: TOO_MANY_ATTEMPTS,
    };
  }

  const supabase = await createSupabaseServerClient();
  const signIn = await supabase.auth.signInWithPassword(parsed.data);

  if (!signIn.error) redirect("/account");

  if (signIn.error.code === "email_not_confirmed") {
    return {
      status: "error",
      email: parsed.data.email,
      message:
        "Please confirm your email first. Check your inbox for the link.",
    };
  }
  if (signIn.error.code !== "invalid_credentials") {
    return {
      status: "error",
      email: parsed.data.email,
      message: GENERIC_ERROR,
    };
  }

  // Wrong password, or no account yet: try creating one.
  const signUp = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${siteOrigin()}/auth/callback?next=/account`,
    },
  });

  if (signUp.error) {
    const message =
      signUp.error.code === "weak_password"
        ? signUp.error.message
        : signUp.error.code === "over_email_send_rate_limit"
          ? "Too many attempts. Please wait a minute and try again."
          : GENERIC_ERROR;
    return { status: "error", email: parsed.data.email, message };
  }

  // Supabase hides whether an email is registered: for an existing account it
  // returns a user with no identities. So the password was simply wrong.
  if (signUp.data.user && signUp.data.user.identities?.length === 0) {
    return {
      status: "error",
      email: parsed.data.email,
      message: "Incorrect email or password.",
    };
  }

  // Email confirmation off in Supabase: signed in straight away.
  if (signUp.data.session) redirect("/account");

  return {
    status: "success",
    email: parsed.data.email,
    message: `Account created. We sent a confirmation link to ${parsed.data.email}.`,
  };
}

export async function continueWithGoogle(): Promise<AuthFormState> {
  // Supabase shows a raw error page for a disabled provider; say it here instead.
  if (!(await isAuthProviderEnabled("google"))) {
    return {
      status: "error",
      message:
        "Google sign-in isn't available yet. Please continue with email.",
    };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteOrigin()}/auth/callback?next=/account`,
    },
  });
  if (error || !data.url) {
    return {
      status: "error",
      message: "Google sign-in isn't available right now. Please use email.",
    };
  }
  // External Supabase/Google URL, outside the app's typed routes.
  redirect(data.url as Route);
}

/** "+919876543210" → "+91 98765 43210", for messages. */
const displayPhone = (e164: string) =>
  `${e164.slice(0, 3)} ${e164.slice(3, 8)} ${e164.slice(8)}`;

/**
 * Phone OTP sign-in, creating the account on first use. One action for both
 * steps: `step=send` texts a code (also used to resend), `step=verify`
 * checks it and signs the shopper in.
 */
export async function continueWithPhone(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsedPhone = phoneSchema.safeParse(
    String(formData.get("phone") ?? ""),
  );
  if (!parsedPhone.success) {
    return {
      status: "error",
      fieldErrors: { phone: parsedPhone.error.issues[0]?.message },
    };
  }
  const phone = parsedPhone.data;
  const ip = `ip:${await clientIp()}`;
  const supabase = await createSupabaseServerClient();

  // Set on the code screen (verify or resend), so errors keep the shopper there.
  const sentAt = Number(formData.get("sentAt")) || undefined;

  if (formData.get("step") === "verify") {
    const otp = otpSchema.safeParse(String(formData.get("otp") ?? ""));
    if (!otp.success) {
      return {
        status: "error",
        phone,
        sentAt,
        fieldErrors: { otp: otp.error.issues[0]?.message },
      };
    }
    if (!(await rateLimit("otpVerify", ip, `phone:${phone}`))) {
      return { status: "error", phone, sentAt, message: TOO_MANY_ATTEMPTS };
    }
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp.data,
      type: "sms",
    });
    if (!error) redirect("/account");
    return {
      status: "error",
      phone,
      sentAt,
      fieldErrors: {
        otp:
          error.code === "otp_expired"
            ? "That code is wrong or has expired. Check it, or send a new one."
            : GENERIC_ERROR,
      },
    };
  }

  const resend = sentAt ? { phone, sentAt } : {};
  if (!(await isAuthProviderEnabled("phone"))) {
    return {
      status: "error",
      message: "Phone sign-in isn't available yet. Please continue with email.",
    };
  }
  if (!(await rateLimit("otpSend", ip, `phone:${phone}`))) {
    return { status: "error", ...resend, message: TOO_MANY_ATTEMPTS };
  }
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    console.error("Sending sign-in OTP failed", error.code, error.message);
    return {
      status: "error",
      ...resend,
      message:
        error.code === "over_sms_send_rate_limit"
          ? "Too many codes sent. Please wait a minute and try again."
          : "Couldn't send the code. Check the number and try again.",
    };
  }
  return {
    status: "success",
    phone,
    sentAt: Date.now(),
    message: `We sent a 6-digit code to ${displayPhone(phone)}.`,
  };
}

/** Sends a reset link to the email typed in the form. */
export async function sendPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = credentialsSchema.shape.email.safeParse(email);
  if (!parsed.success) {
    return {
      status: "error",
      email,
      fieldErrors: { email: "Enter a valid email address." },
    };
  }
  if (
    !(await rateLimit(
      "passwordReset",
      `ip:${await clientIp()}`,
      `email:${parsed.data}`,
    ))
  ) {
    return { status: "error", email: parsed.data, message: TOO_MANY_ATTEMPTS };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteOrigin()}/auth/callback?next=/account/reset-password`,
  });
  if (error?.code === "over_email_send_rate_limit") {
    return {
      status: "error",
      email: parsed.data,
      message: "Too many attempts. Please wait a minute and try again.",
    };
  }
  // Same answer whether or not the account exists, so emails can't be probed.
  return {
    status: "success",
    email: parsed.data,
    message: `If an account exists for ${parsed.data}, a reset link is on its way.`,
  };
}

/** Sets a new password for the user signed in through a reset link. */
export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "same_password"
          ? "Choose a password different from your current one."
          : error.code === "weak_password"
            ? error.message
            : "Your reset link has expired. Request a new one.",
    };
  }
  redirect("/account");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/account");
}
