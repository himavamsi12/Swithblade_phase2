"use client";

import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useActionState,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { supportedCountries } from "@/payload/countries";
import { cn } from "@/lib/utils";
import { deleteAddress, saveAddress } from "../actions";
import { DEFAULT_PHONE_COUNTRY, formatPhone } from "../phone";
import { addressTypes, idle } from "../schema";
import { Field } from "./profile-card";
import {
  focusRing,
  inputClass,
  primaryButton,
  secondaryButton,
} from "./styles";
import { PendingLabel, Spinner } from "@/components/ui/spinner";

export type SavedAddress = {
  id: number;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
};

const countryName = (code: string) =>
  supportedCountries.find((c) => c.value === code)?.label ?? code;

/** Saved addresses with edit/delete, plus the add-address form. */
export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  // "new" = adding, a number = editing that address, null = just the list.
  const [editing, setEditing] = useState<"new" | number | null>(null);

  return (
    <section aria-labelledby="address-book" className="mt-10">
      <h2
        id="address-book"
        className="text-body-3 font-semibold tracking-[0.04em] uppercase"
      >
        Address book
      </h2>

      <ul className="mt-4 flex flex-col gap-3">
        {addresses.map((address) =>
          editing === address.id ? (
            <li key={address.id}>
              <AddressForm address={address} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={address.id}>
              <AddressCard
                address={address}
                onEdit={() => setEditing(address.id)}
              />
            </li>
          ),
        )}
      </ul>

      {editing === "new" ? (
        <div className={cn(addresses.length > 0 && "mt-3")}>
          <AddressForm onDone={() => setEditing(null)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className={cn(
            "flex h-[75px] w-[150px] flex-col items-center justify-center gap-2 bg-card text-dark-grey transition-colors hover:text-black",
            addresses.length > 0 && "mt-3",
            focusRing,
          )}
        >
          <Plus size={16} strokeWidth={1.5} aria-hidden />
          <span className="text-body-4 font-semibold uppercase">
            Add address
          </span>
        </button>
      )}
    </section>
  );
}

function AddressCard({
  address,
  onEdit,
}: {
  address: SavedAddress;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const name = [address.firstName, address.lastName].filter(Boolean).join(" ");
  const lines = [
    [address.addressLine1, address.addressLine2].filter(Boolean).join(", "),
    [address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(", "),
    countryName(address.country),
  ].filter(Boolean);

  return (
    <article
      aria-label={`${address.title ?? "Address"}: ${name}`}
      className={cn("relative bg-card px-5 py-5", pending && "opacity-60")}
    >
      <p className="pr-16 text-body-3 font-semibold">
        {name}
        {address.title && (
          <span className="ml-2 border border-stroke bg-white px-1.5 py-0.5 text-body-4 font-normal text-muted uppercase">
            {address.title}
          </span>
        )}
      </p>
      <address className="mt-2 flex flex-col gap-1.5 text-body-3 text-muted not-italic">
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
        {address.phone && (
          <span>{formatPhone(address.phone) || address.phone}</span>
        )}
      </address>
      {error && <p className="mt-2 text-body-3 text-red-600">{error}</p>}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit address for ${name}`}
          className={cn("text-black hover:opacity-60", focusRing)}
        >
          <Pencil size={17} strokeWidth={1.5} aria-hidden />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteAddress(address.id);
              setError(
                result.status === "error" ? (result.message ?? null) : null,
              );
            })
          }
          aria-label={`Delete address for ${name}`}
          className={cn("text-red-600 hover:opacity-60", focusRing)}
        >
          {pending ? (
            <Spinner size={17} />
          ) : (
            <Trash2 size={17} strokeWidth={1.5} aria-hidden />
          )}
        </button>
      </div>
    </article>
  );
}

function AddressForm({
  address,
  onDone,
}: {
  address?: SavedAddress;
  onDone: () => void;
}) {
  const id = useId();
  const [state, action, pending] = useActionState(saveAddress, idle);
  const [country, setCountry] = useState(
    address?.country ?? DEFAULT_PHONE_COUNTRY,
  );
  const errors = state.fieldErrors ?? {};
  const fullName = [address?.firstName, address?.lastName]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  const text = (
    name: string,
    placeholder: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
    className?: string,
  ) => (
    <Field
      id={`${id}-${name}`}
      label={placeholder}
      error={errors[name]}
      className={className}
    >
      <input
        id={`${id}-${name}`}
        name={name}
        placeholder={placeholder}
        aria-invalid={errors[name] ? true : undefined}
        className={inputClass}
        {...extra}
      />
    </Field>
  );

  const select = (
    name: string,
    label: string,
    children: React.ReactNode,
    props: React.SelectHTMLAttributes<HTMLSelectElement>,
  ) => (
    <Field id={`${id}-${name}`} label={label} error={errors[name]}>
      <div className="relative">
        <select
          id={`${id}-${name}`}
          name={name}
          className={cn(inputClass, "appearance-none pr-12")}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={18}
          strokeWidth={1.5}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2"
        />
      </div>
    </Field>
  );

  return (
    <form
      action={action}
      noValidate
      aria-label={address ? "Edit address" : "Add address"}
      className="flex flex-col gap-2"
    >
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="grid gap-2 sm:grid-cols-2">
        {text("fullName", "Full Name", {
          autoComplete: "name",
          defaultValue: fullName,
          required: true,
        })}
        {text("phone", "Phone", {
          type: "tel",
          inputMode: "tel",
          autoComplete: "tel",
          defaultValue: address?.phone ?? "",
        })}
      </div>
      {text("addressLine1", "Address Line 1", {
        autoComplete: "address-line1",
        defaultValue: address?.addressLine1 ?? "",
        required: true,
      })}
      {text("addressLine2", "Address Line 2 (optional)", {
        autoComplete: "address-line2",
        defaultValue: address?.addressLine2 ?? "",
      })}
      <div className="grid gap-2 sm:grid-cols-3">
        {text("city", "City", {
          autoComplete: "address-level2",
          defaultValue: address?.city ?? "",
          required: true,
        })}
        {text("state", "State", {
          autoComplete: "address-level1",
          defaultValue: address?.state ?? "",
        })}
        {text("postalCode", country === "IN" ? "PIN Code" : "Postal Code", {
          autoComplete: "postal-code",
          defaultValue: address?.postalCode ?? "",
          required: true,
        })}
      </div>
      {select(
        "country",
        "Country",
        supportedCountries.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        )),
        {
          value: country,
          onChange: (e) => setCountry(e.target.value),
          autoComplete: "country",
        },
      )}
      {select(
        "title",
        "Address type",
        addressTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        )),
        { defaultValue: address?.title ?? "Home" },
      )}

      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? <PendingLabel>Saving…</PendingLabel> : "Save address"}
        </button>
        <button type="button" onClick={onDone} className={secondaryButton}>
          Cancel
        </button>
        {state.message && state.status === "error" && (
          <p role="status" className="text-body-3 text-red-600">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
