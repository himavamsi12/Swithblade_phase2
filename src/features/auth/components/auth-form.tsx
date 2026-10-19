"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useId } from "react";
import google from "@/assets/icons/brands/google.svg";
import { cn } from "@/lib/utils";
import { continueWithEmail, continueWithGoogle } from "../actions";
import { initialAuthState } from "../schema";
import {
  FormMessage,
  PasswordField,
  PrimaryButton,
  TextField,
} from "./form-fields";
import { focusRing } from "./styles";

/**
 * Login or create account in one step: email + password, or Google. Works
 * without JavaScript (plain form posts to a server action); with it, errors
 * show inline and the buttons show progress.
 */
export function AuthForm() {
  const id = useId();
  const [state, emailAction, emailPending] = useActionState(
    continueWithEmail,
    initialAuthState,
  );
  const [googleState, googleAction, googlePending] = useActionState(
    continueWithGoogle,
    initialAuthState,
  );

  return (
    <div className="flex flex-col">
      <form action={emailAction} noValidate className="flex flex-col gap-2">
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
        <PasswordField
          id={`${id}-password`}
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          minLength={8}
          placeholder="Enter your password"
          error={state.fieldErrors?.password}
        />
        <Link
          href="/account/forgot-password"
          className={cn(
            "mt-2 self-start text-body-3 underline underline-offset-2",
            focusRing,
          )}
        >
          Forgot Password?
        </Link>
        <PrimaryButton
          pending={emailPending}
          pendingLabel="Please wait…"
          className="mt-5"
        >
          Continue
        </PrimaryButton>
        <FormMessage state={state} />
      </form>

      <p className="my-5 text-center text-body-1 text-muted">Or</p>

      <form action={googleAction}>
        <button
          type="submit"
          disabled={googlePending}
          className={cn(
            "flex h-[50px] w-full items-center justify-center gap-3 border border-stroke bg-white text-[18px] text-black transition-colors hover:bg-card disabled:opacity-60",
            focusRing,
          )}
        >
          <Image src={google} alt="" width={24} height={24} />
          {googlePending ? "Connecting…" : "Continue with Google"}
        </button>
        <FormMessage state={googleState} />
      </form>
    </div>
  );
}
