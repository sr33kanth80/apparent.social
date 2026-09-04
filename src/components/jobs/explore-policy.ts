/**
 * Whether arriving somewhere should buy a discovery.
 *
 * Pulled out of the page because this is the money decision: every 'discover'
 * is a paid Orthogonal run, and a single drag across a continent settles over
 * dozens of named places. Kept pure so the guards can be tested without a map.
 */

export type DiscoveryVerdict =
  | 'discover'
  | 'unnamed'
  | 'too-far-out'
  | 'already-seen'
  | 'held-fresh'
  | 'capped';

export const decideDiscovery = ({
  place,
  zoom,
  minZoom,
  seen,
  autoDiscoveries,
  limit,
  holdsFresh,
}: {
  place: string;
  zoom: number;
  minZoom: number;
  /** Places already discovered this session. */
  seen: Set<string>;
  autoDiscoveries: number;
  limit: number;
  /** True when unexpired rows for this place are already loaded. */
  holdsFresh: boolean;
}): DiscoveryVerdict => {
  if (!place) return 'unnamed';
  // Zoomed out, the label under the crosshair is not what the viewer is looking
  // at — it is whichever city happens to be nearest the middle of a continent.
  if (zoom < minZoom) return 'too-far-out';
  if (seen.has(place)) return 'already-seen';
  if (holdsFresh) return 'held-fresh';
  if (autoDiscoveries >= limit) return 'capped';
  return 'discover';
};
