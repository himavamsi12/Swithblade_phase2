"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AuthFormState } from "../schema";
import { fieldClass, focusRing } from "./styles";

/* Shared building blocks for the login, forgot and reset password forms. */

type FieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  /** Screen-reader label; the design shows placeholders only. */
  label: string;
  error?: string;
};

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={`${id}-error`} className="mt-2 text-body-3 text-red-600">
      {error}
    </p>
  ) : null;
}

export function TextField({
  id,
  label,
  error,
  className,
  ...props
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(fieldClass, className)}
        {...props}
      />
      <FieldError id={id} error={error} />
    </div>
  );
}

/** Password input with the eye toggle to show or hide what's typed. */
export function PasswordField({ id, label, error, ...props }: FieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(fieldClass, "pr-14")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={visible}
          className={cn(
            "absolute top-1/2 right-4 -translate-y-1/2 p-1 text-black",
            focusRing,
          )}
        >
          {visible ? (
            <Eye size={20} strokeWidth={1.5} aria-hidden />
          ) : (
            <EyeOff size={20} strokeWidth={1.5} aria-hidden />
          )}
        </button>
      </div>
      <FieldError id={id} error={error} />
    </div>
  );
}

export function PrimaryButton({
  pending,
  pendingLabel,
  children,
  className,
  ...props
}: Omit<ComponentProps<"button">, "type" | "disabled"> & {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      type="submit"
      disabled={pending}
      className={cn(
        "h-10 w-full bg-primary text-body-1 text-white transition-opacity hover:opacity-90 disabled:opacity-60",
        focusRing,
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Result line under a form: red for errors, black for confirmations. */
export function FormMessage({ state }: { state: AuthFormState }) {
  return (
    <p
      role="status"
      className={cn(
        "text-center text-body-3",
        state.message ? "mt-4" : "sr-only",
        state.status === "error" ? "text-red-600" : "text-black",
      )}
    >
      {state.message}
    </p>
  );
}
