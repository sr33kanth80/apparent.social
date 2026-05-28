-- Persistent upvote count column on every launch
alter table public.product_launches
  add column if not exists upvote_count integer not null default 0;

-- One row per (user, launch) — the source of truth for whether a user has upvoted
create table if not exists public.launch_upvotes (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  launch_id uuid not null references public.product_launches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, launch_id)
);

create index if not exists launch_upvotes_launch_idx on public.launch_upvotes (launch_id);

-- Trigger that keeps product_launches.upvote_count in sync
create or replace function public.update_launch_upvote_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.product_launches
      set upvote_count = upvote_count + 1
      where id = new.launch_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.product_launches
      set upvote_count = greatest(0, upvote_count - 1)
      where id = old.launch_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists launch_upvotes_count_trigger on public.launch_upvotes;
create trigger launch_upvotes_count_trigger
  after insert or delete on public.launch_upvotes
  for each row execute function public.update_launch_upvote_count();

-- Comments per launch
create table if not exists public.launch_comments (
  id        uuid primary key default gen_random_uuid(),
  launch_id uuid not null references public.product_launches(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  body      text not null,
  created_at timestamptz not null default now()
);

create index if not exists launch_comments_launch_created_idx
  on public.launch_comments (launch_id, created_at desc);

-- RLS

alter table public.launch_upvotes enable row level security;
alter table public.launch_comments enable row level security;

drop policy if exists "launch upvotes public reads" on public.launch_upvotes;
create policy "launch upvotes public reads" on public.launch_upvotes
  for select using (true);

drop policy if exists "launch upvotes own writes" on public.launch_upvotes;
create policy "launch upvotes own writes" on public.launch_upvotes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "launch comments public reads" on public.launch_comments;
create policy "launch comments public reads" on public.launch_comments
  for select using (true);

drop policy if exists "launch comments own writes" on public.launch_comments;
create policy "launch comments own writes" on public.launch_comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.launch_upvotes to anon, authenticated;
grant insert, delete on public.launch_upvotes to authenticated;

grant select on public.launch_comments to anon, authenticated;
grant insert, delete on public.launch_comments to authenticated;
