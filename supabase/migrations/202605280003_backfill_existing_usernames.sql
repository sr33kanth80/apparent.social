-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill usernames for profiles rows that existed before the INSERT trigger
-- was added in 202605280002.  The trigger only fires on INSERT, so any account
-- created before that migration has username = NULL and would be invisible at
-- the /@handle routes.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r         RECORD;
  base_name text;
  candidate text;
  suffix    int;
BEGIN
  FOR r IN
    SELECT id, email
    FROM   public.profiles
    WHERE  username IS NULL OR username = ''
    ORDER  BY created_at   -- oldest first so earlier signups keep the plain handle
  LOOP
    -- Derive the base handle from the email prefix (mirrors the trigger logic).
    base_name := lower(regexp_replace(
      split_part(coalesce(r.email, ''), '@', 1),
      '[^a-z0-9]', '', 'g'
    ));

    -- Fallback when prefix is empty / too short.
    IF length(base_name) < 2 THEN
      UPDATE public.profiles
      SET    username = 'user' || substring(replace(r.id::text, '-', ''), 1, 8)
      WHERE  id = r.id;
      CONTINUE;
    END IF;

    -- Walk candidates until a free slot is found.
    candidate := base_name;
    suffix    := 1;
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE  lower(username) = lower(candidate)
          AND  id <> r.id
      ) THEN
        UPDATE public.profiles SET username = candidate WHERE id = r.id;
        EXIT;
      END IF;
      candidate := base_name || suffix::text;
      suffix    := suffix + 1;
      EXIT WHEN suffix > 999;
    END LOOP;

    -- Last resort: base + first 6 hex chars of UUID (same as trigger).
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = r.id AND (username IS NOT NULL AND username <> '')
    ) THEN
      UPDATE public.profiles
      SET    username = base_name || substring(replace(r.id::text, '-', ''), 1, 6)
      WHERE  id = r.id;
    END IF;
  END LOOP;
END;
$$;
