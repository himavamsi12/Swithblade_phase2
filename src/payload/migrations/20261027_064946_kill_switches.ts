import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."store" ADD COLUMN "checkout_paused" boolean DEFAULT false;
  ALTER TABLE "payload"."store" ADD COLUMN "checkout_paused_message" varchar DEFAULT 'Checkout is paused for a few minutes. Your bag is saved; please try again shortly.';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."store" DROP COLUMN "checkout_paused";
  ALTER TABLE "payload"."store" DROP COLUMN "checkout_paused_message";`)
}
