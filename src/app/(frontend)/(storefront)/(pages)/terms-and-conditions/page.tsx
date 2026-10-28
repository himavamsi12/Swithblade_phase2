import type { Metadata } from "next";
import { TermsAndConditions } from "@/features/legal/documents/terms-and-conditions";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that govern your use of the Switchblade website and purchases made through it.",
};

export default function TermsAndConditionsPage() {
  return <TermsAndConditions />;
}
