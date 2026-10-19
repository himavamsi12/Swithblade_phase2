"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAuthProviderEnabled } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  credentialsSchema,
  newPasswordSchema,
  type AuthFormState,
} from "./schema";

/*
 * Supabase Auth server actions for the /account pages. Everything runs on the
 * server; the browser only ever sees the session cookies.
 */

const GENERIC_ERROR = "Something went wrong. Please try again.";

/** Absolute URL of this site, for links in auth emails and OAuth redirects. */
async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL!;
}

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
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/account`,
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
      redirectTo: `${await siteOrigin()}/auth/callback?next=/account`,
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/account/reset-password`,
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
