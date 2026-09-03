-- Repair companies that claim a resolved office but sit on the city centroid.
--
-- Discovery only knows a company's CITY, so it wrote the city centroid for
-- every row it touched. Because geo_precision was not part of that write, rows
-- that HAD been resolved to a real office kept the 'exact' label while their
-- coordinates were quietly dragged back to the city centre. Seattle ended up
-- with 21 companies all claiming a street address at one identical point.
--
-- The write path no longer overwrites resolved offices. This cleans up what it
-- already did, so those rows get resolved again rather than sitting wrong and
-- being trusted.
--
-- The test is co-location: several companies sharing one coordinate to five
-- decimal places is a centroid, not an office. Idempotent — once repaired,
-- re-running matches nothing.

update public.companies as c
set geo_precision = 'city',
    geo_resolved_at = null
where c.geo_precision = 'exact'
  and c.latitude is not null
  and exists (
    select 1
    from public.companies as other
    where other.canonical_domain <> c.canonical_domain
      and other.city = c.city
      and other.latitude = c.latitude
      and other.longitude = c.longitude
  );
