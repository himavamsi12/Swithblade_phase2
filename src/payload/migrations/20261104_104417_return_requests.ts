import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "payload"."enum_returns_status" ADD VALUE 'approved' BEFORE 'received';
  ALTER TYPE "payload"."enum_returns_status" ADD VALUE 'rejected' BEFORE 'received';
  ALTER TYPE "payload"."enum_returns_status" ADD VALUE 'refunded' BEFORE 'canceled';
  CREATE TABLE "payload"."returns_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"return_photos_id" integer
  );
  
  CREATE TABLE "payload"."return_photos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer,
  	"prefix" varchar DEFAULT 'returns',
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar
  );
  
  ALTER TABLE "payload"."returns_items" ADD COLUMN "line_id" varchar;
  ALTER TABLE "payload"."returns" ADD COLUMN "customer_note" varchar;
  ALTER TABLE "payload"."returns" ADD COLUMN "approved_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."returns" ADD COLUMN "refunded_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "return_photos_id" integer;
  ALTER TABLE "payload"."returns_rels" ADD CONSTRAINT "returns_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."returns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."returns_rels" ADD CONSTRAINT "returns_rels_return_photos_fk" FOREIGN KEY ("return_photos_id") REFERENCES "payload"."return_photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."return_photos" ADD CONSTRAINT "return_photos_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."customers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "returns_rels_order_idx" ON "payload"."returns_rels" USING btree ("order");
  CREATE INDEX "returns_rels_parent_idx" ON "payload"."returns_rels" USING btree ("parent_id");
  CREATE INDEX "returns_rels_path_idx" ON "payload"."returns_rels" USING btree ("path");
  CREATE INDEX "returns_rels_return_photos_id_idx" ON "payload"."returns_rels" USING btree ("return_photos_id");
  CREATE INDEX "return_photos_customer_idx" ON "payload"."return_photos" USING btree ("customer_id");
  CREATE INDEX "return_photos_updated_at_idx" ON "payload"."return_photos" USING btree ("updated_at");
  CREATE INDEX "return_photos_created_at_idx" ON "payload"."return_photos" USING btree ("created_at");
  CREATE UNIQUE INDEX "return_photos_filename_idx" ON "payload"."return_photos" USING btree ("filename");
  CREATE INDEX "return_photos_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "payload"."return_photos" USING btree ("sizes_thumbnail_filename");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_return_photos_fk" FOREIGN KEY ("return_photos_id") REFERENCES "payload"."return_photos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_return_photos_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("return_photos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."returns_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."return_photos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."returns_rels" CASCADE;
  DROP TABLE "payload"."return_photos" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_return_photos_fk";
  
  ALTER TABLE "payload"."returns" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "payload"."returns" ALTER COLUMN "status" SET DEFAULT 'requested'::text;
  DROP TYPE "payload"."enum_returns_status";
  CREATE TYPE "payload"."enum_returns_status" AS ENUM('requested', 'received', 'partially_received', 'canceled');
  ALTER TABLE "payload"."returns" ALTER COLUMN "status" SET DEFAULT 'requested'::"payload"."enum_returns_status";
  ALTER TABLE "payload"."returns" ALTER COLUMN "status" SET DATA TYPE "payload"."enum_returns_status" USING "status"::"payload"."enum_returns_status";
  DROP INDEX "payload"."payload_locked_documents_rels_return_photos_id_idx";
  ALTER TABLE "payload"."returns_items" DROP COLUMN "line_id";
  ALTER TABLE "payload"."returns" DROP COLUMN "customer_note";
  ALTER TABLE "payload"."returns" DROP COLUMN "approved_at";
  ALTER TABLE "payload"."returns" DROP COLUMN "refunded_at";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "return_photos_id";`)
}
