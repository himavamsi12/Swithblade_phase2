import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."orders" ADD COLUMN "razorpay_order_id" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "razorpay_payment_id" varchar;
  CREATE UNIQUE INDEX "orders_razorpay_order_id_idx" ON "payload"."orders" USING btree ("razorpay_order_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "payload"."orders_razorpay_order_id_idx";
  ALTER TABLE "payload"."orders" DROP COLUMN "razorpay_order_id";
  ALTER TABLE "payload"."orders" DROP COLUMN "razorpay_payment_id";`)
}
