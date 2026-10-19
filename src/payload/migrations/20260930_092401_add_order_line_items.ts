import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."orders_line_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"options" varchar,
  	"product_slug" varchar,
  	"unit_price" numeric NOT NULL,
  	"quantity" numeric DEFAULT 1 NOT NULL,
  	"image" varchar
  );
  
  ALTER TABLE "payload"."orders" ADD COLUMN "expected_delivery_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."orders_line_items" ADD CONSTRAINT "orders_line_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "orders_line_items_order_idx" ON "payload"."orders_line_items" USING btree ("_order");
  CREATE INDEX "orders_line_items_parent_id_idx" ON "payload"."orders_line_items" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."orders_line_items" CASCADE;
  ALTER TABLE "payload"."orders" DROP COLUMN "expected_delivery_at";`)
}
