"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { PendingLabel } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const button =
  "h-10 flex-1 px-6 text-body-3 tracking-[0.04em] uppercase transition-opacity hover:opacity-90 disabled:opacity-60";

type ConfirmDialogProps = {
  /** The control that asks; call `open` to show the question. */
  trigger: (open: () => void) => ReactNode;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  /** Shown on the confirm button while a form action runs. */
  pendingLabel?: string;
  /** Runs when the shopper confirms. */
  onConfirm?: () => void;
  /** Or: a server action submitted when the shopper confirms. */
  action?: (formData: FormData) => void | Promise<void>;
};

/**
 * "Are you sure?" pop-up before something that can't be undone, like
 * deleting an address or signing out. A native modal <dialog>, so Escape,
 * focus and the backdrop come from the browser.
 */
export function ConfirmDialog({
  trigger,
  title,
  message,
  confirmLabel,
  pendingLabel,
  onConfirm,
  action,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const close = () => dialog.current?.close();
  // Shown from state, so the trigger never touches the <dialog> itself.
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
  }, [open]);

  return (
    <>
      {trigger(() => setOpen(true))}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-[400px] bg-white p-0 text-left text-black shadow-xl outline-none backdrop:bg-black/45"
      >
        {open && (
          <div className="px-6 pt-7 pb-6">
            <h2 id={titleId} className="text-h6 tracking-[0.04em] uppercase">
              {title}
            </h2>
            <div className="mt-2 text-body-2 tracking-normal text-dark-grey normal-case">
              {message}
            </div>
            <form
              action={action}
              onSubmit={(e) => {
                if (action) return;
                e.preventDefault();
                onConfirm?.();
                close();
              }}
              className="mt-6 flex gap-3"
            >
              <button
                type="button"
                onClick={close}
                // Focus starts on the safe choice.
                autoFocus
                className={cn(
                  button,
                  "border border-stroke bg-white text-black hover:border-black",
                  focusRing,
                )}
              >
                Cancel
              </button>
              <ConfirmButton label={confirmLabel} pendingLabel={pendingLabel} />
            </form>
          </div>
        )}
      </dialog>
    </>
  );
}

function ConfirmButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(button, "bg-red-600 text-white", focusRing)}
    >
      {pending && pendingLabel ? (
        <PendingLabel>{pendingLabel}</PendingLabel>
      ) : (
        label
      )}
    </button>
  );
}
