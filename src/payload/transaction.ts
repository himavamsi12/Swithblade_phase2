import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { sql } from "@payloadcms/db-postgres";
import type { PayloadRequest } from "payload";

/** The open transaction's database handle, so locks hold until commit. */
export async function transactionDb(req: PayloadRequest) {
  const adapter = req.payload.db as unknown as PostgresAdapter;
  const id = req.transactionID ? await req.transactionID : undefined;
  return (id !== undefined && adapter.sessions[id]?.db) || adapter.drizzle;
}

/**
 * Waits for, then holds until commit, a lock named by `key`. Two callers
 * with the same key run one after the other.
 */
export async function lockKey(req: PayloadRequest, key: string) {
  const db = await transactionDb(req);
  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
}
