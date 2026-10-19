"use client";

import { useState, useTransition } from "react";
import { siteConfig } from "@/config/site";
import { cartActions } from "@/features/cart/store";
import type { CartLine } from "@/features/cart/types";
import { createCheckout, verifyPayment } from "../actions";

/* Razorpay's hosted checkout scripts. Magic Checkout is a superset for INR. */
const SCRIPTS = {
  magic: "https://checkout.razorpay.com/v1/magic-checkout.js",
  standard: "https://checkout.razorpay.com/v1/checkout.js",
} as const;

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", cb: () => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const loaded = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  let promise = loaded.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loaded.delete(src);
        script.remove();
        reject(new Error(`Failed to load ${src}`));
      };
      document.body.appendChild(script);
    });
    loaded.set(src, promise);
  }
  return promise;
}

/** "Proceed to Checkout": opens Razorpay (Magic) Checkout for the bag. */
export function CheckoutButton({
  lines,
  onPaid,
  className,
}: {
  lines: CartLine[];
  /** Runs once the payment is verified, before the bag is emptied. */
  onPaid: () => void;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fail = (message: string) => setError(message);

  function checkout() {
    setError(null);
    startTransition(async () => {
      const session = await createCheckout(
        lines.map(({ slug, color, size, quantity, price, currency }) => ({
          slug,
          color,
          size,
          quantity,
          price,
          currency,
        })),
      );
      if (session.status === "error") {
        if (session.repriced) cartActions.reprice(session.repriced);
        return fail(session.message);
      }

      try {
        await loadScript(session.magic ? SCRIPTS.magic : SCRIPTS.standard);
      } catch {
        return fail("Couldn't load the payment window. Please try again.");
      }
      if (!window.Razorpay) return fail("Payments are unavailable right now.");

      const razorpay = new window.Razorpay({
        key: session.keyId,
        order_id: session.orderId,
        amount: session.amount,
        currency: session.currency,
        name: siteConfig.name,
        one_click_checkout: session.magic,
        show_coupons: session.magic,
        handler: (response: RazorpaySuccess) => {
          startTransition(async () => {
            const result = await verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            if (result.status === "error") return fail(result.message);
            onPaid();
            cartActions.clear();
          });
        },
      });
      razorpay.on("payment.failed", () =>
        fail("Payment failed. You have not been charged; please try again."),
      );
      razorpay.open();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={checkout}
        disabled={pending}
        aria-busy={pending}
        className={className}
      >
        {pending ? "Opening checkout…" : "Proceed to Checkout"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-body-3 text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
