import type { ReactNode } from "react";
import { AccountNav } from "./account-nav";

/** "Hello {name}" heading with the account tabs beside the page content. */
export function AccountShell({
  firstName,
  children,
}: {
  firstName: string | null;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-480 px-4 pb-32 md:px-12 md:pb-[240px]">
      <h1 className="sr-only">Account{firstName ? ` for ${firstName}` : ""}</h1>
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 md:mt-12 lg:grid-cols-[170px_minmax(0,770px)] lg:gap-x-20">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
