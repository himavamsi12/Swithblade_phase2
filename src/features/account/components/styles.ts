export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Grey field used for both read-only values and inputs on the account pages. */
export const boxClass =
  "flex h-14 w-full items-center bg-card px-5 text-body-2 text-black";

export const inputClass = `${boxClass} placeholder:text-dark-grey/60 focus:outline-2 focus:-outline-offset-2 focus:outline-black aria-invalid:outline-2 aria-invalid:-outline-offset-2 aria-invalid:outline-red-600 disabled:text-muted`;

export const primaryButton = `h-10 bg-primary px-7 text-body-3 tracking-[0.04em] text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-60 ${focusRing}`;

export const secondaryButton = `h-10 border border-stroke bg-white px-6 text-body-3 tracking-[0.04em] text-black uppercase transition-colors hover:border-black ${focusRing}`;
