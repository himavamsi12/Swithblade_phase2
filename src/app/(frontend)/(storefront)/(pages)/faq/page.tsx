import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { FaqView } from "@/features/faq/components/faq-view";

const intro =
  "Find answers to common questions regarding our collections, shipping, and return policies. For specialized inquiries, connect with our concierge team.";

export const metadata: Metadata = {
  title: "FAQ",
  description: intro,
};

export default function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-480 px-4 pb-24 md:px-12 md:pb-40">
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 text-body-3 hover:underline md:mt-11"
      >
        <ArrowLeft size={14} aria-hidden />
        Home / FAQ
      </Link>

      <div className="mt-10 grid gap-10 md:mt-14 lg:grid-cols-[minmax(0,800px)_minmax(0,420px)] lg:justify-between">
        <div className="min-w-0">
          <h1 className="border-b border-stroke pb-4 text-h3 uppercase">FAQ</h1>
          <p className="mt-8 max-w-[680px] text-body-2">{intro}</p>
          <FaqView />
        </div>

        <aside className="self-start bg-card p-6 lg:mt-[60px] lg:p-6">
          <h2 className="text-body-2 font-semibold uppercase">
            Need more help?
          </h2>
          <p className="mt-3 text-body-2">
            We&apos;re here to help. We hope we can answer your questions below
            but if not, please feel free to reach out to us at{" "}
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="text-primary underline underline-offset-2"
            >
              {siteConfig.supportEmail}
            </a>
          </p>
        </aside>
      </div>
    </div>
  );
}
