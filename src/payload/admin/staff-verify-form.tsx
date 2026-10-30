"use client";

import { useEffect, useRef, useState } from "react";

/** Authenticator codes change every 30 seconds (payload-totp's default). */
const PERIOD_SECONDS = 30;

/**
 * Where to go once the code is accepted. `back` comes from the query string,
 * so only same-origin http(s) URLs inside the admin are followed (as in
 * payload-totp's getSafeBackURL); anything else lands on the dashboard.
 */
function safeBackURL(adminRoute: string, back: string | undefined) {
  const origin = window.location.origin;
  const adminRoot = new URL(adminRoute, origin).href;
  if (!back) return adminRoot;
  let url: URL;
  try {
    url = new URL(back, origin);
  } catch {
    return adminRoot;
  }
  if (
    url.origin !== origin ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    return adminRoot;
  }
  const adminPath = adminRoute.replace(/\/+$/, "") || "/";
  const insideAdmin =
    adminPath === "/" ||
    url.pathname === adminPath ||
    url.pathname.startsWith(`${adminPath}/`);
  return insideAdmin ? url.href : adminRoot;
}

function secondsLeft() {
  return PERIOD_SECONDS - (Math.floor(Date.now() / 1000) % PERIOD_SECONDS);
}

/**
 * One real input (so paste, phone autofill and backspace behave natively)
 * drawn as a row of digit boxes. Submits by itself once every digit is in.
 */
export function StaffVerifyForm({
  adminRoute,
  apiRoute,
  back,
  length,
}: {
  adminRoute: string;
  apiRoute: string;
  back: string | undefined;
  length: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(true);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(secondsLeft());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  async function verify(token: string) {
    if (status !== "idle") return;
    setStatus("pending");
    setError(null);
    try {
      const res = await fetch(`${apiRoute}/verify-totp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setError(
          res.status === 401
            ? "Your sign-in has expired. Sign out and sign in again."
            : data?.message || "That code didn't work. Try the next one.",
        );
        setCode("");
        setStatus("idle");
        input.current?.focus();
        return;
      }
      setStatus("done");
      // A full load, so the auth strategy runs again with the new session.
      window.location.replace(safeBackURL(adminRoute, back));
    } catch {
      setError("Couldn't reach the server. Check your connection and retry.");
      setStatus("idle");
    }
  }

  function onChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, length);
    setCode(digits);
    if (error && digits) setError(null);
    if (digits.length === length) void verify(digits);
  }

  const busy = status !== "idle";
  const expiring = left !== null && left <= 5;

  return (
    <form
      className="sb-verify__form"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === length) void verify(code);
      }}
    >
      <label htmlFor="sb-verify-code" className="sb-verify__sr-only">
        {length}-digit code
      </label>
      <div
        className="sb-verify__boxes"
        data-error={error ? "" : undefined}
        data-busy={busy ? "" : undefined}
      >
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            className="sb-verify__box"
            data-filled={code[i] ? "" : undefined}
            data-active={
              focused && !busy && i === Math.min(code.length, length - 1)
                ? ""
                : undefined
            }
          >
            {code[i] ?? ""}
          </span>
        ))}
        <input
          ref={input}
          id="sb-verify-code"
          name="token"
          className="sb-verify__input"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          autoFocus
          // Read-only, not disabled, so focus stays put for the next try.
          readOnly={busy}
          aria-invalid={error ? true : undefined}
          aria-describedby="sb-verify-status"
          data-1p-ignore
        />
      </div>

      <p
        id="sb-verify-status"
        className="sb-verify__status"
        data-error={error ? "" : undefined}
        role={error ? "alert" : "status"}
      >
        {error ??
          (status === "pending"
            ? "Checking code…"
            : status === "done"
              ? "Verified. Signing you in…"
              : "")}
      </p>

      <button
        type="submit"
        className="sb-verify__submit"
        disabled={busy || code.length !== length}
      >
        {status === "idle" ? "Verify" : "Verifying…"}
      </button>

      <p
        className="sb-verify__timer"
        data-expiring={expiring ? "" : undefined}
        aria-hidden
      >
        <span
          className="sb-verify__ring"
          style={
            {
              "--sb-progress": left === null ? 1 : left / PERIOD_SECONDS,
            } as React.CSSProperties
          }
        />
        {left === null
          ? "Codes refresh every 30 seconds"
          : expiring
            ? `Code changes in ${left}s. Wait for the next one`
            : `Code refreshes in ${left}s`}
      </p>
    </form>
  );
}
