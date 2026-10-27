import "server-only";
import { sql } from "@payloadcms/db-postgres";
import { getPayloadClient } from "@/features/account/customer";

const TIMEOUT_MS = 3_000;

/** True if the database answers a trivial query within a few seconds. */
export async function databaseIsUp(): Promise<boolean> {
  try {
    const payload = await getPayloadClient();
    const ping = payload.db.drizzle.execute(sql`select 1`);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS),
    );
    await Promise.race([ping, timeout]);
    return true;
  } catch (error) {
    console.error("Health check: database unreachable", error);
    return false;
  }
}
