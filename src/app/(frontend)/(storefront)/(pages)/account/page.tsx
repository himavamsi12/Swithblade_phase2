import type { Metadata } from "next";
import { AccountShell } from "@/features/account/components/account-shell";
import { AddressBook } from "@/features/account/components/address-book";
import { ProfileCard } from "@/features/account/components/profile-card";
import {
  getSignedInCustomer,
  listCustomerAddresses,
} from "@/features/account/customer";
import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { getCurrentUser } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

export default async function AccountPage({
  searchParams,
}: PageProps<"/account">) {
  const [user, { error }] = await Promise.all([getCurrentUser(), searchParams]);

  if (user) {
    const session = await getSignedInCustomer();
    if (session) {
      const { customer } = session;
      const addresses = await listCustomerAddresses(customer.id);
      return (
        <AccountShell firstName={customer.firstName ?? null}>
          <ProfileCard
            profile={{
              email: customer.email,
              firstName: customer.firstName ?? null,
              lastName: customer.lastName ?? null,
              phone: customer.phone ?? null,
            }}
          />
          <AddressBook
            addresses={addresses.map((a) => ({
              id: a.id,
              title: a.title ?? null,
              firstName: a.firstName ?? null,
              lastName: a.lastName ?? null,
              addressLine1: a.addressLine1 ?? null,
              addressLine2: a.addressLine2 ?? null,
              city: a.city ?? null,
              state: a.state ?? null,
              postalCode: a.postalCode ?? null,
              country: a.country,
              phone: a.phone ?? null,
            }))}
          />
        </AccountShell>
      );
    }
  }

  return (
    <AuthShell
      heading="Welcome!"
      intro={
        <>
          Sign In Or Create An Account In Seconds
          <br />
          Use Your Google Account To Continue
        </>
      }
    >
      {error === "link" && (
        <p role="alert" className="mb-4 text-center text-body-3 text-red-600">
          That link is invalid or has expired. Please try again.
        </p>
      )}
      <AuthForm />
    </AuthShell>
  );
}
