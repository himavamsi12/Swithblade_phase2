"use client";

import { X } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { focusRing } from "./styles";

/**
 * A centred modal over the order history: title, a subtitle line and a close
 * button, then the content. A native modal <dialog>, so Escape, focus and the
 * backdrop come from the browser. Content mounts only while open, so each
 * opening starts fresh.
 */
export const AccountModal = forwardRef<
  HTMLDialogElement,
  {
    id: string;
    title: string;
    subtitle: string;
    open: boolean;
    onClose: () => void;
    children: ReactNode;
  }
>(function AccountModal({ id, title, subtitle, open, onClose, children }, ref) {
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      // Clicks on the backdrop land on the dialog itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[500px] scale-100 overflow-y-auto bg-white p-0 text-black opacity-100 shadow-xl transition-[opacity,scale] duration-200 outline-none backdrop:bg-black/45 motion-reduce:transition-none starting:scale-95 starting:opacity-0"
    >
      {open && (
        <div className="flex flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-stroke px-6 pt-7 pb-5 sm:px-7">
            <div>
              <h2 id={id} className="text-h4 font-bold uppercase">
                {title}
              </h2>
              <p className="mt-1 text-body-4 tracking-[0.04em] text-muted uppercase">
                {subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => e.currentTarget.closest("dialog")?.close()}
              aria-label="Close"
              className={cn(
                "p-1 transition-opacity hover:opacity-70",
                focusRing,
              )}
            >
              <X size={22} strokeWidth={1.5} aria-hidden />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
});

/**
 * Footer buttons: an outlined one and a filled one, side by side. It sticks to
 * the bottom of the dialog, so the buttons stay in reach on a phone while the
 * step above scrolls.
 */
export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="sticky bottom-0 grid grid-cols-[1fr_1.6fr] gap-3 border-t border-stroke bg-white px-6 py-4 sm:px-7 sm:py-5">
      {children}
    </footer>
  );
}

export const outlineButton = cn(
  "min-h-11 border border-black bg-white px-3 py-2 text-body-4 leading-tight font-semibold tracking-[0.04em] uppercase transition-colors hover:bg-black hover:text-white",
  focusRing,
);

export const fillButton = cn(
  "min-h-11 bg-primary px-3 py-2 text-body-4 leading-tight font-semibold tracking-[0.04em] text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-50",
  focusRing,
);
