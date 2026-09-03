-- Building-level coordinates for the Jobs Map.
--
-- Companies were pinned at their city's centroid, which is fine on a flat map
-- and wrong on a 3D one: every company in a city stacks on a single point while
-- real buildings stand all around it. Geocoding "<company>, <city>" resolves the
-- actual office, so a marker can sit on the building it belongs to.
--
-- Precision is recorded rather than assumed: a marker placed at a city centroid
-- must be distinguishable from one placed on a real address, or the map claims
-- accuracy it does not have.

alter table public.companies
  add column if not exists geo_precision text not null default 'city',
  add column if not exists geo_resolved_at timestamptz;

-- Finding which rows still need resolving.
create index if not exists companies_geo_precision_idx
  on public.companies (geo_precision, city);
