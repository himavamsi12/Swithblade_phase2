import Link from "next/link";
import type { ReactNode } from "react";
import { formatPrice } from "@/lib/format";

export type HistoryRow = {
  id: number;
  title: string;
  date: string;
  status: string;
  amount: number | null;
  currency: string | null;
  detail?: string;
};

const humanize = (v: string) =>
  v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");

/** Order or return history: one card per row, newest first, or an empty state. */
export function HistoryList({
  heading,
  rows,
  empty,
}: {
  heading: string;
  rows: HistoryRow[];
  empty: ReactNode;
}) {
  return (
    <section aria-labelledby="history-heading">
      <h2
        id="history-heading"
        className="text-body-3 font-semibold tracking-[0.04em] uppercase"
      >
        {heading}
      </h2>
      {rows.length === 0 ? (
        <div className="mt-4 flex flex-col items-start gap-4 bg-card px-5 py-8">
          <p className="text-body-2 text-muted">{empty}</p>
          <Link
            href="/products"
            className="inline-flex h-10 items-center bg-primary px-7 text-body-3 tracking-[0.04em] text-white uppercase transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-2 gap-x-6 gap-y-2 bg-card px-5 py-4 text-body-3 sm:grid-cols-4 sm:items-center"
            >
              <span className="font-semibold">{row.title}</span>
              <time dateTime={row.date} className="text-muted">
                {new Date(row.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>
              <span>{humanize(row.status)}</span>
              <span className="sm:text-right">
                {row.amount != null && row.currency
                  ? formatPrice(row.amount, row.currency)
                  : "—"}
              </span>
              {row.detail && (
                <span className="col-span-full text-muted">{row.detail}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
