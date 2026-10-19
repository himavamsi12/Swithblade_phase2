"use client";

import { useActionState, useId } from "react";
import { sendPasswordReset } from "../actions";
import { initialAuthState } from "../schema";
import { FormMessage, PrimaryButton, TextField } from "./form-fields";

export function ForgotPasswordForm() {
  const id = useId();
  const [state, action, pending] = useActionState(
    sendPasswordReset,
    initialAuthState,
  );

  return (
    <form action={action} noValidate className="flex flex-col">
      <TextField
        id={`${id}-email`}
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="Enter your email"
        defaultValue={state.email}
        error={state.fieldErrors?.email}
      />
      <PrimaryButton pending={pending} pendingLabel="Sending…" className="mt-8">
        Reset Password
      </PrimaryButton>
      <FormMessage state={state} />
    </form>
  );
}
