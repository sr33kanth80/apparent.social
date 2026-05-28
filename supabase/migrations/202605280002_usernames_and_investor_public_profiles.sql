-- ─────────────────────────────────────────────────────────────────────────────
-- usernames  +  investor public-profile controls
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add username column to profiles
alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_idx
  on public.profiles (lower(username))
  where username is not null and username <> '';

-- Auto-generate a unique username from the email prefix on every INSERT.
-- On UPDATE the column is left untouched (users can change it later).
create or replace function public.set_profile_username()
returns trigger
language plpgsql
as $$
declare
  base_name text;
  candidate  text;
  suffix     int := 1;
begin
  -- Already provided — keep it.
  if new.username is not null and new.username <> '' then
    return new;
  end if;

  -- Derive from email: keep lowercase a-z0-9, strip everything else.
  base_name := lower(regexp_replace(
    split_part(coalesce(new.email, ''), '@', 1),
    '[^a-z0-9]', '', 'g'
  ));

  -- Fallback when email prefix is too short / empty.
  if length(base_name) < 2 then
    new.username := 'user' || substring(replace(new.id::text, '-', ''), 1, 8);
    return new;
  end if;

  candidate := base_name;
  loop
    if not exists (
      select 1 from public.profiles
      where lower(username) = lower(candidate)
        and id <> new.id
    ) then
      new.username := candidate;
      return new;
    end if;
    candidate := base_name || suffix::text;
    suffix := suffix + 1;
    exit when suffix > 999;
  end loop;

  -- Last resort: base + first 6 hex chars of UUID
  new.username := base_name || substring(replace(new.id::text, '-', ''), 1, 6);
  return new;
end;
$$;

drop trigger if exists profiles_auto_username on public.profiles;
create trigger profiles_auto_username
  before insert on public.profiles
  for each row execute function public.set_profile_username();

-- 2. Investor public-profile controls
alter table public.investor_criteria
  add column if not exists public_profile_enabled boolean not null default false,
  add column if not exists public_fields text[] not null
    default array['thesis','sectors','stage','geography'];

-- 3. RLS ──────────────────────────────────────────────────────────────────────

-- profiles: readable by everyone so /@username lookup works for logged-out visitors
drop policy if exists "profiles public reads" on public.profiles;
create policy "profiles public reads" on public.profiles
  for select using (true);

-- investor_criteria: always readable by the owner (already covered by "own rows"),
-- AND by any authenticated platform member, AND publicly if public_profile_enabled.
drop policy if exists "investor criteria platform reads" on public.investor_criteria;
create policy "investor criteria platform reads" on public.investor_criteria
  for select using (
    public_profile_enabled = true          -- open internet
    or auth.role() = 'authenticated'       -- logged-in platform members
    or auth.uid() = user_id                -- own row (belt-and-suspenders)
  );

-- 4. Grants ───────────────────────────────────────────────────────────────────
grant select on public.profiles to anon, authenticated;
