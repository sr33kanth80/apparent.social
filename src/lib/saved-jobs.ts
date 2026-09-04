import { useSyncExternalStore } from 'react';

/**
 * Bookmarked roles, kept in localStorage.
 *
 * The Jobs Map has no accounts, and a saved role is only useful to the person
 * who saved it, so the browser is the right place for this — no table, no auth,
 * no sync. The whole role is stored rather than an id because the saved list
 * has to render for companies the map isn't currently showing.
 *
 * ponytail: per-browser only. Move to a table when there are accounts to hang
 * it off, not before.
 */

const KEY = 'apparent.jobs.saved.v1';

export type SavedJob = {
  /** `${domain}::${jobKey}` — job keys are only unique within a company. */
  key: string;
  domain: string;
  company: string;
  title: string;
  jobUrl: string;
  location: string;
  postedAt: string | null;
  savedAt: string;
};

export const savedKey = (domain: string, jobKey: string) => `${domain}::${jobKey}`;

let cache: Record<string, SavedJob> | null = null;
const listeners = new Set<() => void>();

const read = (): Record<string, SavedJob> => {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cache = parsed && typeof parsed === 'object' ? (parsed as Record<string, SavedJob>) : {};
  } catch {
    // Private browsing, disabled storage, or corrupt JSON: an empty list is a
    // fine answer, a thrown error in a render is not.
    cache = {};
  }
  return cache;
};

const write = (next: Record<string, SavedJob>) => {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Saving is a convenience; keep it working in-memory if the quota says no.
  }
  listeners.forEach((fn) => fn());
};

export const toggleSaved = (job: Omit<SavedJob, 'savedAt'>) => {
  const current = read();
  const next = { ...current };
  if (next[job.key]) delete next[job.key];
  else next[job.key] = { ...job, savedAt: new Date().toISOString() };
  write(next);
};

export const removeSaved = (key: string) => {
  const current = read();
  if (!current[key]) return;
  const next = { ...current };
  delete next[key];
  write(next);
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Nothing is saved during SSR/prerender; a shared constant keeps it stable. */
const EMPTY: Record<string, SavedJob> = {};

export const useSavedJobs = () => useSyncExternalStore(subscribe, read, () => EMPTY);
