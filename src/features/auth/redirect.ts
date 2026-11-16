const BASE = "https://same-site.invalid";

/**
 * Only same-site paths are allowed as a post-auth destination, so a crafted
 * `?next=https://evil.example` link can't bounce users off-site. Browsers
 * strip tabs and newlines from URLs (`/\t/evil.example` becomes
 * `//evil.example`), so control characters are rejected outright and the
 * result is parsed to confirm it stays on this origin.
 */
export function safeNextPath(next: string | null, fallback = "/account") {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(next)
  ) {
    return fallback;
  }
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
