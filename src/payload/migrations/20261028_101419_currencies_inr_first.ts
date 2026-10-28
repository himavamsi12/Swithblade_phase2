import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DEFAULT 'INR'::text;
  DROP TYPE "payload"."enum_orders_currency";
  CREATE TYPE "payload"."enum_orders_currency" AS ENUM('INR', 'USD', 'EUR', 'GBP');
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DEFAULT 'INR'::"payload"."enum_orders_currency";
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_orders_currency" USING "currency"::"payload"."enum_orders_currency";
  ALTER TABLE "payload"."returns" ALTER COLUMN "currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_returns_currency";
  CREATE TYPE "payload"."enum_returns_currency" AS ENUM('INR', 'USD', 'EUR', 'GBP');
  ALTER TABLE "payload"."returns" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_returns_currency" USING "currency"::"payload"."enum_returns_currency";
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DEFAULT 'INR'::text;
  DROP TYPE "payload"."enum_carts_currency";
  CREATE TYPE "payload"."enum_carts_currency" AS ENUM('INR', 'USD', 'EUR', 'GBP');
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DEFAULT 'INR'::"payload"."enum_carts_currency";
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_carts_currency" USING "currency"::"payload"."enum_carts_currency";
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DEFAULT 'INR'::text;
  DROP TYPE "payload"."enum_transactions_currency";
  CREATE TYPE "payload"."enum_transactions_currency" AS ENUM('INR', 'USD', 'EUR', 'GBP');
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DEFAULT 'INR'::"payload"."enum_transactions_currency";
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_transactions_currency" USING "currency"::"payload"."enum_transactions_currency";
  ALTER TABLE "payload"."promotions" ALTER COLUMN "application_method_currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_promotions_application_method_currency";
  CREATE TYPE "payload"."enum_promotions_application_method_currency" AS ENUM('INR', 'USD', 'EUR', 'GBP');
  ALTER TABLE "payload"."promotions" ALTER COLUMN "application_method_currency" SET DATA TYPE "payload"."enum_promotions_application_method_currency" USING "application_method_currency"::"payload"."enum_promotions_application_method_currency";
  ALTER TABLE "payload"."promotions" ALTER COLUMN "rules_currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_promotions_rules_currency";
  CREATE TYPE "payload"."enum_promotions_rules_currency" AS ENUM('INR', 'USD', 'EUR', 'GBP');
  ALTER TABLE "payload"."promotions" ALTER COLUMN "rules_currency" SET DATA TYPE "payload"."enum_promotions_rules_currency" USING "rules_currency"::"payload"."enum_promotions_rules_currency";
  ALTER TABLE "payload"."campaigns" ALTER COLUMN "budget_currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_campaigns_budget_currency";
  CREATE TYPE "payload"."enum_campaigns_budget_currency" AS ENUM('INR', 'USD', 'EUR', 'GBP');
  ALTER TABLE "payload"."campaigns" ALTER COLUMN "budget_currency" SET DATA TYPE "payload"."enum_campaigns_budget_currency" USING "budget_currency"::"payload"."enum_campaigns_budget_currency";
  ALTER TABLE "payload"."price_lists_prices" ALTER COLUMN "currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_price_lists_prices_currency";
  CREATE TYPE "payload"."enum_price_lists_prices_currency" AS ENUM('INR', 'USD', 'EUR', 'GBP');
  ALTER TABLE "payload"."price_lists_prices" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_price_lists_prices_currency" USING "currency"::"payload"."enum_price_lists_prices_currency";
  ALTER TABLE "payload"."regions" ALTER COLUMN "currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_regions_currency";
  CREATE TYPE "payload"."enum_regions_currency" AS ENUM('INR', 'USD', 'EUR', 'GBP');
  ALTER TABLE "payload"."regions" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_regions_currency" USING "currency"::"payload"."enum_regions_currency";
  ALTER TABLE "payload"."shipping_options_prices" ALTER COLUMN "currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_shipping_options_prices_currency";
  CREATE TYPE "payload"."enum_shipping_options_prices_currency" AS ENUM('INR', 'USD', 'EUR', 'GBP');
  ALTER TABLE "payload"."shipping_options_prices" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_shipping_options_prices_currency" USING "currency"::"payload"."enum_shipping_options_prices_currency";
  ALTER TABLE "payload"."store" ALTER COLUMN "default_currency" SET DATA TYPE text;
  ALTER TABLE "payload"."store" ALTER COLUMN "default_currency" SET DEFAULT 'INR'::text;
  DROP TYPE "payload"."enum_store_default_currency";
  CREATE TYPE "payload"."enum_store_default_currency" AS ENUM('INR', 'USD', 'EUR', 'GBP');
  ALTER TABLE "payload"."store" ALTER COLUMN "default_currency" SET DEFAULT 'INR'::"payload"."enum_store_default_currency";
  ALTER TABLE "payload"."store" ALTER COLUMN "default_currency" SET DATA TYPE "payload"."enum_store_default_currency" USING "default_currency"::"payload"."enum_store_default_currency";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DEFAULT 'USD'::text;
  DROP TYPE "payload"."enum_orders_currency";
  CREATE TYPE "payload"."enum_orders_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DEFAULT 'USD'::"payload"."enum_orders_currency";
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_orders_currency" USING "currency"::"payload"."enum_orders_currency";
  ALTER TABLE "payload"."returns" ALTER COLUMN "currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_returns_currency";
  CREATE TYPE "payload"."enum_returns_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  ALTER TABLE "payload"."returns" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_returns_currency" USING "currency"::"payload"."enum_returns_currency";
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DEFAULT 'USD'::text;
  DROP TYPE "payload"."enum_carts_currency";
  CREATE TYPE "payload"."enum_carts_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DEFAULT 'USD'::"payload"."enum_carts_currency";
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_carts_currency" USING "currency"::"payload"."enum_carts_currency";
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DEFAULT 'USD'::text;
  DROP TYPE "payload"."enum_transactions_currency";
  CREATE TYPE "payload"."enum_transactions_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DEFAULT 'USD'::"payload"."enum_transactions_currency";
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_transactions_currency" USING "currency"::"payload"."enum_transactions_currency";
  ALTER TABLE "payload"."promotions" ALTER COLUMN "application_method_currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_promotions_application_method_currency";
  CREATE TYPE "payload"."enum_promotions_application_method_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  ALTER TABLE "payload"."promotions" ALTER COLUMN "application_method_currency" SET DATA TYPE "payload"."enum_promotions_application_method_currency" USING "application_method_currency"::"payload"."enum_promotions_application_method_currency";
  ALTER TABLE "payload"."promotions" ALTER COLUMN "rules_currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_promotions_rules_currency";
  CREATE TYPE "payload"."enum_promotions_rules_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  ALTER TABLE "payload"."promotions" ALTER COLUMN "rules_currency" SET DATA TYPE "payload"."enum_promotions_rules_currency" USING "rules_currency"::"payload"."enum_promotions_rules_currency";
  ALTER TABLE "payload"."campaigns" ALTER COLUMN "budget_currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_campaigns_budget_currency";
  CREATE TYPE "payload"."enum_campaigns_budget_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  ALTER TABLE "payload"."campaigns" ALTER COLUMN "budget_currency" SET DATA TYPE "payload"."enum_campaigns_budget_currency" USING "budget_currency"::"payload"."enum_campaigns_budget_currency";
  ALTER TABLE "payload"."price_lists_prices" ALTER COLUMN "currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_price_lists_prices_currency";
  CREATE TYPE "payload"."enum_price_lists_prices_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  ALTER TABLE "payload"."price_lists_prices" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_price_lists_prices_currency" USING "currency"::"payload"."enum_price_lists_prices_currency";
  ALTER TABLE "payload"."regions" ALTER COLUMN "currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_regions_currency";
  CREATE TYPE "payload"."enum_regions_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  ALTER TABLE "payload"."regions" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_regions_currency" USING "currency"::"payload"."enum_regions_currency";
  ALTER TABLE "payload"."shipping_options_prices" ALTER COLUMN "currency" SET DATA TYPE text;
  DROP TYPE "payload"."enum_shipping_options_prices_currency";
  CREATE TYPE "payload"."enum_shipping_options_prices_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  ALTER TABLE "payload"."shipping_options_prices" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_shipping_options_prices_currency" USING "currency"::"payload"."enum_shipping_options_prices_currency";
  ALTER TABLE "payload"."store" ALTER COLUMN "default_currency" SET DATA TYPE text;
  ALTER TABLE "payload"."store" ALTER COLUMN "default_currency" SET DEFAULT 'INR'::text;
  DROP TYPE "payload"."enum_store_default_currency";
  CREATE TYPE "payload"."enum_store_default_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  ALTER TABLE "payload"."store" ALTER COLUMN "default_currency" SET DEFAULT 'INR'::"payload"."enum_store_default_currency";
  ALTER TABLE "payload"."store" ALTER COLUMN "default_currency" SET DATA TYPE "payload"."enum_store_default_currency" USING "default_currency"::"payload"."enum_store_default_currency";`)
}
