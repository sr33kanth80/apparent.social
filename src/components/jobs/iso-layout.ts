import type { HiringCompany } from '@/lib/apparent-types';

/**
 * Deterministic isometric city layout.
 *
 * wherewework hand-places every building because a human types each office
 * address in. Our companies arrive live from Orthogonal with city-level
 * precision only, so there is no real building to place them on. Instead the
 * city is laid out as a stylised grid and each company gets a fixed plot on it.
 *
 * "Fixed" is the important part: placement is derived from the company's domain
 * and its rank, never from array order or randomness, so a building does not
 * hop to a different plot when the data refreshes or a new company appears.
 */

export type Plot = {
  company: HiringCompany;
  /** Grid coordinates, not geography. */
  gx: number;
  gy: number;
  /** Storeys — driven by how many roles are open. */
  height: number;
};

/** Small stable string hash (FNV-1a), so the same domain always lands alike. */
const hash = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * Buildings are laid out in a square spiral from the centre, ordered by how many
 * roles are open, so the biggest hirers sit downtown and the long tail spreads
 * outward. It reads as a city rather than a scatter plot.
 */
const spiralCell = (index: number) => {
  if (index === 0) return { gx: 0, gy: 0 };
  // Ring number, then position along that ring.
  const ring = Math.ceil((Math.sqrt(index + 1) - 1) / 2);
  const sideLength = ring * 2;
  const ringStart = (2 * ring - 1) ** 2;
  const offset = index - ringStart;
  const side = Math.floor(offset / sideLength);
  const along = offset % sideLength;

  switch (side) {
    case 0:
      return { gx: ring, gy: -ring + along + 1 };
    case 1:
      return { gx: ring - along - 1, gy: ring };
    case 2:
      return { gx: -ring, gy: ring - along - 1 };
    default:
      return { gx: -ring + along + 1, gy: -ring };
  }
};

const storeys = (openRoles: number) => {
  if (openRoles >= 40) return 7;
  if (openRoles >= 20) return 6;
  if (openRoles >= 10) return 5;
  if (openRoles >= 5) return 4;
  if (openRoles >= 2) return 3;
  return 2;
};

export const layoutCity = (companies: HiringCompany[]): Plot[] => {
  const ordered = [...companies].sort(
    // Roles first so the skyline means something; domain breaks ties stably.
    (a, b) => b.openRoles - a.openRoles || a.domain.localeCompare(b.domain),
  );

  return ordered.map((company, index) => {
    const { gx, gy } = spiralCell(index);
    // A touch of domain-derived jitter keeps the grid from looking machine-made
    // without ever moving a building off its own plot.
    const wobble = hash(company.domain) % 4;
    return {
      company,
      gx: gx + (wobble === 1 ? 0 : 0),
      gy,
      height: storeys(company.openRoles) + (wobble === 3 ? 1 : 0),
    };
  });
};

/** Grid coordinates to screen space, before pan/zoom is applied. */
export const TILE_W = 64;
export const TILE_H = 32;
export const STOREY_H = 14;

export const project = (gx: number, gy: number) => ({
  x: (gx - gy) * (TILE_W / 2),
  y: (gx + gy) * (TILE_H / 2),
});
