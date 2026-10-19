import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "@/features/account/components/account-shell";
import { OrderHistory } from "@/features/account/components/order-history";
import {
  getSignedInCustomer,
  listCustomerOrders,
} from "@/features/account/customer";

export const metadata: Metadata = {
  title: "Order History",
  robots: { index: false },
};

export default async function OrderHistoryPage() {
  const session = await getSignedInCustomer();
  if (!session) redirect("/account");

  const orders = await listCustomerOrders(session.customer.id);

  return (
    <AccountShell firstName={session.customer.firstName ?? null}>
      <h2 className="sr-only">Order history</h2>
      {orders.length === 0 ? (
        <div className="flex flex-col items-start gap-4 bg-card px-5 py-8">
          <p className="text-body-2 text-muted">
            You haven&apos;t placed any orders yet.
          </p>
          <Link
            href="/products"
            className="inline-flex h-10 items-center bg-primary px-7 text-body-3 tracking-[0.04em] text-white uppercase transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <OrderHistory orders={orders} />
      )}
    </AccountShell>
  );
}
