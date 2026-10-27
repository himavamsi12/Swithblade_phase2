import "server-only";
import { Redis } from "@upstash/redis";
import { z } from "zod";

/*
 * Upstash Redis (REST), shared by every server instance. Optional: while the
 * keys are unset, callers fall back to per-instance memory and rate limits are
 * off. Accepts Upstash's names or the KV_* ones the Vercel integration adds.
 */
const schema = z.object({
  url: z.url().optional(),
  token: z.string().min(1).optional(),
});

const parsed = schema.safeParse({
  url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
});
if (!parsed.success) {
  throw new Error(
    `Invalid Upstash Redis environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}
const { url, token } = parsed.data;

/** The shared client, or null when Redis isn't configured. */
export const redis =
  url && token
    ? new Redis({ url, token, enableTelemetry: false, retry: { retries: 1 } })
    : null;

/** Every key this app writes starts with this, so the database can be shared. */
export const REDIS_PREFIX = "sb";

/**
 * Reads a cached value, treating Redis errors as a miss: a cache outage
 * should slow requests down, not fail them.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(`${REDIS_PREFIX}:${key}`);
  } catch (error) {
    console.error(`Redis get ${key} failed`, error);
    return null;
  }
}

/** Stores a value for `ttlSeconds`. Errors are logged and ignored. */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(`${REDIS_PREFIX}:${key}`, value, { ex: ttlSeconds });
  } catch (error) {
    console.error(`Redis set ${key} failed`, error);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(`${REDIS_PREFIX}:${key}`);
  } catch (error) {
    console.error(`Redis del ${key} failed`, error);
  }
}
