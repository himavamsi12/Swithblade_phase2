import type { Metadata } from "next";
import { ReturnsPolicy } from "@/features/legal/documents/returns-policy";

export const metadata: Metadata = {
  title: "Returns & Refund Policy",
  description:
    "How returns, exchanges and refunds work for Switchblade orders.",
};

export default function ReturnsPolicyPage() {
  return <ReturnsPolicy />;
}
