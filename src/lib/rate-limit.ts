import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { headers } from "next/headers";
import { redis, REDIS_PREFIX } from "./redis";

type Duration = Parameters<typeof Ratelimit.slidingWindow>[1];

/** Requests allowed per window, by what is being limited. */
const LIMITS = {
  /** Sign-in/sign-up attempts: slows password guessing. */
  signIn: [10, "10 m"],
  /** Reset emails: stops the form being used to spam inboxes. */
  passwordReset: [3, "15 m"],
  /** Razorpay orders: each one is an API call and a serviceability check. */
  checkout: [15, "10 m"],
} as const satisfies Record<string, readonly [number, Duration]>;

export type RateLimitName = keyof typeof LIMITS;

const limiters = new Map<RateLimitName, Ratelimit>();

function limiter(name: RateLimitName) {
  if (!redis) return null;
  let rl = limiters.get(name);
  if (!rl) {
    const [tokens, window] = LIMITS[name];
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `${REDIS_PREFIX}:rl:${name}`,
      // A slow Redis lets the request through rather than holding it up.
      timeout: 1_000,
    });
    limiters.set(name, rl);
  }
  return rl;
}

/** The caller's IP, as set by Vercel's (or another trusted) proxy. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Counts one request against each identifier (e.g. the IP and the email) and
 * returns false once any of them is over the limit. Always true while Redis
 * isn't configured or is unreachable, so an outage never blocks shoppers.
 */
export async function rateLimit(
  name: RateLimitName,
  ...identifiers: string[]
): Promise<boolean> {
  const rl = limiter(name);
  if (!rl) return true;
  try {
    const results = await Promise.all(
      identifiers.map((id) => rl.limit(id.toLowerCase())),
    );
    return results.every((r) => r.success);
  } catch (error) {
    console.error(`Rate limit ${name} failed`, error);
    return true;
  }
}
