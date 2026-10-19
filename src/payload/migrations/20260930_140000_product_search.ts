import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Storefront product search on Supabase's `public.products`:
 * Postgres full-text search for relevance, pg_trgm for typo tolerance.
 *
 * - `search_vector`: a stored generated tsvector, weighted name (A) >
 *   category (B) > description (C), so it can never drift from the row.
 *   Name and category are also indexed with hyphens removed, so "tshirt"
 *   and "t-shirt" both find "T-Shirt" / "t-shirts".
 * - GIN indexes on it and on `name` (trigram), partial on `published` like
 *   the existing category index, since only published rows are ever read.
 * - `public.search_products(search_term, result_limit)`, called through the
 *   Data API (`/rest/v1/rpc/search_products`):
 *     - every word is prefix-matched, so "sweat" finds "Sweatshirt" and
 *       "polo shirt" needs both words; hyphenated words are joined, and
 *       one-letter words are ignored (a lone "t" would match everything);
 *     - only when that finds nothing, trigram word similarity on the name
 *       catches typos ("sweatshrit"), so fuzzy hits never crowd out exact
 *       ones;
 *     - ordered by full-text rank plus name similarity.
 *   SECURITY INVOKER, so the table's RLS ("published only") still applies;
 *   empty search_path with qualified names (Supabase security checklist).
 *
 * Skipped where public.products doesn't exist (a plain local Postgres).
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const { rows } = await db.execute(
    sql`select to_regclass('public.products') is not null as present`,
  )
  if (!(rows[0] as { present: boolean } | undefined)?.present) return

  await db.execute(sql`
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    setweight(
      to_tsvector('english'::regconfig, coalesce(name, '')) ||
      to_tsvector('english'::regconfig, replace(coalesce(name, ''), '-', '')),
      'A') ||
    setweight(
      to_tsvector('english'::regconfig, replace(coalesce(category, ''), '-', ' ')) ||
      to_tsvector('english'::regconfig, replace(coalesce(category, ''), '-', '')),
      'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(description, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS products_search_idx
  ON public.products USING gin (search_vector) WHERE published;

CREATE INDEX IF NOT EXISTS products_name_trgm_idx
  ON public.products USING gin (name extensions.gin_trgm_ops) WHERE published;

CREATE OR REPLACE FUNCTION public.search_products(
  search_term text,
  result_limit integer DEFAULT 48
) RETURNS SETOF public.products
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
-- Minimum word similarity for a typo match (pg_trgm's default is 0.6).
SET pg_trgm.word_similarity_threshold = 0.4
AS $fn$
  WITH input AS (
    SELECT left(btrim(coalesce(search_term, '')), 80) AS term
  ),
  -- Whitespace-separated words, punctuation removed ("t-shirt" -> "tshirt").
  -- Only letters and digits remain, so the tsquery syntax below is safe.
  words AS (
    SELECT regexp_replace(token, '[^[:alnum:]]+', '', 'g') AS word
    FROM input AS i, regexp_split_to_table(lower(i.term), '[[:space:]]+') AS token
  ),
  query AS (
    SELECT
      i.term,
      -- 'word':* & 'word':* ... from at most 8 words of 2+ characters.
      (
        SELECT to_tsquery('english', string_agg(quote_literal(w.word) || ':*', ' & '))
        FROM (SELECT word FROM words WHERE length(word) >= 2 LIMIT 8) AS w
      ) AS tsq
    FROM input AS i
    WHERE length(i.term) >= 2
  ),
  matches AS (
    SELECT
      p.id,
      ts_rank_cd(p.search_vector, q.tsq) + extensions.word_similarity(q.term, p.name) AS score
    FROM public.products AS p, query AS q
    WHERE p.published AND p.search_vector @@ q.tsq
  ),
  fuzzy AS (
    SELECT p.id, extensions.word_similarity(q.term, p.name) AS score
    FROM public.products AS p, query AS q
    WHERE p.published
      AND q.term OPERATOR(extensions.<%) p.name
      AND NOT EXISTS (SELECT 1 FROM matches)
  ),
  ranked AS (
    SELECT id, score FROM matches
    UNION ALL
    SELECT id, score FROM fuzzy
  )
  SELECT p.*
  FROM ranked AS r
  JOIN public.products AS p ON p.id = r.id
  ORDER BY r.score DESC, p.sort_order, p.created_at DESC
  LIMIT least(greatest(coalesce(result_limit, 48), 1), 100);
$fn$;

REVOKE ALL ON FUNCTION public.search_products(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_products(text, integer) TO anon, authenticated;

-- Let the Data API see the new function right away.
NOTIFY pgrst, 'reload schema';
`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
DROP FUNCTION IF EXISTS public.search_products(text, integer);
DROP INDEX IF EXISTS public.products_name_trgm_idx;
DROP INDEX IF EXISTS public.products_search_idx;
ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS search_vector;
`)
}
