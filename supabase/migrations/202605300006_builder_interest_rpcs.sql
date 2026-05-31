-- Growth loop for ingested (scraped) builders: let a not-yet-claimed builder
-- see how many investors are interested, and attach that interest to their
-- account when they claim their profile.

-- Public, PII-free count of interest for a builder id (no investor identities).
create or replace function public.builder_interest_summary(p_builder_id text)
returns table (likes integer, superlikes integer)
language sql
security definer
set search_path = public
as $$
  select
    count(*) filter (where kind = 'like')::int as likes,
    count(*) filter (where kind = 'superlike')::int as superlikes
  from public.vc_interest
  where builder_id = p_builder_id;
$$;

grant execute on function public.builder_interest_summary(text) to anon, authenticated;

-- When a builder claims their ingested signal, link the interest expressed in
-- that builder_id to their freshly-created account so it shows up in their inbox.
create or replace function public.claim_builder_interest(p_builder_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  linked integer;
begin
  if auth.uid() is null then
    return 0;
  end if;

  update public.vc_interest
    set builder_user_id = auth.uid(), updated_at = now()
    where builder_id = p_builder_id and builder_user_id is null;

  get diagnostics linked = row_count;
  return linked;
end;
$$;

grant execute on function public.claim_builder_interest(text) to authenticated;
