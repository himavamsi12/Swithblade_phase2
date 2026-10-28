import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_stock_holds_status" AS ENUM('active', 'converted', 'released');
  CREATE TABLE "payload"."stock_holds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL,
  	"label" varchar,
  	"quantity" numeric NOT NULL,
  	"status" "payload"."enum_stock_holds_status" DEFAULT 'active' NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"checkout" varchar NOT NULL,
  	"holder" varchar NOT NULL,
  	"razorpay_order_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "stock_holds_id" integer;
  CREATE INDEX "stock_holds_item_idx" ON "payload"."stock_holds" USING btree ("item");
  CREATE INDEX "stock_holds_status_idx" ON "payload"."stock_holds" USING btree ("status");
  CREATE INDEX "stock_holds_expires_at_idx" ON "payload"."stock_holds" USING btree ("expires_at");
  CREATE INDEX "stock_holds_checkout_idx" ON "payload"."stock_holds" USING btree ("checkout");
  CREATE INDEX "stock_holds_holder_idx" ON "payload"."stock_holds" USING btree ("holder");
  CREATE INDEX "stock_holds_razorpay_order_id_idx" ON "payload"."stock_holds" USING btree ("razorpay_order_id");
  CREATE INDEX "stock_holds_updated_at_idx" ON "payload"."stock_holds" USING btree ("updated_at");
  CREATE INDEX "stock_holds_created_at_idx" ON "payload"."stock_holds" USING btree ("created_at");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_holds_fk" FOREIGN KEY ("stock_holds_id") REFERENCES "payload"."stock_holds"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_stock_holds_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("stock_holds_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."stock_holds" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."stock_holds" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_stock_holds_fk";
  
  DROP INDEX "payload"."payload_locked_documents_rels_stock_holds_id_idx";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "stock_holds_id";
  DROP TYPE "payload"."enum_stock_holds_status";`)
}
