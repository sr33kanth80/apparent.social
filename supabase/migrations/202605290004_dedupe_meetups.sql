-- Remove duplicate meetups (same title/city/venue) — seed meetups were inserted
-- more than once (no unique constraint, so on-conflict-do-nothing never matched).
-- Keep the oldest row of each; cascades drop any RSVPs on the removed duplicates.
delete from public.meetups m
using (
  select id,
         row_number() over (partition by title, city, venue order by created_at, id) as rn
  from public.meetups
) dups
where m.id = dups.id
  and dups.rn > 1;
