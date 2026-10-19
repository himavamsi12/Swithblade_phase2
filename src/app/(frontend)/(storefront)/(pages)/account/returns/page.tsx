import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/features/account/components/account-shell";
import { HistoryList } from "@/features/account/components/history-list";
import {
  getSignedInCustomer,
  listCustomerReturns,
} from "@/features/account/customer";

export const metadata: Metadata = {
  title: "Return History",
  robots: { index: false },
};

export default async function ReturnHistoryPage() {
  const session = await getSignedInCustomer();
  if (!session) redirect("/account");

  const returns = await listCustomerReturns(session.customer.id);

  return (
    <AccountShell firstName={session.customer.firstName ?? null}>
      <HistoryList
        heading="Return history"
        empty="You haven't returned anything."
        rows={returns.map((r) => {
          const order = typeof r.order === "object" ? r.order : null;
          return {
            id: r.id,
            title: order?.title
              ? `Return for ${order.title}`
              : `Return ${r.id}`,
            date: r.createdAt,
            status: r.status,
            amount: r.refundAmount ?? null,
            currency: r.currency ?? null,
            detail: `${r.items?.length ?? 0} ${r.items?.length === 1 ? "item" : "items"}`,
          };
        })}
      />
    </AccountShell>
  );
}
