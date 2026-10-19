/**
 * Database hardening, run after every migration (`pnpm migrate`). Idempotent.
 *
 * - Enables RLS on every Payload table. Payload connects as the table owner,
 *   so it is unaffected; any other role (Supabase's `anon`/`authenticated`,
 *   a leaked read-only key) gets no rows without an explicit policy.
 * - Revokes Supabase API roles' access to the Payload schema, now and for
 *   tables created later.
 * - Stops sessions that sit idle inside a transaction from holding locks.
 */
import { sql } from "@payloadcms/db-postgres";
import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { getPayload } from "payload";
import config from "../../payload.config";
import { DB_SCHEMA } from "../constants";

const payload = await getPayload({ config });
const db = payload.db as unknown as PostgresAdapter;
const schema = sql.identifier(DB_SCHEMA);

// DO blocks can't take bind parameters; DB_SCHEMA is a code constant.
if (!/^[a-z_][a-z0-9_]*$/.test(DB_SCHEMA))
  throw new Error("Unsafe schema name");
await db.drizzle.execute(
  sql.raw(`
    do $$
    declare t record;
    begin
      for t in
        select c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = '${DB_SCHEMA}' and c.relkind = 'r' and not c.relrowsecurity
      loop
        execute format('alter table %I.%I enable row level security', '${DB_SCHEMA}', t.relname);
      end loop;
    end $$;
  `),
);

await db.drizzle.execute(sql`revoke all on schema ${schema} from public`);

const { rows } = await db.drizzle.execute(
  sql`select rolname from pg_roles where rolname in ('anon', 'authenticated')`,
);
for (const { rolname } of rows as { rolname: string }[]) {
  const role = sql.identifier(rolname);
  await db.drizzle.execute(sql`revoke all on schema ${schema} from ${role}`);
  await db.drizzle.execute(
    sql`revoke all on all tables in schema ${schema} from ${role}`,
  );
  await db.drizzle.execute(
    sql`revoke all on all sequences in schema ${schema} from ${role}`,
  );
  await db.drizzle.execute(
    sql`revoke all on all functions in schema ${schema} from ${role}`,
  );
  await db.drizzle.execute(
    sql`alter default privileges in schema ${schema} revoke all on tables from ${role}`,
  );
  await db.drizzle.execute(
    sql`alter default privileges in schema ${schema} revoke all on sequences from ${role}`,
  );
  await db.drizzle.execute(
    sql`alter default privileges in schema ${schema} revoke all on functions from ${role}`,
  );
}

await db.drizzle.execute(
  sql`alter role current_user set idle_in_transaction_session_timeout = '30s'`,
);

const { rows: open } = await db.drizzle.execute(sql`
  select count(*)::int as n from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = ${DB_SCHEMA} and c.relkind = 'r' and not c.relrowsecurity
`);
payload.logger.info(
  `Database hardened: RLS on all "${DB_SCHEMA}" tables (without RLS: ${(open[0] as { n: number }).n}), API roles revoked: ${rows.length ? rows.map((r) => (r as { rolname: string }).rolname).join(", ") : "none present"}.`,
);

await payload.destroy();
process.exit(0);
