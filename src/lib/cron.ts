import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron calls with `Authorization: Bearer <CRON_SECRET>`. Cron routes
 * stay disabled while the secret is unset, so they can't be triggered openly.
 */
export function isAuthorizedCron(authorization: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authorization);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
