"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { inputClass } from "@/features/account/components/styles";
import { cartActions } from "@/features/cart/store";
import type { CartLine } from "@/features/cart/types";
import { cn } from "@/lib/utils";
import { previewCoupon } from "../actions";

export type AppliedCoupon = { code: string; discount: number };

const checkoutItems = (lines: CartLine[]) =>
  lines.map(({ slug, color, size, quantity, price, currency }) => ({
    slug,
    color,
    size,
    quantity,
    price,
    currency,
  }));

/**
 * "Coupon code" box in the order summary. Checks the code on the server and
 * reports the discount; checks it again whenever the bag changes, since a
 * minimum total or targeted product may no longer be met.
 */
export function CouponField({
  lines,
  applied,
  onChange,
  focusRing,
}: {
  lines: CartLine[];
  applied: AppliedCoupon | null;
  onChange: (coupon: AppliedCoupon | null) => void;
  focusRing: string;
}) {
  const id = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // State only changes once the server answers, so the bag-change effect
  // below can call it.
  function check(value: string) {
    startTransition(async () => {
      const result = await previewCoupon(checkoutItems(lines), value).catch(
        () => null,
      );
      if (!result) return setError("Couldn't check the coupon. Try again.");
      if (result.status === "error") {
        if (result.repriced) cartActions.reprice(result.repriced);
        onChange(null);
        return setError(result.message);
      }
      setError(null);
      onChange({ code: result.code, discount: result.discount });
      setCode("");
    });
  }

  // Re-check an applied coupon when the bag changes (not on first render).
  const bagKey = JSON.stringify(checkoutItems(lines));
  const lastBag = useRef(bagKey);
  useEffect(() => {
    if (lastBag.current === bagKey) return;
    lastBag.current = bagKey;
    if (applied) check(applied.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per bag change
  }, [bagKey]);

  if (applied) {
    return (
      <div className="mt-4 flex items-center justify-between border border-dashed border-stroke px-3 py-2 text-body-3">
        <span>
          Coupon <span className="font-semibold">{applied.code}</span> applied
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setError(null);
          }}
          aria-label={`Remove coupon ${applied.code}`}
          className={cn("transition-opacity hover:opacity-70", focusRing)}
        >
          <X size={16} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (code.trim()) check(code);
      }}
    >
      <label htmlFor={`${id}-coupon`} className="sr-only">
        Coupon code
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-coupon`}
          name="coupon"
          placeholder="Coupon code"
          autoComplete="off"
          autoCapitalize="characters"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-coupon-error` : undefined}
          disabled={pending}
          className={cn(inputClass, "flex-1 uppercase")}
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className={cn(
            "border border-primary px-4 text-body-3 uppercase transition-opacity hover:opacity-80 disabled:opacity-50",
            focusRing,
          )}
        >
          {pending ? "Checking…" : "Apply"}
        </button>
      </div>
      {error && (
        <p
          id={`${id}-coupon-error`}
          role="alert"
          className="mt-2 text-body-3 text-red-600"
        >
          {error}
        </p>
      )}
    </form>
  );
}
