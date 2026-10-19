import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { BackLink } from "@/features/auth/components/back-link";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getCurrentUser } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false },
};

/**
 * Reached from the reset email: the link signs the user in (see
 * /auth/callback), then they choose a new password here.
 */
export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AuthShell
        heading="Reset password"
        intro="This reset link has expired or was already used."
      >
        <Link
          href="/account/forgot-password"
          className="flex h-10 w-full items-center justify-center bg-primary text-body-1 text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Request a new link
        </Link>
        <BackLink />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      heading="Reset password"
      intro="Set a new password for your account. Make sure it’s strong and easy for you to remember."
    >
      <ResetPasswordForm />
      <BackLink />
    </AuthShell>
  );
}
