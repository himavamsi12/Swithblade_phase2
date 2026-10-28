"use client";

import { useId, useState, useTransition } from "react";
import { Field } from "@/features/account/components/profile-card";
import { inputClass } from "@/features/account/components/styles";
import { siteConfig } from "@/config/site";
import { cartActions } from "@/features/cart/store";
import type { CartLine } from "@/features/cart/types";
import { createCheckout, verifyPayment } from "../actions";
import type { DeliveryAddressInput } from "../address";

type AddressField = keyof DeliveryAddressInput;

const EMPTY_ADDRESS: Record<AddressField, string> = {
  email: "",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
};

/* Remembered in this browser only, so returning shoppers needn't retype it. */
const ADDRESS_KEY = "sb:delivery-address";

function loadAddress(): Record<AddressField, string> {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(ADDRESS_KEY) ?? "null",
    );
    if (saved && typeof saved === "object") {
      return { ...EMPTY_ADDRESS, ...(saved as Partial<typeof EMPTY_ADDRESS>) };
    }
  } catch {
    // Storage blocked or corrupt: start empty.
  }
  return EMPTY_ADDRESS;
}

function saveAddress(address: Record<AddressField, string>) {
  try {
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
  } catch {
    // Storage blocked: nothing to remember.
  }
}

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

/**
 * Delivery address plus "Proceed to Checkout": checks the address and PIN
 * code on the server, then opens Razorpay Checkout for the bag.
 */
export function CheckoutButton({
  lines,
  accountEmail,
  onPaid,
  onFailed,
  className,
}: {
  lines: CartLine[];
  /** The signed-in shopper's email, used when none is saved in this browser. */
  accountEmail: string | null;
  /** Runs once the payment is verified, before the bag is emptied. */
  onPaid: (orderNumber: string) => void;
  /** Runs when the payment window closes after a failed payment. */
  onFailed: () => void;
  className?: string;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // The bag (and this form) only renders in the browser, after the cart loads.
  const [address, setAddress] = useState(() => {
    const saved = loadAddress();
    return saved.email || !accountEmail
      ? saved
      : { ...saved, email: accountEmail };
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<AddressField, string>>
  >({});

  const fail = (message: string) => setError(message);

  function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    saveAddress(address);
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
        address,
      );
      if (session.status === "error") {
        if (session.repriced) cartActions.reprice(session.repriced);
        if (session.fieldErrors) setFieldErrors(session.fieldErrors);
        return fail(session.message);
      }

      try {
        await loadScript(session.magic ? SCRIPTS.magic : SCRIPTS.standard);
      } catch {
        return fail("Couldn't load the payment window. Please try again.");
      }
      if (!window.Razorpay) return fail("Payments are unavailable right now.");

      // Razorpay keeps its window open after a failure so the shopper can
      // retry there; only report it once they give up and close it.
      let failed = false;
      const razorpay = new window.Razorpay({
        key: session.keyId,
        order_id: session.orderId,
        amount: session.amount,
        currency: session.currency,
        name: siteConfig.name,
        prefill: session.prefill,
        one_click_checkout: session.magic,
        // No coupons yet; see /api/razorpay/promotions.
        show_coupons: false,
        modal: {
          ondismiss: () => {
            if (failed) onFailed();
          },
        },
        handler: (response: RazorpaySuccess) => {
          failed = false;
          startTransition(async () => {
            const result = await verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            if (result.status === "error") return fail(result.message);
            onPaid(result.orderNumber);
            cartActions.clear();
          });
        },
      });
      razorpay.on("payment.failed", () => {
        failed = true;
      });
      razorpay.open();
    });
  }

  const field = (
    name: AddressField,
    label: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <Field id={`${id}-${name}`} label={label} error={fieldErrors[name]}>
      <input
        id={`${id}-${name}`}
        name={name}
        placeholder={label}
        value={address[name]}
        onChange={(e) => setAddress((a) => ({ ...a, [name]: e.target.value }))}
        aria-invalid={fieldErrors[name] ? true : undefined}
        className={inputClass}
        {...extra}
      />
    </Field>
  );

  return (
    <form onSubmit={checkout} noValidate className="mt-4">
      <fieldset disabled={pending} className="flex flex-col gap-2">
        <legend className="mb-3 text-body-3 font-semibold tracking-[0.04em] uppercase">
          Delivery address
        </legend>
        {field("email", "Email", {
          type: "email",
          autoComplete: "email",
          inputMode: "email",
          required: true,
        })}
        {field("fullName", "Full name", {
          autoComplete: "name",
          required: true,
        })}
        {field("phone", "Mobile number", {
          autoComplete: "tel-national",
          inputMode: "tel",
          required: true,
        })}
        {field("addressLine1", "House / flat, street", {
          autoComplete: "address-line1",
          required: true,
        })}
        {field("addressLine2", "Area, landmark (optional)", {
          autoComplete: "address-line2",
        })}
        <div className="grid grid-cols-2 gap-2">
          {field("pincode", "PIN code", {
            autoComplete: "postal-code",
            inputMode: "numeric",
            maxLength: 6,
            required: true,
          })}
          {field("city", "City", {
            autoComplete: "address-level2",
            required: true,
          })}
        </div>
        {field("state", "State", {
          autoComplete: "address-level1",
          required: true,
        })}
      </fieldset>
      <button
        type="submit"
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
    </form>
  );
}
