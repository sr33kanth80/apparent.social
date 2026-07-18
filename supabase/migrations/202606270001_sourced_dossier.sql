-- Sourced-startup agent dossier (Phase 2).
-- Caches the on-demand investor deep-dive (built by /api/sourced-enrich via
-- Apparent/Orthogonal web research) on the source_signals row so it's generated once and
-- served instantly thereafter. Idempotent — safe to re-run.

alter table public.source_signals
  add column if not exists dossier jsonb,
  add column if not exists dossier_at timestamptz;
