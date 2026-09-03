/**
 * Spreading companies across a city's real buildings.
 *
 * A company we could not resolve to an office sits on its city's centroid, so
 * every unresolved company in a city shares one coordinate. They stack, and
 * opening the stack fans them into a ring — which reads as a circle of pins in
 * the middle of the map rather than a city of companies.
 *
 * Instead, each is given its own building. The footprints come from the OSM
 * vector tiles already on screen, so a marker lands on an actual structure
 * rather than in the middle of a road or a river. It is NOT that company's real
 * address — those markers stay flagged approximate — it just puts them
 * somewhere plausible in the right city.
 */

export type Point = [number, number];

/** Stable string hash (FNV-1a), so a company always picks the same building. */
export const hashDomain = (value: string): number => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * Average of a polygon's outer ring. Not a true centroid, but building
 * footprints are small and convex enough that the difference is invisible at
 * city zoom — and this cannot divide by zero on a degenerate ring.
 */
export const ringCentre = (ring: Point[]): Point | null => {
  if (!ring || ring.length < 3) return null;
  let x = 0;
  let y = 0;
  let n = 0;
  for (const [lng, lat] of ring) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    x += lng;
    y += lat;
    n += 1;
  }
  return n ? [x / n, y / n] : null;
};

/** Rough metres between two lon/lat points, good enough for a radius filter. */
export const metresBetween = (a: Point, b: Point): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
};

/**
 * Deterministically hand out buildings, one per company.
 *
 * Hash picks the starting slot so the same company tends to land on the same
 * building, then linear probing steps past any already taken — two companies
 * sharing a rooftop would recreate the stacking this exists to remove.
 */
export const assignBuildings = (
  domains: string[],
  buildings: Point[],
  alreadyTaken: Set<number> = new Set(),
): Map<string, Point> => {
  const assigned = new Map<string, Point>();
  if (!buildings.length) return assigned;

  const taken = new Set(alreadyTaken);
  // Sorted so the candidate order does not depend on tile arrival order.
  const ordered = [...domains].sort();

  for (const domain of ordered) {
    if (taken.size >= buildings.length) break;
    let index = hashDomain(domain) % buildings.length;
    let probes = 0;
    while (taken.has(index) && probes < buildings.length) {
      index = (index + 1) % buildings.length;
      probes += 1;
    }
    if (taken.has(index)) break;
    taken.add(index);
    assigned.set(domain, buildings[index]);
  }
  return assigned;
};

/**
 * Fallback when the tiles have no buildings yet (zoomed out, or still loading):
 * a deterministic scatter around the centre so pins are at least separated.
 * Spiral rather than ring, so twenty companies do not read as a circle.
 */
export const scatterAround = (domain: string, centre: Point, index: number): Point => {
  const h = hashDomain(domain);
  // Golden-angle placement spreads points evenly instead of banding them.
  const angle = index * 2.399963 + (h % 360) * 0.0002;
  const radius = 0.0016 * Math.sqrt(index + 1) + (h % 7) * 0.00008;
  return [centre[0] + Math.cos(angle) * radius, centre[1] + Math.sin(angle) * radius * 0.62];
};
