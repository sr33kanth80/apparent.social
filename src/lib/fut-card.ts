// Stage → the short code shown in the daily-digest card's top-left slot.
// Order matters: /seed/ would swallow "pre-seed", so the narrower patterns
// have to be tested first.
const STAGE_POSITION: Array<[RegExp, string]> = [
  [/pre[\s-]?seed/i, 'PRE'],
  [/seed/i, 'SEED'],
  [/series\s*a|^a$/i, 'A'],
  [/series\s*b|^b$/i, 'B'],
  [/series\s*c|growth|late/i, 'GRW'],
  [/idea|concept|build/i, 'IDEA'],
];

export const stagePosition = (stage: string): string => {
  for (const [re, code] of STAGE_POSITION) if (re.test(stage)) return code;
  return stage ? stage.slice(0, 4).toUpperCase() : 'NEW';
};
