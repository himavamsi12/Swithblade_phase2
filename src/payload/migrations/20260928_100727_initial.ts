import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Payload's tables live outside `public` so Supabase's Data API can't reach them.
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "payload";`)
  await db.execute(sql`
   CREATE TYPE "payload"."enum_orders_status" AS ENUM('processing', 'completed', 'cancelled', 'refunded');
  CREATE TYPE "payload"."enum_orders_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  CREATE TYPE "payload"."enum_orders_payment_status" AS ENUM('awaiting', 'authorized', 'captured', 'partially_refunded', 'refunded', 'canceled', 'requires_action');
  CREATE TYPE "payload"."enum_orders_fulfillment_status" AS ENUM('not_fulfilled', 'partially_fulfilled', 'fulfilled', 'shipped', 'delivered', 'returned', 'canceled');
  CREATE TYPE "payload"."enum_returns_status" AS ENUM('requested', 'received', 'partially_received', 'canceled');
  CREATE TYPE "payload"."enum_returns_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  CREATE TYPE "payload"."enum_carts_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  CREATE TYPE "payload"."enum_transactions_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'expired', 'refunded');
  CREATE TYPE "payload"."enum_transactions_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  CREATE TYPE "payload"."enum_products_origin_country" AS ENUM('US', 'CA', 'GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'DK', 'IN', 'AE', 'SG', 'JP', 'AU');
  CREATE TYPE "payload"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__products_v_version_origin_country" AS ENUM('US', 'CA', 'GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'DK', 'IN', 'AE', 'SG', 'JP', 'AU');
  CREATE TYPE "payload"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_variants_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__variants_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_addresses_country" AS ENUM('US', 'CA', 'GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'DK', 'IN', 'AE', 'SG', 'JP', 'AU');
  CREATE TYPE "payload"."enum_promotions_type" AS ENUM('standard', 'buyget');
  CREATE TYPE "payload"."enum_promotions_status" AS ENUM('draft', 'active', 'inactive');
  CREATE TYPE "payload"."enum_promotions_application_method_type" AS ENUM('percentage', 'fixed');
  CREATE TYPE "payload"."enum_promotions_application_method_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  CREATE TYPE "payload"."enum_promotions_application_method_target_type" AS ENUM('order', 'items', 'shipping_methods');
  CREATE TYPE "payload"."enum_promotions_application_method_allocation" AS ENUM('across', 'each');
  CREATE TYPE "payload"."enum_promotions_rules_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  CREATE TYPE "payload"."enum_campaigns_budget_type" AS ENUM('spend', 'usage');
  CREATE TYPE "payload"."enum_campaigns_budget_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  CREATE TYPE "payload"."enum_price_lists_prices_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  CREATE TYPE "payload"."enum_price_lists_type" AS ENUM('sale', 'override');
  CREATE TYPE "payload"."enum_price_lists_status" AS ENUM('draft', 'active');
  CREATE TYPE "payload"."enum_users_role" AS ENUM('admin', 'member');
  CREATE TYPE "payload"."enum_regions_countries" AS ENUM('US', 'CA', 'GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'DK', 'IN', 'AE', 'SG', 'JP', 'AU');
  CREATE TYPE "payload"."enum_regions_payment_providers" AS ENUM('stripe', 'manual');
  CREATE TYPE "payload"."enum_regions_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  CREATE TYPE "payload"."enum_tax_regions_country" AS ENUM('US', 'CA', 'GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'DK', 'IN', 'AE', 'SG', 'JP', 'AU');
  CREATE TYPE "payload"."enum_stock_locations_service_zones_countries" AS ENUM('US', 'CA', 'GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'DK', 'IN', 'AE', 'SG', 'JP', 'AU');
  CREATE TYPE "payload"."enum_stock_locations_address_country" AS ENUM('US', 'CA', 'GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'DK', 'IN', 'AE', 'SG', 'JP', 'AU');
  CREATE TYPE "payload"."enum_shipping_options_prices_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  CREATE TYPE "payload"."enum_shipping_options_price_type" AS ENUM('flat', 'calculated');
  CREATE TYPE "payload"."enum_shipping_profiles_type" AS ENUM('default', 'gift_card', 'custom');
  CREATE TYPE "payload"."enum_store_default_currency" AS ENUM('USD', 'EUR', 'GBP', 'INR');
  CREATE TABLE "payload"."orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"variant_id" integer,
  	"quantity" numeric DEFAULT 1 NOT NULL
  );
  
  CREATE TABLE "payload"."orders_fulfillments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"location_id" integer,
  	"carrier" varchar,
  	"tracking_number" varchar,
  	"tracking_url" varchar,
  	"shipped_at" timestamp(3) with time zone,
  	"delivered_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"display_id" numeric,
  	"title" varchar,
  	"shipping_address_title" varchar,
  	"shipping_address_first_name" varchar,
  	"shipping_address_last_name" varchar,
  	"shipping_address_company" varchar,
  	"shipping_address_address_line1" varchar,
  	"shipping_address_address_line2" varchar,
  	"shipping_address_city" varchar,
  	"shipping_address_state" varchar,
  	"shipping_address_postal_code" varchar,
  	"shipping_address_country" varchar,
  	"shipping_address_phone" varchar,
  	"customer_id" integer,
  	"customer_email" varchar,
  	"status" "payload"."enum_orders_status" DEFAULT 'processing',
  	"amount" numeric,
  	"currency" "payload"."enum_orders_currency" DEFAULT 'USD',
  	"payment_status" "payload"."enum_orders_payment_status" DEFAULT 'awaiting',
  	"fulfillment_status" "payload"."enum_orders_fulfillment_status" DEFAULT 'not_fulfilled',
  	"region_id" integer,
  	"sales_channel_id" integer,
  	"totals_subtotal" numeric,
  	"totals_discount_total" numeric,
  	"totals_shipping_total" numeric,
  	"totals_tax_total" numeric,
  	"shipping_method_option_id" integer,
  	"shipping_method_name" varchar,
  	"shipping_method_amount" numeric,
  	"note" varchar,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."orders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"transactions_id" integer,
  	"promotions_id" integer
  );
  
  CREATE TABLE "payload"."returns_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"variant_id" integer,
  	"quantity" numeric NOT NULL,
  	"reason_id" integer,
  	"note" varchar,
  	"received_quantity" numeric
  );
  
  CREATE TABLE "payload"."returns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" integer NOT NULL,
  	"customer_id" integer,
  	"status" "payload"."enum_returns_status" DEFAULT 'requested' NOT NULL,
  	"location_id" integer,
  	"shipping_option_id" integer,
  	"refund_amount" numeric,
  	"currency" "payload"."enum_returns_currency",
  	"received_at" timestamp(3) with time zone,
  	"internal_note" varchar,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."carts_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"variant_id" integer,
  	"quantity" numeric DEFAULT 1 NOT NULL
  );
  
  CREATE TABLE "payload"."carts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"secret" varchar,
  	"customer_id" integer,
  	"purchased_at" timestamp(3) with time zone,
  	"subtotal" numeric,
  	"currency" "payload"."enum_carts_currency" DEFAULT 'USD',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."transactions_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"variant_id" integer,
  	"quantity" numeric DEFAULT 1 NOT NULL
  );
  
  CREATE TABLE "payload"."transactions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"billing_address_title" varchar,
  	"billing_address_first_name" varchar,
  	"billing_address_last_name" varchar,
  	"billing_address_company" varchar,
  	"billing_address_address_line1" varchar,
  	"billing_address_address_line2" varchar,
  	"billing_address_city" varchar,
  	"billing_address_state" varchar,
  	"billing_address_postal_code" varchar,
  	"billing_address_country" varchar,
  	"billing_address_phone" varchar,
  	"status" "payload"."enum_transactions_status" DEFAULT 'pending' NOT NULL,
  	"customer_id" integer,
  	"customer_email" varchar,
  	"order_id" integer,
  	"cart_id" integer,
  	"amount" numeric,
  	"currency" "payload"."enum_transactions_currency" DEFAULT 'USD',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"subtitle" varchar,
  	"description" varchar,
  	"thumbnail_id" integer,
  	"inventory" numeric DEFAULT 0,
  	"enable_variants" boolean,
  	"price_in_u_s_d_enabled" boolean,
  	"price_in_u_s_d" numeric,
  	"price_in_e_u_r_enabled" boolean,
  	"price_in_e_u_r" numeric,
  	"price_in_g_b_p_enabled" boolean,
  	"price_in_g_b_p" numeric,
  	"price_in_i_n_r_enabled" boolean,
  	"price_in_i_n_r" numeric,
  	"type_id" integer,
  	"collection_id" integer,
  	"shipping_profile_id" integer,
  	"weight" numeric,
  	"length" numeric,
  	"width" numeric,
  	"height" numeric,
  	"material" varchar,
  	"origin_country" "payload"."enum_products_origin_country",
  	"hs_code" varchar,
  	"mid_code" varchar,
  	"handle" varchar,
  	"discountable" boolean DEFAULT true,
  	"highlighted" boolean DEFAULT false,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "payload"."enum_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"variant_types_id" integer,
  	"product_categories_id" integer,
  	"product_tags_id" integer,
  	"sales_channels_id" integer
  );
  
  CREATE TABLE "payload"."_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_subtitle" varchar,
  	"version_description" varchar,
  	"version_thumbnail_id" integer,
  	"version_inventory" numeric DEFAULT 0,
  	"version_enable_variants" boolean,
  	"version_price_in_u_s_d_enabled" boolean,
  	"version_price_in_u_s_d" numeric,
  	"version_price_in_e_u_r_enabled" boolean,
  	"version_price_in_e_u_r" numeric,
  	"version_price_in_g_b_p_enabled" boolean,
  	"version_price_in_g_b_p" numeric,
  	"version_price_in_i_n_r_enabled" boolean,
  	"version_price_in_i_n_r" numeric,
  	"version_type_id" integer,
  	"version_collection_id" integer,
  	"version_shipping_profile_id" integer,
  	"version_weight" numeric,
  	"version_length" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version_material" varchar,
  	"version_origin_country" "payload"."enum__products_v_version_origin_country",
  	"version_hs_code" varchar,
  	"version_mid_code" varchar,
  	"version_handle" varchar,
  	"version_discountable" boolean DEFAULT true,
  	"version_highlighted" boolean DEFAULT false,
  	"version_metadata" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "payload"."_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"variant_types_id" integer,
  	"product_categories_id" integer,
  	"product_tags_id" integer,
  	"sales_channels_id" integer
  );
  
  CREATE TABLE "payload"."product_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"handle" varchar,
  	"parent_id" integer,
  	"is_active" boolean DEFAULT true,
  	"is_internal" boolean DEFAULT false,
  	"rank" numeric DEFAULT 0,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."product_collections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"handle" varchar,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."variant_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
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
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar
  );
  
  CREATE TABLE "payload"."variants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"product_id" integer,
  	"inventory" numeric DEFAULT 0,
  	"price_in_u_s_d_enabled" boolean,
  	"price_in_u_s_d" numeric,
  	"price_in_e_u_r_enabled" boolean,
  	"price_in_e_u_r" numeric,
  	"price_in_g_b_p_enabled" boolean,
  	"price_in_g_b_p" numeric,
  	"price_in_i_n_r_enabled" boolean,
  	"price_in_i_n_r" numeric,
  	"sku" varchar,
  	"barcode" varchar,
  	"ean" varchar,
  	"upc" varchar,
  	"manage_inventory" boolean DEFAULT true,
  	"allow_backorder" boolean DEFAULT false,
  	"weight" numeric,
  	"length" numeric,
  	"width" numeric,
  	"height" numeric,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "payload"."enum_variants_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."variants_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"variant_options_id" integer
  );
  
  CREATE TABLE "payload"."_variants_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_product_id" integer,
  	"version_inventory" numeric DEFAULT 0,
  	"version_price_in_u_s_d_enabled" boolean,
  	"version_price_in_u_s_d" numeric,
  	"version_price_in_e_u_r_enabled" boolean,
  	"version_price_in_e_u_r" numeric,
  	"version_price_in_g_b_p_enabled" boolean,
  	"version_price_in_g_b_p" numeric,
  	"version_price_in_i_n_r_enabled" boolean,
  	"version_price_in_i_n_r" numeric,
  	"version_sku" varchar,
  	"version_barcode" varchar,
  	"version_ean" varchar,
  	"version_upc" varchar,
  	"version_manage_inventory" boolean DEFAULT true,
  	"version_allow_backorder" boolean DEFAULT false,
  	"version_weight" numeric,
  	"version_length" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version_metadata" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__variants_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "payload"."_variants_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"variant_options_id" integer
  );
  
  CREATE TABLE "payload"."customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"company" varchar,
  	"phone" varchar,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."customers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"customer_groups_id" integer
  );
  
  CREATE TABLE "payload"."customer_groups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."addresses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer,
  	"title" varchar,
  	"first_name" varchar,
  	"last_name" varchar,
  	"company" varchar,
  	"address_line1" varchar,
  	"address_line2" varchar,
  	"city" varchar,
  	"state" varchar,
  	"postal_code" varchar,
  	"country" "payload"."enum_addresses_country" NOT NULL,
  	"phone" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."promotions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"type" "payload"."enum_promotions_type" DEFAULT 'standard' NOT NULL,
  	"status" "payload"."enum_promotions_status" DEFAULT 'draft' NOT NULL,
  	"is_automatic" boolean DEFAULT false,
  	"campaign_id" integer,
  	"application_method_type" "payload"."enum_promotions_application_method_type" DEFAULT 'percentage' NOT NULL,
  	"application_method_value" numeric NOT NULL,
  	"application_method_currency" "payload"."enum_promotions_application_method_currency",
  	"application_method_target_type" "payload"."enum_promotions_application_method_target_type" DEFAULT 'order' NOT NULL,
  	"application_method_allocation" "payload"."enum_promotions_application_method_allocation" DEFAULT 'across',
  	"application_method_max_quantity" numeric,
  	"application_method_buy_rules_min_quantity" numeric,
  	"rules_min_subtotal" numeric,
  	"rules_currency" "payload"."enum_promotions_rules_currency",
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"usage_limit" numeric,
  	"used_count" numeric DEFAULT 0,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."promotions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"product_categories_id" integer,
  	"product_collections_id" integer,
  	"customer_groups_id" integer,
  	"regions_id" integer
  );
  
  CREATE TABLE "payload"."campaigns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"identifier" varchar NOT NULL,
  	"description" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"budget_type" "payload"."enum_campaigns_budget_type",
  	"budget_currency" "payload"."enum_campaigns_budget_currency",
  	"budget_limit" numeric,
  	"budget_used" numeric DEFAULT 0,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."price_lists_prices" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant_id" integer NOT NULL,
  	"currency" "payload"."enum_price_lists_prices_currency" NOT NULL,
  	"amount" numeric NOT NULL,
  	"min_quantity" numeric,
  	"max_quantity" numeric
  );
  
  CREATE TABLE "payload"."price_lists" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"type" "payload"."enum_price_lists_type" DEFAULT 'sale' NOT NULL,
  	"status" "payload"."enum_price_lists_status" DEFAULT 'draft' NOT NULL,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."price_lists_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"customer_groups_id" integer
  );
  
  CREATE TABLE "payload"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"role" "payload"."enum_users_role" DEFAULT 'member' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."regions_countries" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "payload"."enum_regions_countries",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload"."regions_payment_providers" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "payload"."enum_regions_payment_providers",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload"."regions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"currency" "payload"."enum_regions_currency" NOT NULL,
  	"automatic_taxes" boolean DEFAULT true,
  	"is_tax_inclusive" boolean DEFAULT false,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."tax_regions_overrides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"rate" numeric NOT NULL
  );
  
  CREATE TABLE "payload"."tax_regions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"country" "payload"."enum_tax_regions_country" NOT NULL,
  	"province" varchar,
  	"default_rate_name" varchar NOT NULL,
  	"default_rate_code" varchar NOT NULL,
  	"default_rate_rate" numeric NOT NULL,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."tax_regions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"product_types_id" integer
  );
  
  CREATE TABLE "payload"."return_reasons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"description" varchar,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."sales_channels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"is_disabled" boolean DEFAULT false,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."sales_channels_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"stock_locations_id" integer
  );
  
  CREATE TABLE "payload"."product_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."product_tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."stock_locations_service_zones_countries" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "payload"."enum_stock_locations_service_zones_countries",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload"."stock_locations_service_zones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."stock_locations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"address_address1" varchar,
  	"address_address2" varchar,
  	"address_city" varchar,
  	"address_province" varchar,
  	"address_postal_code" varchar,
  	"address_country" "payload"."enum_stock_locations_address_country",
  	"address_phone" varchar,
  	"supports_shipping" boolean DEFAULT true,
  	"supports_pickup" boolean DEFAULT false,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."shipping_options_prices" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"currency" "payload"."enum_shipping_options_prices_currency",
  	"amount" numeric
  );
  
  CREATE TABLE "payload"."shipping_options" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"stock_location_id" integer NOT NULL,
  	"service_zone" varchar NOT NULL,
  	"shipping_profile_id" integer NOT NULL,
  	"price_type" "payload"."enum_shipping_options_price_type" DEFAULT 'flat',
  	"rules_min_subtotal" numeric,
  	"rules_max_subtotal" numeric,
  	"is_return" boolean DEFAULT false,
  	"enabled" boolean DEFAULT true,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."shipping_profiles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "payload"."enum_shipping_profiles_type" DEFAULT 'default' NOT NULL,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."variant_options" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_variantoptions_options_order" varchar,
  	"variant_type_id" integer NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"orders_id" integer,
  	"returns_id" integer,
  	"carts_id" integer,
  	"transactions_id" integer,
  	"products_id" integer,
  	"product_categories_id" integer,
  	"product_collections_id" integer,
  	"variant_types_id" integer,
  	"media_id" integer,
  	"variants_id" integer,
  	"customers_id" integer,
  	"customer_groups_id" integer,
  	"addresses_id" integer,
  	"promotions_id" integer,
  	"campaigns_id" integer,
  	"price_lists_id" integer,
  	"users_id" integer,
  	"regions_id" integer,
  	"tax_regions_id" integer,
  	"return_reasons_id" integer,
  	"sales_channels_id" integer,
  	"product_types_id" integer,
  	"product_tags_id" integer,
  	"stock_locations_id" integer,
  	"shipping_options_id" integer,
  	"shipping_profiles_id" integer,
  	"variant_options_id" integer
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"customers_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."store" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar DEFAULT 'Switchblade' NOT NULL,
  	"default_currency" "payload"."enum_store_default_currency" DEFAULT 'USD' NOT NULL,
  	"default_region_id" integer,
  	"default_sales_channel_id" integer,
  	"default_location_id" integer,
  	"order_notification_email" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."orders_items" ADD CONSTRAINT "orders_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_items" ADD CONSTRAINT "orders_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "payload"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."orders_fulfillments" ADD CONSTRAINT "orders_fulfillments_location_id_stock_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "payload"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_fulfillments" ADD CONSTRAINT "orders_fulfillments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "payload"."regions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_sales_channel_id_sales_channels_id_fk" FOREIGN KEY ("sales_channel_id") REFERENCES "payload"."sales_channels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_shipping_method_option_id_shipping_options_id_fk" FOREIGN KEY ("shipping_method_option_id") REFERENCES "payload"."shipping_options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_rels" ADD CONSTRAINT "orders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."orders_rels" ADD CONSTRAINT "orders_rels_transactions_fk" FOREIGN KEY ("transactions_id") REFERENCES "payload"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."orders_rels" ADD CONSTRAINT "orders_rels_promotions_fk" FOREIGN KEY ("promotions_id") REFERENCES "payload"."promotions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."returns_items" ADD CONSTRAINT "returns_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."returns_items" ADD CONSTRAINT "returns_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "payload"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."returns_items" ADD CONSTRAINT "returns_items_reason_id_return_reasons_id_fk" FOREIGN KEY ("reason_id") REFERENCES "payload"."return_reasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."returns_items" ADD CONSTRAINT "returns_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."returns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."returns" ADD CONSTRAINT "returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "payload"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."returns" ADD CONSTRAINT "returns_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."returns" ADD CONSTRAINT "returns_location_id_stock_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "payload"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."returns" ADD CONSTRAINT "returns_shipping_option_id_shipping_options_id_fk" FOREIGN KEY ("shipping_option_id") REFERENCES "payload"."shipping_options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."carts_items" ADD CONSTRAINT "carts_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."carts_items" ADD CONSTRAINT "carts_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "payload"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."carts_items" ADD CONSTRAINT "carts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."transactions_items" ADD CONSTRAINT "transactions_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."transactions_items" ADD CONSTRAINT "transactions_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "payload"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."transactions_items" ADD CONSTRAINT "transactions_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."transactions" ADD CONSTRAINT "transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "payload"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."transactions" ADD CONSTRAINT "transactions_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "payload"."carts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_type_id_product_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "payload"."product_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_collection_id_product_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "payload"."product_collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_shipping_profile_id_shipping_profiles_id_fk" FOREIGN KEY ("shipping_profile_id") REFERENCES "payload"."shipping_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "payload"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_product_categories_fk" FOREIGN KEY ("product_categories_id") REFERENCES "payload"."product_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_product_tags_fk" FOREIGN KEY ("product_tags_id") REFERENCES "payload"."product_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_sales_channels_fk" FOREIGN KEY ("sales_channels_id") REFERENCES "payload"."sales_channels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v" ADD CONSTRAINT "_products_v_version_thumbnail_id_media_id_fk" FOREIGN KEY ("version_thumbnail_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v" ADD CONSTRAINT "_products_v_version_type_id_product_types_id_fk" FOREIGN KEY ("version_type_id") REFERENCES "payload"."product_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v" ADD CONSTRAINT "_products_v_version_collection_id_product_collections_id_fk" FOREIGN KEY ("version_collection_id") REFERENCES "payload"."product_collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v" ADD CONSTRAINT "_products_v_version_shipping_profile_id_shipping_profiles_id_fk" FOREIGN KEY ("version_shipping_profile_id") REFERENCES "payload"."shipping_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "payload"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_product_categories_fk" FOREIGN KEY ("product_categories_id") REFERENCES "payload"."product_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_product_tags_fk" FOREIGN KEY ("product_tags_id") REFERENCES "payload"."product_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_sales_channels_fk" FOREIGN KEY ("sales_channels_id") REFERENCES "payload"."sales_channels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."product_categories" ADD CONSTRAINT "product_categories_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."product_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."variants_rels" ADD CONSTRAINT "variants_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."variants_rels" ADD CONSTRAINT "variants_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "payload"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_variants_v" ADD CONSTRAINT "_variants_v_parent_id_variants_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_variants_v" ADD CONSTRAINT "_variants_v_version_product_id_products_id_fk" FOREIGN KEY ("version_product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_variants_v_rels" ADD CONSTRAINT "_variants_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."_variants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_variants_v_rels" ADD CONSTRAINT "_variants_v_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "payload"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."customers_rels" ADD CONSTRAINT "customers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."customers_rels" ADD CONSTRAINT "customers_rels_customer_groups_fk" FOREIGN KEY ("customer_groups_id") REFERENCES "payload"."customer_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."addresses" ADD CONSTRAINT "addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."promotions" ADD CONSTRAINT "promotions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "payload"."campaigns"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."promotions_rels" ADD CONSTRAINT "promotions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."promotions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."promotions_rels" ADD CONSTRAINT "promotions_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."promotions_rels" ADD CONSTRAINT "promotions_rels_product_categories_fk" FOREIGN KEY ("product_categories_id") REFERENCES "payload"."product_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."promotions_rels" ADD CONSTRAINT "promotions_rels_product_collections_fk" FOREIGN KEY ("product_collections_id") REFERENCES "payload"."product_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."promotions_rels" ADD CONSTRAINT "promotions_rels_customer_groups_fk" FOREIGN KEY ("customer_groups_id") REFERENCES "payload"."customer_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."promotions_rels" ADD CONSTRAINT "promotions_rels_regions_fk" FOREIGN KEY ("regions_id") REFERENCES "payload"."regions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."price_lists_prices" ADD CONSTRAINT "price_lists_prices_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "payload"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."price_lists_prices" ADD CONSTRAINT "price_lists_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."price_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."price_lists_rels" ADD CONSTRAINT "price_lists_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."price_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."price_lists_rels" ADD CONSTRAINT "price_lists_rels_customer_groups_fk" FOREIGN KEY ("customer_groups_id") REFERENCES "payload"."customer_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."regions_countries" ADD CONSTRAINT "regions_countries_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."regions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."regions_payment_providers" ADD CONSTRAINT "regions_payment_providers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."regions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."tax_regions_overrides" ADD CONSTRAINT "tax_regions_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."tax_regions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."tax_regions_rels" ADD CONSTRAINT "tax_regions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."tax_regions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."tax_regions_rels" ADD CONSTRAINT "tax_regions_rels_product_types_fk" FOREIGN KEY ("product_types_id") REFERENCES "payload"."product_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."sales_channels_rels" ADD CONSTRAINT "sales_channels_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."sales_channels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."sales_channels_rels" ADD CONSTRAINT "sales_channels_rels_stock_locations_fk" FOREIGN KEY ("stock_locations_id") REFERENCES "payload"."stock_locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."stock_locations_service_zones_countries" ADD CONSTRAINT "stock_locations_service_zones_countries_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."stock_locations_service_zones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."stock_locations_service_zones" ADD CONSTRAINT "stock_locations_service_zones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."stock_locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."shipping_options_prices" ADD CONSTRAINT "shipping_options_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."shipping_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."shipping_options" ADD CONSTRAINT "shipping_options_stock_location_id_stock_locations_id_fk" FOREIGN KEY ("stock_location_id") REFERENCES "payload"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."shipping_options" ADD CONSTRAINT "shipping_options_shipping_profile_id_shipping_profiles_id_fk" FOREIGN KEY ("shipping_profile_id") REFERENCES "payload"."shipping_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."variant_options" ADD CONSTRAINT "variant_options_variant_type_id_variant_types_id_fk" FOREIGN KEY ("variant_type_id") REFERENCES "payload"."variant_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_returns_fk" FOREIGN KEY ("returns_id") REFERENCES "payload"."returns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "payload"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transactions_fk" FOREIGN KEY ("transactions_id") REFERENCES "payload"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_categories_fk" FOREIGN KEY ("product_categories_id") REFERENCES "payload"."product_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_collections_fk" FOREIGN KEY ("product_collections_id") REFERENCES "payload"."product_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "payload"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variants_fk" FOREIGN KEY ("variants_id") REFERENCES "payload"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "payload"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customer_groups_fk" FOREIGN KEY ("customer_groups_id") REFERENCES "payload"."customer_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_addresses_fk" FOREIGN KEY ("addresses_id") REFERENCES "payload"."addresses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_promotions_fk" FOREIGN KEY ("promotions_id") REFERENCES "payload"."promotions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_campaigns_fk" FOREIGN KEY ("campaigns_id") REFERENCES "payload"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_price_lists_fk" FOREIGN KEY ("price_lists_id") REFERENCES "payload"."price_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_regions_fk" FOREIGN KEY ("regions_id") REFERENCES "payload"."regions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tax_regions_fk" FOREIGN KEY ("tax_regions_id") REFERENCES "payload"."tax_regions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_return_reasons_fk" FOREIGN KEY ("return_reasons_id") REFERENCES "payload"."return_reasons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sales_channels_fk" FOREIGN KEY ("sales_channels_id") REFERENCES "payload"."sales_channels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_types_fk" FOREIGN KEY ("product_types_id") REFERENCES "payload"."product_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_tags_fk" FOREIGN KEY ("product_tags_id") REFERENCES "payload"."product_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_locations_fk" FOREIGN KEY ("stock_locations_id") REFERENCES "payload"."stock_locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shipping_options_fk" FOREIGN KEY ("shipping_options_id") REFERENCES "payload"."shipping_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shipping_profiles_fk" FOREIGN KEY ("shipping_profiles_id") REFERENCES "payload"."shipping_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "payload"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "payload"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."store" ADD CONSTRAINT "store_default_region_id_regions_id_fk" FOREIGN KEY ("default_region_id") REFERENCES "payload"."regions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."store" ADD CONSTRAINT "store_default_sales_channel_id_sales_channels_id_fk" FOREIGN KEY ("default_sales_channel_id") REFERENCES "payload"."sales_channels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."store" ADD CONSTRAINT "store_default_location_id_stock_locations_id_fk" FOREIGN KEY ("default_location_id") REFERENCES "payload"."stock_locations"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "orders_items_order_idx" ON "payload"."orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "payload"."orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_product_idx" ON "payload"."orders_items" USING btree ("product_id");
  CREATE INDEX "orders_items_variant_idx" ON "payload"."orders_items" USING btree ("variant_id");
  CREATE INDEX "orders_fulfillments_order_idx" ON "payload"."orders_fulfillments" USING btree ("_order");
  CREATE INDEX "orders_fulfillments_parent_id_idx" ON "payload"."orders_fulfillments" USING btree ("_parent_id");
  CREATE INDEX "orders_fulfillments_location_idx" ON "payload"."orders_fulfillments" USING btree ("location_id");
  CREATE UNIQUE INDEX "orders_display_id_idx" ON "payload"."orders" USING btree ("display_id");
  CREATE INDEX "orders_customer_idx" ON "payload"."orders" USING btree ("customer_id");
  CREATE INDEX "orders_payment_status_idx" ON "payload"."orders" USING btree ("payment_status");
  CREATE INDEX "orders_fulfillment_status_idx" ON "payload"."orders" USING btree ("fulfillment_status");
  CREATE INDEX "orders_region_idx" ON "payload"."orders" USING btree ("region_id");
  CREATE INDEX "orders_sales_channel_idx" ON "payload"."orders" USING btree ("sales_channel_id");
  CREATE INDEX "orders_shipping_method_shipping_method_option_idx" ON "payload"."orders" USING btree ("shipping_method_option_id");
  CREATE INDEX "orders_updated_at_idx" ON "payload"."orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "payload"."orders" USING btree ("created_at");
  CREATE INDEX "orders_rels_order_idx" ON "payload"."orders_rels" USING btree ("order");
  CREATE INDEX "orders_rels_parent_idx" ON "payload"."orders_rels" USING btree ("parent_id");
  CREATE INDEX "orders_rels_path_idx" ON "payload"."orders_rels" USING btree ("path");
  CREATE INDEX "orders_rels_transactions_id_idx" ON "payload"."orders_rels" USING btree ("transactions_id");
  CREATE INDEX "orders_rels_promotions_id_idx" ON "payload"."orders_rels" USING btree ("promotions_id");
  CREATE INDEX "returns_items_order_idx" ON "payload"."returns_items" USING btree ("_order");
  CREATE INDEX "returns_items_parent_id_idx" ON "payload"."returns_items" USING btree ("_parent_id");
  CREATE INDEX "returns_items_product_idx" ON "payload"."returns_items" USING btree ("product_id");
  CREATE INDEX "returns_items_variant_idx" ON "payload"."returns_items" USING btree ("variant_id");
  CREATE INDEX "returns_items_reason_idx" ON "payload"."returns_items" USING btree ("reason_id");
  CREATE INDEX "returns_order_idx" ON "payload"."returns" USING btree ("order_id");
  CREATE INDEX "returns_customer_idx" ON "payload"."returns" USING btree ("customer_id");
  CREATE INDEX "returns_location_idx" ON "payload"."returns" USING btree ("location_id");
  CREATE INDEX "returns_shipping_option_idx" ON "payload"."returns" USING btree ("shipping_option_id");
  CREATE INDEX "returns_updated_at_idx" ON "payload"."returns" USING btree ("updated_at");
  CREATE INDEX "returns_created_at_idx" ON "payload"."returns" USING btree ("created_at");
  CREATE INDEX "carts_items_order_idx" ON "payload"."carts_items" USING btree ("_order");
  CREATE INDEX "carts_items_parent_id_idx" ON "payload"."carts_items" USING btree ("_parent_id");
  CREATE INDEX "carts_items_product_idx" ON "payload"."carts_items" USING btree ("product_id");
  CREATE INDEX "carts_items_variant_idx" ON "payload"."carts_items" USING btree ("variant_id");
  CREATE INDEX "carts_secret_idx" ON "payload"."carts" USING btree ("secret");
  CREATE INDEX "carts_customer_idx" ON "payload"."carts" USING btree ("customer_id");
  CREATE INDEX "carts_updated_at_idx" ON "payload"."carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "payload"."carts" USING btree ("created_at");
  CREATE INDEX "transactions_items_order_idx" ON "payload"."transactions_items" USING btree ("_order");
  CREATE INDEX "transactions_items_parent_id_idx" ON "payload"."transactions_items" USING btree ("_parent_id");
  CREATE INDEX "transactions_items_product_idx" ON "payload"."transactions_items" USING btree ("product_id");
  CREATE INDEX "transactions_items_variant_idx" ON "payload"."transactions_items" USING btree ("variant_id");
  CREATE INDEX "transactions_customer_idx" ON "payload"."transactions" USING btree ("customer_id");
  CREATE INDEX "transactions_order_idx" ON "payload"."transactions" USING btree ("order_id");
  CREATE INDEX "transactions_cart_idx" ON "payload"."transactions" USING btree ("cart_id");
  CREATE INDEX "transactions_updated_at_idx" ON "payload"."transactions" USING btree ("updated_at");
  CREATE INDEX "transactions_created_at_idx" ON "payload"."transactions" USING btree ("created_at");
  CREATE INDEX "products_thumbnail_idx" ON "payload"."products" USING btree ("thumbnail_id");
  CREATE INDEX "products_type_idx" ON "payload"."products" USING btree ("type_id");
  CREATE INDEX "products_collection_idx" ON "payload"."products" USING btree ("collection_id");
  CREATE INDEX "products_shipping_profile_idx" ON "payload"."products" USING btree ("shipping_profile_id");
  CREATE UNIQUE INDEX "products_handle_idx" ON "payload"."products" USING btree ("handle");
  CREATE INDEX "products_updated_at_idx" ON "payload"."products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "payload"."products" USING btree ("created_at");
  CREATE INDEX "products_deleted_at_idx" ON "payload"."products" USING btree ("deleted_at");
  CREATE INDEX "products__status_idx" ON "payload"."products" USING btree ("_status");
  CREATE INDEX "products_rels_order_idx" ON "payload"."products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "payload"."products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "payload"."products_rels" USING btree ("path");
  CREATE INDEX "products_rels_media_id_idx" ON "payload"."products_rels" USING btree ("media_id");
  CREATE INDEX "products_rels_variant_types_id_idx" ON "payload"."products_rels" USING btree ("variant_types_id");
  CREATE INDEX "products_rels_product_categories_id_idx" ON "payload"."products_rels" USING btree ("product_categories_id");
  CREATE INDEX "products_rels_product_tags_id_idx" ON "payload"."products_rels" USING btree ("product_tags_id");
  CREATE INDEX "products_rels_sales_channels_id_idx" ON "payload"."products_rels" USING btree ("sales_channels_id");
  CREATE INDEX "_products_v_parent_idx" ON "payload"."_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_thumbnail_idx" ON "payload"."_products_v" USING btree ("version_thumbnail_id");
  CREATE INDEX "_products_v_version_version_type_idx" ON "payload"."_products_v" USING btree ("version_type_id");
  CREATE INDEX "_products_v_version_version_collection_idx" ON "payload"."_products_v" USING btree ("version_collection_id");
  CREATE INDEX "_products_v_version_version_shipping_profile_idx" ON "payload"."_products_v" USING btree ("version_shipping_profile_id");
  CREATE INDEX "_products_v_version_version_handle_idx" ON "payload"."_products_v" USING btree ("version_handle");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "payload"."_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "payload"."_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version_deleted_at_idx" ON "payload"."_products_v" USING btree ("version_deleted_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "payload"."_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "payload"."_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "payload"."_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_latest_idx" ON "payload"."_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_autosave_idx" ON "payload"."_products_v" USING btree ("autosave");
  CREATE INDEX "_products_v_rels_order_idx" ON "payload"."_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "payload"."_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "payload"."_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "payload"."_products_v_rels" USING btree ("media_id");
  CREATE INDEX "_products_v_rels_variant_types_id_idx" ON "payload"."_products_v_rels" USING btree ("variant_types_id");
  CREATE INDEX "_products_v_rels_product_categories_id_idx" ON "payload"."_products_v_rels" USING btree ("product_categories_id");
  CREATE INDEX "_products_v_rels_product_tags_id_idx" ON "payload"."_products_v_rels" USING btree ("product_tags_id");
  CREATE INDEX "_products_v_rels_sales_channels_id_idx" ON "payload"."_products_v_rels" USING btree ("sales_channels_id");
  CREATE UNIQUE INDEX "product_categories_handle_idx" ON "payload"."product_categories" USING btree ("handle");
  CREATE INDEX "product_categories_parent_idx" ON "payload"."product_categories" USING btree ("parent_id");
  CREATE INDEX "product_categories_is_active_idx" ON "payload"."product_categories" USING btree ("is_active");
  CREATE INDEX "product_categories_updated_at_idx" ON "payload"."product_categories" USING btree ("updated_at");
  CREATE INDEX "product_categories_created_at_idx" ON "payload"."product_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "product_collections_handle_idx" ON "payload"."product_collections" USING btree ("handle");
  CREATE INDEX "product_collections_updated_at_idx" ON "payload"."product_collections" USING btree ("updated_at");
  CREATE INDEX "product_collections_created_at_idx" ON "payload"."product_collections" USING btree ("created_at");
  CREATE INDEX "variant_types_updated_at_idx" ON "payload"."variant_types" USING btree ("updated_at");
  CREATE INDEX "variant_types_created_at_idx" ON "payload"."variant_types" USING btree ("created_at");
  CREATE INDEX "variant_types_deleted_at_idx" ON "payload"."variant_types" USING btree ("deleted_at");
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "payload"."media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "payload"."media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "payload"."media" USING btree ("sizes_large_filename");
  CREATE INDEX "variants_product_idx" ON "payload"."variants" USING btree ("product_id");
  CREATE UNIQUE INDEX "variants_sku_idx" ON "payload"."variants" USING btree ("sku");
  CREATE INDEX "variants_updated_at_idx" ON "payload"."variants" USING btree ("updated_at");
  CREATE INDEX "variants_created_at_idx" ON "payload"."variants" USING btree ("created_at");
  CREATE INDEX "variants_deleted_at_idx" ON "payload"."variants" USING btree ("deleted_at");
  CREATE INDEX "variants__status_idx" ON "payload"."variants" USING btree ("_status");
  CREATE INDEX "variants_rels_order_idx" ON "payload"."variants_rels" USING btree ("order");
  CREATE INDEX "variants_rels_parent_idx" ON "payload"."variants_rels" USING btree ("parent_id");
  CREATE INDEX "variants_rels_path_idx" ON "payload"."variants_rels" USING btree ("path");
  CREATE INDEX "variants_rels_variant_options_id_idx" ON "payload"."variants_rels" USING btree ("variant_options_id");
  CREATE INDEX "_variants_v_parent_idx" ON "payload"."_variants_v" USING btree ("parent_id");
  CREATE INDEX "_variants_v_version_version_product_idx" ON "payload"."_variants_v" USING btree ("version_product_id");
  CREATE INDEX "_variants_v_version_version_sku_idx" ON "payload"."_variants_v" USING btree ("version_sku");
  CREATE INDEX "_variants_v_version_version_updated_at_idx" ON "payload"."_variants_v" USING btree ("version_updated_at");
  CREATE INDEX "_variants_v_version_version_created_at_idx" ON "payload"."_variants_v" USING btree ("version_created_at");
  CREATE INDEX "_variants_v_version_version_deleted_at_idx" ON "payload"."_variants_v" USING btree ("version_deleted_at");
  CREATE INDEX "_variants_v_version_version__status_idx" ON "payload"."_variants_v" USING btree ("version__status");
  CREATE INDEX "_variants_v_created_at_idx" ON "payload"."_variants_v" USING btree ("created_at");
  CREATE INDEX "_variants_v_updated_at_idx" ON "payload"."_variants_v" USING btree ("updated_at");
  CREATE INDEX "_variants_v_latest_idx" ON "payload"."_variants_v" USING btree ("latest");
  CREATE INDEX "_variants_v_autosave_idx" ON "payload"."_variants_v" USING btree ("autosave");
  CREATE INDEX "_variants_v_rels_order_idx" ON "payload"."_variants_v_rels" USING btree ("order");
  CREATE INDEX "_variants_v_rels_parent_idx" ON "payload"."_variants_v_rels" USING btree ("parent_id");
  CREATE INDEX "_variants_v_rels_path_idx" ON "payload"."_variants_v_rels" USING btree ("path");
  CREATE INDEX "_variants_v_rels_variant_options_id_idx" ON "payload"."_variants_v_rels" USING btree ("variant_options_id");
  CREATE INDEX "customers_sessions_order_idx" ON "payload"."customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "payload"."customers_sessions" USING btree ("_parent_id");
  CREATE INDEX "customers_updated_at_idx" ON "payload"."customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "payload"."customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "payload"."customers" USING btree ("email");
  CREATE INDEX "customers_rels_order_idx" ON "payload"."customers_rels" USING btree ("order");
  CREATE INDEX "customers_rels_parent_idx" ON "payload"."customers_rels" USING btree ("parent_id");
  CREATE INDEX "customers_rels_path_idx" ON "payload"."customers_rels" USING btree ("path");
  CREATE INDEX "customers_rels_customer_groups_id_idx" ON "payload"."customers_rels" USING btree ("customer_groups_id");
  CREATE UNIQUE INDEX "customer_groups_name_idx" ON "payload"."customer_groups" USING btree ("name");
  CREATE INDEX "customer_groups_updated_at_idx" ON "payload"."customer_groups" USING btree ("updated_at");
  CREATE INDEX "customer_groups_created_at_idx" ON "payload"."customer_groups" USING btree ("created_at");
  CREATE INDEX "addresses_customer_idx" ON "payload"."addresses" USING btree ("customer_id");
  CREATE INDEX "addresses_updated_at_idx" ON "payload"."addresses" USING btree ("updated_at");
  CREATE INDEX "addresses_created_at_idx" ON "payload"."addresses" USING btree ("created_at");
  CREATE UNIQUE INDEX "promotions_code_idx" ON "payload"."promotions" USING btree ("code");
  CREATE INDEX "promotions_status_idx" ON "payload"."promotions" USING btree ("status");
  CREATE INDEX "promotions_campaign_idx" ON "payload"."promotions" USING btree ("campaign_id");
  CREATE INDEX "promotions_updated_at_idx" ON "payload"."promotions" USING btree ("updated_at");
  CREATE INDEX "promotions_created_at_idx" ON "payload"."promotions" USING btree ("created_at");
  CREATE INDEX "promotions_rels_order_idx" ON "payload"."promotions_rels" USING btree ("order");
  CREATE INDEX "promotions_rels_parent_idx" ON "payload"."promotions_rels" USING btree ("parent_id");
  CREATE INDEX "promotions_rels_path_idx" ON "payload"."promotions_rels" USING btree ("path");
  CREATE INDEX "promotions_rels_products_id_idx" ON "payload"."promotions_rels" USING btree ("products_id");
  CREATE INDEX "promotions_rels_product_categories_id_idx" ON "payload"."promotions_rels" USING btree ("product_categories_id");
  CREATE INDEX "promotions_rels_product_collections_id_idx" ON "payload"."promotions_rels" USING btree ("product_collections_id");
  CREATE INDEX "promotions_rels_customer_groups_id_idx" ON "payload"."promotions_rels" USING btree ("customer_groups_id");
  CREATE INDEX "promotions_rels_regions_id_idx" ON "payload"."promotions_rels" USING btree ("regions_id");
  CREATE UNIQUE INDEX "campaigns_identifier_idx" ON "payload"."campaigns" USING btree ("identifier");
  CREATE INDEX "campaigns_updated_at_idx" ON "payload"."campaigns" USING btree ("updated_at");
  CREATE INDEX "campaigns_created_at_idx" ON "payload"."campaigns" USING btree ("created_at");
  CREATE INDEX "price_lists_prices_order_idx" ON "payload"."price_lists_prices" USING btree ("_order");
  CREATE INDEX "price_lists_prices_parent_id_idx" ON "payload"."price_lists_prices" USING btree ("_parent_id");
  CREATE INDEX "price_lists_prices_variant_idx" ON "payload"."price_lists_prices" USING btree ("variant_id");
  CREATE INDEX "price_lists_status_idx" ON "payload"."price_lists" USING btree ("status");
  CREATE INDEX "price_lists_updated_at_idx" ON "payload"."price_lists" USING btree ("updated_at");
  CREATE INDEX "price_lists_created_at_idx" ON "payload"."price_lists" USING btree ("created_at");
  CREATE INDEX "price_lists_rels_order_idx" ON "payload"."price_lists_rels" USING btree ("order");
  CREATE INDEX "price_lists_rels_parent_idx" ON "payload"."price_lists_rels" USING btree ("parent_id");
  CREATE INDEX "price_lists_rels_path_idx" ON "payload"."price_lists_rels" USING btree ("path");
  CREATE INDEX "price_lists_rels_customer_groups_id_idx" ON "payload"."price_lists_rels" USING btree ("customer_groups_id");
  CREATE INDEX "users_sessions_order_idx" ON "payload"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE INDEX "regions_countries_order_idx" ON "payload"."regions_countries" USING btree ("order");
  CREATE INDEX "regions_countries_parent_idx" ON "payload"."regions_countries" USING btree ("parent_id");
  CREATE INDEX "regions_payment_providers_order_idx" ON "payload"."regions_payment_providers" USING btree ("order");
  CREATE INDEX "regions_payment_providers_parent_idx" ON "payload"."regions_payment_providers" USING btree ("parent_id");
  CREATE UNIQUE INDEX "regions_name_idx" ON "payload"."regions" USING btree ("name");
  CREATE INDEX "regions_updated_at_idx" ON "payload"."regions" USING btree ("updated_at");
  CREATE INDEX "regions_created_at_idx" ON "payload"."regions" USING btree ("created_at");
  CREATE INDEX "tax_regions_overrides_order_idx" ON "payload"."tax_regions_overrides" USING btree ("_order");
  CREATE INDEX "tax_regions_overrides_parent_id_idx" ON "payload"."tax_regions_overrides" USING btree ("_parent_id");
  CREATE INDEX "tax_regions_country_idx" ON "payload"."tax_regions" USING btree ("country");
  CREATE INDEX "tax_regions_updated_at_idx" ON "payload"."tax_regions" USING btree ("updated_at");
  CREATE INDEX "tax_regions_created_at_idx" ON "payload"."tax_regions" USING btree ("created_at");
  CREATE INDEX "tax_regions_rels_order_idx" ON "payload"."tax_regions_rels" USING btree ("order");
  CREATE INDEX "tax_regions_rels_parent_idx" ON "payload"."tax_regions_rels" USING btree ("parent_id");
  CREATE INDEX "tax_regions_rels_path_idx" ON "payload"."tax_regions_rels" USING btree ("path");
  CREATE INDEX "tax_regions_rels_product_types_id_idx" ON "payload"."tax_regions_rels" USING btree ("product_types_id");
  CREATE UNIQUE INDEX "return_reasons_value_idx" ON "payload"."return_reasons" USING btree ("value");
  CREATE INDEX "return_reasons_updated_at_idx" ON "payload"."return_reasons" USING btree ("updated_at");
  CREATE INDEX "return_reasons_created_at_idx" ON "payload"."return_reasons" USING btree ("created_at");
  CREATE UNIQUE INDEX "sales_channels_name_idx" ON "payload"."sales_channels" USING btree ("name");
  CREATE INDEX "sales_channels_updated_at_idx" ON "payload"."sales_channels" USING btree ("updated_at");
  CREATE INDEX "sales_channels_created_at_idx" ON "payload"."sales_channels" USING btree ("created_at");
  CREATE INDEX "sales_channels_rels_order_idx" ON "payload"."sales_channels_rels" USING btree ("order");
  CREATE INDEX "sales_channels_rels_parent_idx" ON "payload"."sales_channels_rels" USING btree ("parent_id");
  CREATE INDEX "sales_channels_rels_path_idx" ON "payload"."sales_channels_rels" USING btree ("path");
  CREATE INDEX "sales_channels_rels_stock_locations_id_idx" ON "payload"."sales_channels_rels" USING btree ("stock_locations_id");
  CREATE UNIQUE INDEX "product_types_value_idx" ON "payload"."product_types" USING btree ("value");
  CREATE INDEX "product_types_updated_at_idx" ON "payload"."product_types" USING btree ("updated_at");
  CREATE INDEX "product_types_created_at_idx" ON "payload"."product_types" USING btree ("created_at");
  CREATE UNIQUE INDEX "product_tags_value_idx" ON "payload"."product_tags" USING btree ("value");
  CREATE INDEX "product_tags_updated_at_idx" ON "payload"."product_tags" USING btree ("updated_at");
  CREATE INDEX "product_tags_created_at_idx" ON "payload"."product_tags" USING btree ("created_at");
  CREATE INDEX "stock_locations_service_zones_countries_order_idx" ON "payload"."stock_locations_service_zones_countries" USING btree ("order");
  CREATE INDEX "stock_locations_service_zones_countries_parent_idx" ON "payload"."stock_locations_service_zones_countries" USING btree ("parent_id");
  CREATE INDEX "stock_locations_service_zones_order_idx" ON "payload"."stock_locations_service_zones" USING btree ("_order");
  CREATE INDEX "stock_locations_service_zones_parent_id_idx" ON "payload"."stock_locations_service_zones" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "stock_locations_name_idx" ON "payload"."stock_locations" USING btree ("name");
  CREATE INDEX "stock_locations_updated_at_idx" ON "payload"."stock_locations" USING btree ("updated_at");
  CREATE INDEX "stock_locations_created_at_idx" ON "payload"."stock_locations" USING btree ("created_at");
  CREATE INDEX "shipping_options_prices_order_idx" ON "payload"."shipping_options_prices" USING btree ("_order");
  CREATE INDEX "shipping_options_prices_parent_id_idx" ON "payload"."shipping_options_prices" USING btree ("_parent_id");
  CREATE INDEX "shipping_options_stock_location_idx" ON "payload"."shipping_options" USING btree ("stock_location_id");
  CREATE INDEX "shipping_options_shipping_profile_idx" ON "payload"."shipping_options" USING btree ("shipping_profile_id");
  CREATE INDEX "shipping_options_enabled_idx" ON "payload"."shipping_options" USING btree ("enabled");
  CREATE INDEX "shipping_options_updated_at_idx" ON "payload"."shipping_options" USING btree ("updated_at");
  CREATE INDEX "shipping_options_created_at_idx" ON "payload"."shipping_options" USING btree ("created_at");
  CREATE UNIQUE INDEX "shipping_profiles_name_idx" ON "payload"."shipping_profiles" USING btree ("name");
  CREATE INDEX "shipping_profiles_updated_at_idx" ON "payload"."shipping_profiles" USING btree ("updated_at");
  CREATE INDEX "shipping_profiles_created_at_idx" ON "payload"."shipping_profiles" USING btree ("created_at");
  CREATE INDEX "variant_options__variantoptions_options_order_idx" ON "payload"."variant_options" USING btree ("_variantoptions_options_order");
  CREATE INDEX "variant_options_variant_type_idx" ON "payload"."variant_options" USING btree ("variant_type_id");
  CREATE INDEX "variant_options_updated_at_idx" ON "payload"."variant_options" USING btree ("updated_at");
  CREATE INDEX "variant_options_created_at_idx" ON "payload"."variant_options" USING btree ("created_at");
  CREATE INDEX "variant_options_deleted_at_idx" ON "payload"."variant_options" USING btree ("deleted_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_returns_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("returns_id");
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("carts_id");
  CREATE INDEX "payload_locked_documents_rels_transactions_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("transactions_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_product_categories_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("product_categories_id");
  CREATE INDEX "payload_locked_documents_rels_product_collections_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("product_collections_id");
  CREATE INDEX "payload_locked_documents_rels_variant_types_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("variant_types_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_variants_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("variants_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_customer_groups_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("customer_groups_id");
  CREATE INDEX "payload_locked_documents_rels_addresses_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("addresses_id");
  CREATE INDEX "payload_locked_documents_rels_promotions_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("promotions_id");
  CREATE INDEX "payload_locked_documents_rels_campaigns_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("campaigns_id");
  CREATE INDEX "payload_locked_documents_rels_price_lists_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("price_lists_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_regions_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("regions_id");
  CREATE INDEX "payload_locked_documents_rels_tax_regions_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("tax_regions_id");
  CREATE INDEX "payload_locked_documents_rels_return_reasons_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("return_reasons_id");
  CREATE INDEX "payload_locked_documents_rels_sales_channels_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("sales_channels_id");
  CREATE INDEX "payload_locked_documents_rels_product_types_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("product_types_id");
  CREATE INDEX "payload_locked_documents_rels_product_tags_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("product_tags_id");
  CREATE INDEX "payload_locked_documents_rels_stock_locations_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("stock_locations_id");
  CREATE INDEX "payload_locked_documents_rels_shipping_options_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("shipping_options_id");
  CREATE INDEX "payload_locked_documents_rels_shipping_profiles_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("shipping_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_variant_options_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("variant_options_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload"."payload_preferences_rels" USING btree ("customers_id");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");
  CREATE INDEX "store_default_region_idx" ON "payload"."store" USING btree ("default_region_id");
  CREATE INDEX "store_default_sales_channel_idx" ON "payload"."store" USING btree ("default_sales_channel_id");
  CREATE INDEX "store_default_location_idx" ON "payload"."store" USING btree ("default_location_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."orders_items" CASCADE;
  DROP TABLE "payload"."orders_fulfillments" CASCADE;
  DROP TABLE "payload"."orders" CASCADE;
  DROP TABLE "payload"."orders_rels" CASCADE;
  DROP TABLE "payload"."returns_items" CASCADE;
  DROP TABLE "payload"."returns" CASCADE;
  DROP TABLE "payload"."carts_items" CASCADE;
  DROP TABLE "payload"."carts" CASCADE;
  DROP TABLE "payload"."transactions_items" CASCADE;
  DROP TABLE "payload"."transactions" CASCADE;
  DROP TABLE "payload"."products" CASCADE;
  DROP TABLE "payload"."products_rels" CASCADE;
  DROP TABLE "payload"."_products_v" CASCADE;
  DROP TABLE "payload"."_products_v_rels" CASCADE;
  DROP TABLE "payload"."product_categories" CASCADE;
  DROP TABLE "payload"."product_collections" CASCADE;
  DROP TABLE "payload"."variant_types" CASCADE;
  DROP TABLE "payload"."media" CASCADE;
  DROP TABLE "payload"."variants" CASCADE;
  DROP TABLE "payload"."variants_rels" CASCADE;
  DROP TABLE "payload"."_variants_v" CASCADE;
  DROP TABLE "payload"."_variants_v_rels" CASCADE;
  DROP TABLE "payload"."customers_sessions" CASCADE;
  DROP TABLE "payload"."customers" CASCADE;
  DROP TABLE "payload"."customers_rels" CASCADE;
  DROP TABLE "payload"."customer_groups" CASCADE;
  DROP TABLE "payload"."addresses" CASCADE;
  DROP TABLE "payload"."promotions" CASCADE;
  DROP TABLE "payload"."promotions_rels" CASCADE;
  DROP TABLE "payload"."campaigns" CASCADE;
  DROP TABLE "payload"."price_lists_prices" CASCADE;
  DROP TABLE "payload"."price_lists" CASCADE;
  DROP TABLE "payload"."price_lists_rels" CASCADE;
  DROP TABLE "payload"."users_sessions" CASCADE;
  DROP TABLE "payload"."users" CASCADE;
  DROP TABLE "payload"."regions_countries" CASCADE;
  DROP TABLE "payload"."regions_payment_providers" CASCADE;
  DROP TABLE "payload"."regions" CASCADE;
  DROP TABLE "payload"."tax_regions_overrides" CASCADE;
  DROP TABLE "payload"."tax_regions" CASCADE;
  DROP TABLE "payload"."tax_regions_rels" CASCADE;
  DROP TABLE "payload"."return_reasons" CASCADE;
  DROP TABLE "payload"."sales_channels" CASCADE;
  DROP TABLE "payload"."sales_channels_rels" CASCADE;
  DROP TABLE "payload"."product_types" CASCADE;
  DROP TABLE "payload"."product_tags" CASCADE;
  DROP TABLE "payload"."stock_locations_service_zones_countries" CASCADE;
  DROP TABLE "payload"."stock_locations_service_zones" CASCADE;
  DROP TABLE "payload"."stock_locations" CASCADE;
  DROP TABLE "payload"."shipping_options_prices" CASCADE;
  DROP TABLE "payload"."shipping_options" CASCADE;
  DROP TABLE "payload"."shipping_profiles" CASCADE;
  DROP TABLE "payload"."variant_options" CASCADE;
  DROP TABLE "payload"."payload_kv" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;
  DROP TABLE "payload"."store" CASCADE;
  DROP TYPE "payload"."enum_orders_status";
  DROP TYPE "payload"."enum_orders_currency";
  DROP TYPE "payload"."enum_orders_payment_status";
  DROP TYPE "payload"."enum_orders_fulfillment_status";
  DROP TYPE "payload"."enum_returns_status";
  DROP TYPE "payload"."enum_returns_currency";
  DROP TYPE "payload"."enum_carts_currency";
  DROP TYPE "payload"."enum_transactions_status";
  DROP TYPE "payload"."enum_transactions_currency";
  DROP TYPE "payload"."enum_products_origin_country";
  DROP TYPE "payload"."enum_products_status";
  DROP TYPE "payload"."enum__products_v_version_origin_country";
  DROP TYPE "payload"."enum__products_v_version_status";
  DROP TYPE "payload"."enum_variants_status";
  DROP TYPE "payload"."enum__variants_v_version_status";
  DROP TYPE "payload"."enum_addresses_country";
  DROP TYPE "payload"."enum_promotions_type";
  DROP TYPE "payload"."enum_promotions_status";
  DROP TYPE "payload"."enum_promotions_application_method_type";
  DROP TYPE "payload"."enum_promotions_application_method_currency";
  DROP TYPE "payload"."enum_promotions_application_method_target_type";
  DROP TYPE "payload"."enum_promotions_application_method_allocation";
  DROP TYPE "payload"."enum_promotions_rules_currency";
  DROP TYPE "payload"."enum_campaigns_budget_type";
  DROP TYPE "payload"."enum_campaigns_budget_currency";
  DROP TYPE "payload"."enum_price_lists_prices_currency";
  DROP TYPE "payload"."enum_price_lists_type";
  DROP TYPE "payload"."enum_price_lists_status";
  DROP TYPE "payload"."enum_users_role";
  DROP TYPE "payload"."enum_regions_countries";
  DROP TYPE "payload"."enum_regions_payment_providers";
  DROP TYPE "payload"."enum_regions_currency";
  DROP TYPE "payload"."enum_tax_regions_country";
  DROP TYPE "payload"."enum_stock_locations_service_zones_countries";
  DROP TYPE "payload"."enum_stock_locations_address_country";
  DROP TYPE "payload"."enum_shipping_options_prices_currency";
  DROP TYPE "payload"."enum_shipping_options_price_type";
  DROP TYPE "payload"."enum_shipping_profiles_type";
  DROP TYPE "payload"."enum_store_default_currency";`)
}
