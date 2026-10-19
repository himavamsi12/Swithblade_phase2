import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."customers_sessions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."customers_sessions" CASCADE;
  ALTER TABLE "payload"."payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_customers_fk";
  
  DROP INDEX "payload"."payload_preferences_rels_customers_id_idx";
  ALTER TABLE "payload"."customers" DROP COLUMN "reset_password_token";
  ALTER TABLE "payload"."customers" DROP COLUMN "reset_password_expiration";
  ALTER TABLE "payload"."customers" DROP COLUMN "salt";
  ALTER TABLE "payload"."customers" DROP COLUMN "hash";
  ALTER TABLE "payload"."customers" DROP COLUMN "reset_password_requested_at";
  ALTER TABLE "payload"."customers" DROP COLUMN "login_attempts";
  ALTER TABLE "payload"."customers" DROP COLUMN "lock_until";
  ALTER TABLE "payload"."payload_preferences_rels" DROP COLUMN "customers_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  ALTER TABLE "payload"."customers" ADD COLUMN "reset_password_token" varchar;
  ALTER TABLE "payload"."customers" ADD COLUMN "reset_password_expiration" timestamp(3) with time zone;
  ALTER TABLE "payload"."customers" ADD COLUMN "salt" varchar;
  ALTER TABLE "payload"."customers" ADD COLUMN "hash" varchar;
  ALTER TABLE "payload"."customers" ADD COLUMN "reset_password_requested_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."customers" ADD COLUMN "login_attempts" numeric DEFAULT 0;
  ALTER TABLE "payload"."customers" ADD COLUMN "lock_until" timestamp(3) with time zone;
  ALTER TABLE "payload"."payload_preferences_rels" ADD COLUMN "customers_id" integer;
  ALTER TABLE "payload"."customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."customers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "customers_sessions_order_idx" ON "payload"."customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "payload"."customers_sessions" USING btree ("_parent_id");
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "payload"."customers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload"."payload_preferences_rels" USING btree ("customers_id");`)
}
