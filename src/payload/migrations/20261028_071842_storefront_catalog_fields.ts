import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."products" ADD COLUMN "details" varchar;
  ALTER TABLE "payload"."products" ADD COLUMN "shipping_returns" varchar;
  ALTER TABLE "payload"."products" ADD COLUMN "image_frame_left" numeric;
  ALTER TABLE "payload"."products" ADD COLUMN "image_frame_top" numeric;
  ALTER TABLE "payload"."products" ADD COLUMN "image_frame_width" numeric;
  ALTER TABLE "payload"."products" ADD COLUMN "image_frame_height" numeric;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_details" varchar;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_shipping_returns" varchar;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_image_frame_left" numeric;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_image_frame_top" numeric;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_image_frame_width" numeric;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_image_frame_height" numeric;
  ALTER TABLE "payload"."variant_options" ADD COLUMN "swatch" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."products" DROP COLUMN "details";
  ALTER TABLE "payload"."products" DROP COLUMN "shipping_returns";
  ALTER TABLE "payload"."products" DROP COLUMN "image_frame_left";
  ALTER TABLE "payload"."products" DROP COLUMN "image_frame_top";
  ALTER TABLE "payload"."products" DROP COLUMN "image_frame_width";
  ALTER TABLE "payload"."products" DROP COLUMN "image_frame_height";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_details";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_shipping_returns";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_image_frame_left";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_image_frame_top";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_image_frame_width";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_image_frame_height";
  ALTER TABLE "payload"."variant_options" DROP COLUMN "swatch";`)
}
