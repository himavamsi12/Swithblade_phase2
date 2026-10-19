"use client";

import { useActionState, useId } from "react";
import { updatePassword } from "../actions";
import { initialAuthState } from "../schema";
import { FormMessage, PasswordField, PrimaryButton } from "./form-fields";

export function ResetPasswordForm() {
  const id = useId();
  const [state, action, pending] = useActionState(
    updatePassword,
    initialAuthState,
  );

  return (
    <form action={action} noValidate className="flex flex-col gap-2">
      <PasswordField
        id={`${id}-password`}
        label="New password"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="New password"
        error={state.fieldErrors?.password}
      />
      <PasswordField
        id={`${id}-confirm`}
        label="Confirm password"
        name="confirm"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="Confirm password"
        error={state.fieldErrors?.confirm}
      />
      <PrimaryButton pending={pending} pendingLabel="Saving…" className="mt-6">
        Confirm
      </PrimaryButton>
      <FormMessage state={state} />
    </form>
  );
}
