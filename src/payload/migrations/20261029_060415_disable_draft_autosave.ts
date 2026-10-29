import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "payload"."_products_v_autosave_idx";
  DROP INDEX "payload"."_variants_v_autosave_idx";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "autosave";
  ALTER TABLE "payload"."_variants_v" DROP COLUMN "autosave";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."_products_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "payload"."_variants_v" ADD COLUMN "autosave" boolean;
  CREATE INDEX "_products_v_autosave_idx" ON "payload"."_products_v" USING btree ("autosave");
  CREATE INDEX "_variants_v_autosave_idx" ON "payload"."_variants_v" USING btree ("autosave");`)
}
