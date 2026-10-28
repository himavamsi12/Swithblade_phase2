import type { Metadata } from "next";
import { PrivacyPolicy } from "@/features/legal/documents/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Switchblade collects, uses, stores and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicy />;
}
