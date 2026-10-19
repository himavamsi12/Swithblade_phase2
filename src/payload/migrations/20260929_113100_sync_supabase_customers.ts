import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Mirrors Supabase Auth users into Payload's customers.
 *
 * A trigger on auth.users creates or updates the matching customer whenever a
 * shopper signs up (email or Google), confirms their email, signs in or
 * changes email, including accounts created in the Supabase dashboard. An
 * existing customer with the same email is linked instead of duplicated.
 * Deleting a Supabase user unlinks the customer but keeps it (order history).
 *
 * Safety (Supabase security checklist):
 * - Functions live in the unexposed `payload` schema with an empty
 *   search_path and fully qualified names.
 * - SECURITY DEFINER is needed because Supabase Auth writes auth.users as
 *   supabase_auth_admin, which has no rights on `payload`. EXECUTE is revoked
 *   from PUBLIC/anon/authenticated so it can't be called through the API.
 * - Any sync error is logged as a warning and swallowed: it can never block a
 *   sign-up or sign-in.
 *
 * Skipped where auth.users doesn't exist (a plain local Postgres).
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
CREATE OR REPLACE FUNCTION payload.sync_customer_from_auth_user(
  p_id uuid,
  p_email text,
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
BEGIN
  IF p_email IS NULL THEN
    RETURN; -- phone-only accounts have no email to key a customer on
  END IF;

  UPDATE payload.customers AS c
  SET supabase_user_id = p_id::text,
      email = lower(p_email),
      first_name = coalesce(c.first_name, v_first),
      last_name = coalesce(c.last_name, v_last),
      supabase_provider = p_provider,
      supabase_email_confirmed_at = p_email_confirmed_at,
      supabase_last_sign_in_at = p_last_sign_in_at,
      updated_at = now()
  WHERE c.supabase_user_id = p_id::text
     OR (c.supabase_user_id IS NULL AND lower(c.email) = lower(p_email));

  IF NOT FOUND THEN
    INSERT INTO payload.customers (
      email, first_name, last_name,
      supabase_user_id, supabase_provider,
      supabase_email_confirmed_at, supabase_last_sign_in_at,
      created_at, updated_at
    ) VALUES (
      lower(p_email), v_first, v_last,
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
    NEW.id, NEW.email, NEW.raw_app_meta_data->>'provider',
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

REVOKE ALL ON FUNCTION payload.sync_customer_from_auth_user(uuid, text, text, timestamptz, timestamptz, jsonb, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION payload.on_auth_user_change() FROM PUBLIC;

DO $do$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE 'auth.users not found; Supabase customer sync not installed.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION payload.sync_customer_from_auth_user(uuid, text, text, timestamptz, timestamptz, jsonb, timestamptz) FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION payload.on_auth_user_change() FROM anon, authenticated';
  END IF;

  EXECUTE 'DROP TRIGGER IF EXISTS payload_sync_customer ON auth.users';
  EXECUTE 'CREATE TRIGGER payload_sync_customer
    AFTER INSERT OR UPDATE OF email, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data
    ON auth.users
    FOR EACH ROW EXECUTE FUNCTION payload.on_auth_user_change()';

  EXECUTE 'DROP TRIGGER IF EXISTS payload_unlink_customer ON auth.users';
  EXECUTE 'CREATE TRIGGER payload_unlink_customer
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION payload.on_auth_user_change()';

  -- Backfill accounts that existed before the trigger.
  EXECUTE 'SELECT payload.sync_customer_from_auth_user(
      u.id, u.email, u.raw_app_meta_data->>''provider'',
      u.email_confirmed_at, u.last_sign_in_at,
      u.raw_user_meta_data, u.created_at)
    FROM auth.users AS u';
END
$do$;
`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
DO $do$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS payload_sync_customer ON auth.users';
    EXECUTE 'DROP TRIGGER IF EXISTS payload_unlink_customer ON auth.users';
  END IF;
END
$do$;
DROP FUNCTION IF EXISTS payload.on_auth_user_change();
DROP FUNCTION IF EXISTS payload.sync_customer_from_auth_user(uuid, text, text, timestamptz, timestamptz, jsonb, timestamptz);
`)
}
