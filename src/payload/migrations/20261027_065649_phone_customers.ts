import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { up as restoreEmailOnlySync } from './20260929_113100_sync_supabase_customers'

/*
 * Phone OTP sign-ups: customers may now have no email, and the auth.users
 * sync (see `sync_supabase_customers`) also mirrors phone-only accounts,
 * storing the number as "+91 9876543210" like the storefront does.
 *
 * The sync function gains a phone parameter, so it is recreated with the new
 * signature and the old one dropped. Same safety rules as before: unexposed
 * schema, empty search_path, EXECUTE revoked, errors never block sign-in.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
ALTER TABLE "payload"."customers" ALTER COLUMN "email" DROP NOT NULL;

CREATE OR REPLACE FUNCTION payload.sync_customer_from_auth_user(
  p_id uuid,
  p_email text,
  p_phone text,
  p_provider text,
  p_email_confirmed_at timestamptz,
  p_last_sign_in_at timestamptz,
  p_user_meta jsonb,
  p_created_at timestamptz
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_name text := nullif(btrim(coalesce(p_user_meta->>'full_name', p_user_meta->>'name', '')), '');
  v_first text := nullif(split_part(coalesce(v_name, ''), ' ', 1), '');
  v_last text := nullif(btrim(substr(coalesce(v_name, ''), length(coalesce(v_first, '')) + 1)), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_digits text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
  v_phone text := CASE
    WHEN v_digits IS NULL THEN NULL
    WHEN v_digits ~ '^91[0-9]{10}$' THEN '+91 ' || substr(v_digits, 3)
    ELSE '+' || v_digits
  END;
BEGIN
  IF v_email IS NULL AND v_phone IS NULL THEN
    RETURN;
  END IF;

  UPDATE payload.customers AS c
  SET supabase_user_id = p_id::text,
      email = coalesce(v_email, c.email),
      phone = coalesce(c.phone, v_phone),
      first_name = coalesce(c.first_name, v_first),
      last_name = coalesce(c.last_name, v_last),
      supabase_provider = p_provider,
      supabase_email_confirmed_at = p_email_confirmed_at,
      supabase_last_sign_in_at = p_last_sign_in_at,
      updated_at = now()
  WHERE c.supabase_user_id = p_id::text
     OR (c.supabase_user_id IS NULL AND v_email IS NOT NULL AND lower(c.email) = v_email);

  IF NOT FOUND THEN
    INSERT INTO payload.customers (
      email, phone, first_name, last_name,
      supabase_user_id, supabase_provider,
      supabase_email_confirmed_at, supabase_last_sign_in_at,
      created_at, updated_at
    ) VALUES (
      v_email, v_phone, v_first, v_last,
      p_id::text, p_provider,
      p_email_confirmed_at, p_last_sign_in_at,
      coalesce(p_created_at, now()), now()
    );
  END IF;
END
$fn$;

CREATE OR REPLACE FUNCTION payload.on_auth_user_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE payload.customers
    SET supabase_user_id = NULL, updated_at = now()
    WHERE supabase_user_id = OLD.id::text;
    RETURN OLD;
  END IF;

  PERFORM payload.sync_customer_from_auth_user(
    NEW.id, NEW.email, NEW.phone, NEW.raw_app_meta_data->>'provider',
    NEW.email_confirmed_at, NEW.last_sign_in_at,
    NEW.raw_user_meta_data, NEW.created_at
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Payload customer sync failed for auth user %: %',
    coalesce(NEW.id, OLD.id), SQLERRM;
  RETURN coalesce(NEW, OLD);
END
$fn$;

DROP FUNCTION IF EXISTS payload.sync_customer_from_auth_user(uuid, text, text, timestamptz, timestamptz, jsonb, timestamptz);

REVOKE ALL ON FUNCTION payload.sync_customer_from_auth_user(uuid, text, text, text, timestamptz, timestamptz, jsonb, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION payload.on_auth_user_change() FROM PUBLIC;

DO $do$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE 'auth.users not found; Supabase customer sync not installed.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION payload.sync_customer_from_auth_user(uuid, text, text, text, timestamptz, timestamptz, jsonb, timestamptz) FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION payload.on_auth_user_change() FROM anon, authenticated';
  END IF;

  -- Also fire when a phone number is added or confirmed.
  EXECUTE 'DROP TRIGGER IF EXISTS payload_sync_customer ON auth.users';
  EXECUTE 'CREATE TRIGGER payload_sync_customer
    AFTER INSERT OR UPDATE OF email, email_confirmed_at, phone, phone_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data
    ON auth.users
    FOR EACH ROW EXECUTE FUNCTION payload.on_auth_user_change()';

  -- Backfill phone-only accounts that existed before this migration.
  EXECUTE 'SELECT payload.sync_customer_from_auth_user(
      u.id, u.email, u.phone, u.raw_app_meta_data->>''provider'',
      u.email_confirmed_at, u.last_sign_in_at,
      u.raw_user_meta_data, u.created_at)
    FROM auth.users AS u
    WHERE u.email IS NULL AND u.phone IS NOT NULL';
END
$do$;
`)
}

/** Fails while phone-only customers exist; remove or give them an email first. */
export async function down(args: MigrateDownArgs): Promise<void> {
  await restoreEmailOnlySync(args as unknown as MigrateUpArgs)
  await args.db.execute(sql`
DROP FUNCTION IF EXISTS payload.sync_customer_from_auth_user(uuid, text, text, text, timestamptz, timestamptz, jsonb, timestamptz);
ALTER TABLE "payload"."customers" ALTER COLUMN "email" SET NOT NULL;`)
}
