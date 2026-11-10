"use client";

import type { ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { signOut } from "../actions";

/** Asks before signing the shopper out; `trigger` is the Sign out control. */
export function SignOutConfirm({
  trigger,
}: {
  trigger: (open: () => void) => ReactNode;
}) {
  return (
    <ConfirmDialog
      title="Sign out?"
      message="You'll need to sign in again to see your orders, addresses and saved bag."
      confirmLabel="Sign out"
      pendingLabel="Signing out…"
      action={signOut}
      trigger={trigger}
    />
  );
}
