import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { HiringCompany } from '@/lib/apparent-types';

/**
 * Global fuzzy search, on ⌘K / Ctrl+K.
 *
 * Choosing a result flies the camera to that company's building rather than
 * just filtering a list — finding a company and seeing where it sits are the
 * same action here.
 */

/** Subsequence match: "shpfy" finds "Shopify". Returns null when it does not. */
const fuzzyScore = (haystack: string, needle: string): number | null => {
  const text = haystack.toLowerCase();
  const query = needle.toLowerCase();
  if (!query) return 0;

  let score = 0;
  let cursor = 0;
  let streak = 0;

  for (const char of query) {
    const at = text.indexOf(char, cursor);
    if (at === -1) return null;
    // Consecutive hits and matches at a word start are worth more, so "ram"
    // ranks Ramp above a company that merely contains r, a and m in order.
    streak = at === cursor ? streak + 1 : 0;
    score += 10 - Math.min(9, at - cursor) + streak * 4;
    if (at === 0 || /[\s.\-_]/.test(text[at - 1] ?? '')) score += 8;
    cursor = at + 1;
  }
  return score;
};

type Props = {
  open: boolean;
  companies: HiringCompany[];
  onClose: () => void;
  onPick: (company: HiringCompany) => void;
};

export function CommandPalette({ open, companies, onClose, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    // Focused directly: effects already run after commit, so the input exists.
    // Deferring through requestAnimationFrame left the box unfocused wherever
    // frames are throttled, which turns a keyboard-first feature into one that
    // needs a mouse.
    inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return [...companies]
        .sort((a, b) => b.openRoles - a.openRoles)
        .slice(0, 8);
    }
    return companies
      .map((company) => {
        const byName = fuzzyScore(company.name, query);
        const byArea = fuzzyScore(company.city, query);
        const best = Math.max(byName ?? -1, byArea != null ? byArea - 4 : -1);
        return best >= 0 ? { company, score: best } : null;
      })
      .filter((entry): entry is { company: HiringCompany; score: number } => entry !== null)
      .sort((a, b) => b.score - a.score || b.company.openRoles - a.company.openRoles)
      .slice(0, 8)
      .map((entry) => entry.company);
  }, [companies, query]);

  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(0, results.length - 1)));
  }, [results.length]);

  if (!open) return null;

  const choose = (company: HiringCompany | undefined) => {
    if (!company) return;
    onPick(company);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[540px] overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search companies"
      >
        <div className="flex items-center gap-2.5 border-b border-black/8 px-4 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-black/35" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                choose(results[active]);
              } else if (event.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="Search a company or area…"
            className="w-full bg-transparent text-[15px] text-black outline-none placeholder:text-black/30"
          />
          <kbd className="shrink-0 rounded border border-black/12 px-1.5 py-0.5 text-[10px] text-black/40">
            ESC
          </kbd>
        </div>

        <ul className="max-h-[46vh] overflow-y-auto py-1.5">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-black/40">Nothing matches that.</li>
          )}
          {results.map((company, index) => (
            <li key={company.domain}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(company)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === active ? 'bg-[#1d9bf0]/10' : 'hover:bg-black/[0.03]'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-black">{company.name}</span>
                  <span className="block truncate text-xs text-black/45">{company.city}</span>
                </span>
                {company.openRoles > 0 && (
                  <span className="shrink-0 text-xs text-black/45">
                    {company.openRoles} {company.openRoles === 1 ? 'role' : 'roles'}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
