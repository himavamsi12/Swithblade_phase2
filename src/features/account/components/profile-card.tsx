"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { updateProfile } from "../actions";
import {
  DEFAULT_PHONE_COUNTRY,
  formatPhone,
  parsePhone,
  phoneCountries,
} from "../phone";
import { idle } from "../schema";
import {
  boxClass,
  focusRing,
  inputClass,
  primaryButton,
  secondaryButton,
} from "./styles";

export type Profile = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

const initials = (p: Profile) =>
  ((p.firstName?.[0] ?? "") + (p.lastName?.[0] ?? "")).toUpperCase() ||
  p.email[0]!.toUpperCase();

/** Name, email and phone, shown read-only with an in-place "Edit profile". */
export function ProfileCard({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false);
  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <section aria-labelledby="profile-heading">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-stroke text-body-1 font-semibold text-dark-grey"
        >
          {initials(profile)}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="profile-heading"
            className="truncate text-body-1 font-semibold"
          >
            {fullName || "Your profile"}
          </h2>
          <p className="truncate text-body-3 text-muted">{profile.email}</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
              "shrink-0 text-body-4 font-semibold uppercase underline underline-offset-2",
              focusRing,
            )}
          >
            Edit profile
          </button>
        )}
      </div>

      {editing ? (
        <ProfileForm profile={profile} onDone={() => setEditing(false)} />
      ) : (
        <dl className="mt-7 grid gap-2 sm:grid-cols-2">
          {[
            ["First name", profile.firstName],
            ["Last name", profile.lastName],
            ["Email", profile.email],
          ].map(([label, value]) => (
            <div key={label} className={boxClass}>
              <dt className="sr-only">{label}</dt>
              <dd className={cn("truncate", !value && "text-muted")}>
                {value || `Add ${label!.toLowerCase()}`}
              </dd>
            </div>
          ))}
          <div className={boxClass}>
            <dt className="sr-only">Phone</dt>
            <dd className={cn("truncate", !profile.phone && "text-muted")}>
              {profile.phone ? (
                <>
                  <span aria-hidden className="mr-3">
                    {parsePhone(profile.phone).country?.flag}
                  </span>
                  {formatPhone(profile.phone)}
                </>
              ) : (
                "Add phone number"
              )}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function ProfileForm({
  profile,
  onDone,
}: {
  profile: Profile;
  onDone: () => void;
}) {
  const id = useId();
  const [state, action, pending] = useActionState(updateProfile, idle);
  const phone = parsePhone(profile.phone);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  return (
    <form action={action} noValidate className="mt-7 flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field id={`${id}-first`} label="First name" error={errors.firstName}>
          <input
            id={`${id}-first`}
            name="firstName"
            autoComplete="given-name"
            defaultValue={profile.firstName ?? ""}
            placeholder="First name"
            required
            aria-invalid={errors.firstName ? true : undefined}
            className={inputClass}
          />
        </Field>
        <Field id={`${id}-last`} label="Last name" error={errors.lastName}>
          <input
            id={`${id}-last`}
            name="lastName"
            autoComplete="family-name"
            defaultValue={profile.lastName ?? ""}
            placeholder="Last name"
            className={inputClass}
          />
        </Field>
        <Field id={`${id}-email`} label="Email (used to sign in)">
          <input
            id={`${id}-email`}
            value={profile.email}
            disabled
            readOnly
            className={inputClass}
          />
        </Field>
        <Field id={`${id}-phone`} label="Phone" error={errors.phone}>
          <div className="flex gap-2">
            <select
              name="phoneCountry"
              aria-label="Country code"
              defaultValue={phone.country?.code ?? DEFAULT_PHONE_COUNTRY}
              className={cn(inputClass, "w-[104px] shrink-0 px-3")}
            >
              {phoneCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} +{c.dial}
                </option>
              ))}
            </select>
            <input
              id={`${id}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              defaultValue={phone.national}
              placeholder="Phone number"
              aria-invalid={errors.phone ? true : undefined}
              className={inputClass}
            />
          </div>
        </Field>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className={secondaryButton}>
          Cancel
        </button>
        {state.message && (
          <p role="status" className="text-body-3 text-red-600">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

export function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-body-3 text-red-600">{error}</p>}
    </div>
  );
}
