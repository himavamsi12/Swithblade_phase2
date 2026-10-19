import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."customers" ADD COLUMN "supabase_user_id" varchar;
  ALTER TABLE "payload"."customers" ADD COLUMN "supabase_provider" varchar;
  ALTER TABLE "payload"."customers" ADD COLUMN "supabase_email_confirmed_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."customers" ADD COLUMN "supabase_last_sign_in_at" timestamp(3) with time zone;
  CREATE UNIQUE INDEX "customers_supabase_supabase_user_id_idx" ON "payload"."customers" USING btree ("supabase_user_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "payload"."customers_supabase_supabase_user_id_idx";
  ALTER TABLE "payload"."customers" DROP COLUMN "supabase_user_id";
  ALTER TABLE "payload"."customers" DROP COLUMN "supabase_provider";
  ALTER TABLE "payload"."customers" DROP COLUMN "supabase_email_confirmed_at";
  ALTER TABLE "payload"."customers" DROP COLUMN "supabase_last_sign_in_at";`)
}
