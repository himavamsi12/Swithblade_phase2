import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { BackLink } from "@/features/auth/components/back-link";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      heading="Forgot your password?"
      intro="Please Enter The E-Mail Address You Use To Log In, And We’ll Send You A Link To Reset Your Password."
    >
      <ForgotPasswordForm />
      <BackLink />
    </AuthShell>
  );
}
