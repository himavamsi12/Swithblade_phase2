/**
 * Only same-site paths are allowed as a post-auth destination, so a crafted
 * `?next=https://evil.example` link can't bounce users off-site.
 */
export function safeNextPath(next: string | null, fallback = "/account") {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return fallback;
  }
  return next;
}
