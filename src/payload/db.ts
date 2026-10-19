import path from "node:path";
import {
  postgresAdapter,
  type PostgresAdapterArgs,
} from "@payloadcms/db-postgres";
import { DB_SCHEMA } from "./constants";
import { payloadEnv } from "./env";

type PoolConfig = PostgresAdapterArgs["pool"];

/*
 * Payload's tables live in their own schema (DB_SCHEMA), not `public`.
 * Supabase only exposes schemas listed in its Data API settings, so shopper
 * data, orders and password hashes are never reachable with the anon key.
 * `scripts/harden-db.ts` adds RLS and revokes API-role grants on top.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

// `payload migrate` and friends connect through the migration URL when set.
const isMigrationCommand = process.argv.some((arg) =>
  arg.startsWith("migrate"),
);

const connectionUrl = new URL(
  (isMigrationCommand && payloadEnv.DATABASE_MIGRATION_URL) ||
    payloadEnv.DATABASE_URL,
);
const isLocal = LOCAL_HOSTS.has(connectionUrl.hostname);
const isProduction = process.env.NODE_ENV === "production";

function sslConfig(): PoolConfig["ssl"] {
  if (isLocal) return undefined;
  if (payloadEnv.DATABASE_CA_CERT) {
    return {
      ca: payloadEnv.DATABASE_CA_CERT.replace(/\\n/g, "\n"),
      rejectUnauthorized: true,
    };
  }
  if (isProduction) {
    throw new Error(
      "DATABASE_CA_CERT is required in production so the database TLS certificate is verified. " +
        "Download it from Supabase → Database settings → SSL.",
    );
  }
  // Development only: encrypted, but the certificate is not verified.
  return { rejectUnauthorized: false };
}

// sslmode in the URL would override the `ssl` object in node-postgres.
connectionUrl.searchParams.delete("sslmode");
connectionUrl.searchParams.delete("sslrootcert");

const pool: PoolConfig = {
  connectionString: connectionUrl.toString(),
  ssl: sslConfig(),
  // Serverless instances should hold a single connection (Supabase guidance);
  // long-running servers can share a small pool.
  max: payloadEnv.DATABASE_POOL_MAX ?? (process.env.VERCEL ? 1 : 10),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  // Server-side timeouts are set on the role by scripts/harden-db.ts rather
  // than as startup parameters, which poolers may not pass through.
};

export const databaseAdapter = (dirname: string) =>
  postgresAdapter({
    pool,
    schemaName: DB_SCHEMA,
    // No auto-sync (drizzle push), even in development: every schema change
    // goes through a reviewed migration, so local, Supabase and production
    // never drift and push can't silently drop a column.
    push: false,
    migrationDir: path.resolve(dirname, "payload/migrations"),
  });
