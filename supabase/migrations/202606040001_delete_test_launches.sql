-- Delete test/seed product launches created during development.
-- TrueScreen appears twice (created twice during testing).
-- Briefwise and the seeded Apparent launch are also dev records.
-- All launched from swiftapplyai@gmail.com — safe to wipe before public launch.

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from public.profiles
  where lower(email) = 'swiftapplyai@gmail.com'
  limit 1;

  if v_user_id is null then
    raise notice 'User not found — skipping.';
    return;
  end if;

  -- Delete team members first (FK constraint).
  delete from public.launch_team_members
  where owner_id = v_user_id
    and launch_id in (
      select id from public.product_launches
      where owner_id = v_user_id
        and name in ('TrueScreen', 'TrueScreen HQ', 'Briefwise', 'Apparent')
    );

  -- Delete the launches themselves.
  delete from public.product_launches
  where owner_id = v_user_id
    and name in ('TrueScreen', 'TrueScreen HQ', 'Briefwise', 'Apparent');

  raise notice 'Deleted test launches for user %', v_user_id;
end $$;
