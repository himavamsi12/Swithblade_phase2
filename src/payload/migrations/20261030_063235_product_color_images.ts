import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."products_color_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"color_id" integer
  );
  
  CREATE TABLE "payload"."_products_v_version_color_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"color_id" integer,
  	"_uuid" varchar
  );
  
  ALTER TABLE "payload"."products_color_images" ADD CONSTRAINT "products_color_images_color_id_variant_options_id_fk" FOREIGN KEY ("color_id") REFERENCES "payload"."variant_options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_color_images" ADD CONSTRAINT "products_color_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_version_color_images" ADD CONSTRAINT "_products_v_version_color_images_color_id_variant_options_id_fk" FOREIGN KEY ("color_id") REFERENCES "payload"."variant_options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_version_color_images" ADD CONSTRAINT "_products_v_version_color_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_color_images_order_idx" ON "payload"."products_color_images" USING btree ("_order");
  CREATE INDEX "products_color_images_parent_id_idx" ON "payload"."products_color_images" USING btree ("_parent_id");
  CREATE INDEX "products_color_images_color_idx" ON "payload"."products_color_images" USING btree ("color_id");
  CREATE INDEX "_products_v_version_color_images_order_idx" ON "payload"."_products_v_version_color_images" USING btree ("_order");
  CREATE INDEX "_products_v_version_color_images_parent_id_idx" ON "payload"."_products_v_version_color_images" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_color_images_color_idx" ON "payload"."_products_v_version_color_images" USING btree ("color_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."products_color_images" CASCADE;
  DROP TABLE "payload"."_products_v_version_color_images" CASCADE;`)
}
