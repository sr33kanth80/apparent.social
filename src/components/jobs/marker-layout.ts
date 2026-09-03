import type { HiringCompany } from '@/lib/apparent-types';

/**
 * Screen-space layout for the map's company markers.
 *
 * Markers overlap for two different reasons and both need handling:
 *
 *  - Companies still on a city centroid share the EXACT same coordinate, so
 *    they stack into one illegible pile.
 *  - Markers metres apart still collide, because a name plate is far wider than
 *    the point it marks.
 *
 * Overlap is a screen-space question, so this is recomputed on every camera
 * move: the most important marker in a cluster keeps its name, the rest fall
 * back to dots, and anything sitting directly on another is folded into a
 * count that can be fanned open.
 *
 * Kept as a pure function so the packing rules can be tested without a map.
 */

export type MarkerState = 'full' | 'dot' | 'stacked' | 'hidden';

export type LayoutInput = {
  domain: string;
  company: HiringCompany;
  /** Projected screen position, in CSS pixels. */
  x: number;
  y: number;
};

export type LayoutResult = {
  /** How each marker should draw itself, by domain. */
  states: Map<string, MarkerState>;
  /** Anchor domain -> the domains folded underneath it. */
  stacks: Map<string, string[]>;
};

/** Two markers closer than this on screen are the same spot, not neighbours. */
export const SAME_SPOT_PX = 26;
/** Rough plate size, used to decide whether a name would overprint another. */
const LABEL_HALF_W = 78;
const LABEL_H = 30;
const DOT_HALF_W = 9;
const DOT_H = 20;

export const layoutMarkers = (markers: LayoutInput[]): LayoutResult => {
  /**
   * Ordered by size alone, deliberately independent of what is selected.
   *
   * Ranking the selection first meant clicking a company made it the anchor of
   * its stack, which re-keyed the stack and collapsed any fan the viewer had
   * opened — so exploring one company's roles made every other pin vanish.
   * Packing has to stay put while you read. A selected marker that would be
   * hidden is surfaced by opening its stack instead (see CityMap3D).
   */
  const ordered = [...markers].sort((a, b) => b.company.openRoles - a.company.openRoles);

  type Placed = { x: number; y: number; x1: number; y1: number; x2: number; y2: number; domain: string };
  const placed: Placed[] = [];
  const states = new Map<string, MarkerState>();
  const stacks = new Map<string, string[]>();

  for (const entry of ordered) {
    // Same spot as something already placed: fold it in rather than drawing one
    // marker directly on top of another.
    const anchor = placed.find(
      (other) => Math.hypot(other.x - entry.x, other.y - entry.y) < SAME_SPOT_PX,
    );
    if (anchor) {
      const members = stacks.get(anchor.domain) ?? [];
      members.push(entry.domain);
      stacks.set(anchor.domain, members);
      states.set(entry.domain, 'stacked');
      continue;
    }

    // Not on top of anything, but the name plate may still overprint a
    // neighbour. Losing the label beats losing legibility.
    const box = {
      x1: entry.x - LABEL_HALF_W,
      y1: entry.y - LABEL_H,
      x2: entry.x + LABEL_HALF_W,
      y2: entry.y,
    };
    const collides = placed.some(
      (other) => box.x1 < other.x2 && box.x2 > other.x1 && box.y1 < other.y2 && box.y2 > other.y1,
    );

    states.set(entry.domain, collides ? 'dot' : 'full');
    const halfW = collides ? DOT_HALF_W : LABEL_HALF_W;
    placed.push({
      x: entry.x,
      y: entry.y,
      x1: entry.x - halfW,
      y1: entry.y - (collides ? DOT_H : LABEL_H),
      x2: entry.x + halfW,
      y2: entry.y,
      domain: entry.domain,
    });
  }

  return { states, stacks };
};

/** Where a fanned-open stack member sits, relative to its anchor. */
export const fanOffset = (index: number, total: number): [number, number] => {
  const radius = 78 + Math.max(0, total - 6) * 5;
  const angle = (index / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
  // Vertically squashed so the fan reads as lying on the ground plane rather
  // than standing up in front of the camera.
  return [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.6 - 12];
};
