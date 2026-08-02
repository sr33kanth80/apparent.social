// Founder names on agent-sourced startups.
//
// The sourcing agent used to be told to write "a short descriptor like
// 'Founding team'" whenever it could not find a real name, and the server
// defaulted to the same string. Both are fixed, but rows written before that
// still carry the placeholders — so they are normalized away on read and the
// UI reports the founder as unidentified instead of printing a non-answer.

const PLACEHOLDERS = new Set([
  'founding team',
  'the founding team',
  'founding members',
  'founders',
  'the founders',
  'founder',
  'the founder',
  'co-founders',
  'cofounders',
  'team',
  'the team',
  'unknown',
  'not identified',
  'not known',
  'not provided',
  'n/a',
  'na',
  'none',
  '-',
  '—',
]);

/** The founder's real name, or '' when all we have is a placeholder. */
export const realFounderName = (value: unknown): string => {
  const name = String(value ?? '').trim();
  // Collapse inner whitespace so "Founding  Team" matches too.
  return PLACEHOLDERS.has(name.replace(/\s+/g, ' ').toLowerCase()) ? '' : name;
};
