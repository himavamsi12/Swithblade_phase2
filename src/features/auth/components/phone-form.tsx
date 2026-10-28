"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { continueWithPhone } from "../actions";
import { initialAuthState } from "../schema";
import { FormMessage, PrimaryButton, TextField } from "./form-fields";
import { focusRing } from "./styles";

/** Seconds before "Resend code" is offered again. */
const RESEND_AFTER = 30;

const linkButton = cn(
  "text-body-3 underline underline-offset-2 disabled:text-muted disabled:no-underline",
  focusRing,
);

/**
 * Phone sign-in: enter a mobile number, then the 6-digit code texted to it.
 * Creates the account on first sign-in.
 */
export function PhoneForm({ onUseEmail }: { onUseEmail: () => void }) {
  // Remounting the step resets the action state when changing the number.
  const [attempt, setAttempt] = useState(0);
  return (
    <PhoneSteps
      key={attempt}
      onChangeNumber={() => setAttempt((n) => n + 1)}
      onUseEmail={onUseEmail}
    />
  );
}

function PhoneSteps({
  onChangeNumber,
  onUseEmail,
}: {
  onChangeNumber: () => void;
  onUseEmail: () => void;
}) {
  const id = useId();
  const [state, action, pending] = useActionState(
    continueWithPhone,
    initialAuthState,
  );
  const sentTo = state.phone;

  if (!sentTo) {
    return (
      <form action={action} noValidate className="flex flex-col gap-2">
        <input type="hidden" name="step" value="send" />
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute top-[28px] left-5 -translate-y-1/2 text-body-1 text-black"
          >
            +91
          </span>
          <TextField
            id={`${id}-phone`}
            label="Mobile number"
            name="phone"
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            maxLength={14}
            required
            autoFocus
            placeholder="Enter your mobile number"
            error={state.fieldErrors?.phone}
            className="pl-16"
          />
        </div>
        <PrimaryButton
          pending={pending}
          pendingLabel="Sending code…"
          className="mt-5"
        >
          Send code
        </PrimaryButton>
        <FormMessage state={state} />
        <button
          type="button"
          onClick={onUseEmail}
          className={cn(linkButton, "mt-4 self-center")}
        >
          Use email instead
        </button>
      </form>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-2">
      <input type="hidden" name="phone" value={sentTo} />
      <input type="hidden" name="sentAt" value={state.sentAt ?? ""} />
      <TextField
        id={`${id}-otp`}
        label="6-digit code"
        name="otp"
        type="text"
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus
        placeholder="Enter the 6-digit code"
        error={state.fieldErrors?.otp}
        className="tracking-[0.3em]"
      />
      {/* First submit button, so Enter verifies. */}
      <PrimaryButton
        name="step"
        value="verify"
        pending={pending}
        pendingLabel="Verifying…"
        className="mt-5"
      >
        Verify and continue
      </PrimaryButton>
      <FormMessage state={state} />
      <div className="mt-4 flex items-center justify-between gap-4">
        <button type="button" onClick={onChangeNumber} className={linkButton}>
          Change number
        </button>
        {/* Remounts, restarting the countdown, after each new code. */}
        <ResendButton key={state.sentAt} pending={pending} />
      </div>
    </form>
  );
}

/** "Resend code", enabled after a short countdown from each send. */
function ResendButton({ pending }: { pending: boolean }) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_AFTER);

  useEffect(() => {
    const timer = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <button
      type="submit"
      name="step"
      value="send"
      formNoValidate
      disabled={pending || secondsLeft > 0}
      className={linkButton}
    >
      {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
    </button>
  );
}
