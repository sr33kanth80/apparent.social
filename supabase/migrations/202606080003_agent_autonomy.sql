-- ─────────────────────────────────────────────────────────────────────────────
-- Agent autonomy setting (per investor). Controls whether the agent drafts
-- outreach for approval, auto-sends in-app DMs, or runs fully autonomously.
-- Off-platform outreach stays draft-to-inbox regardless of this value.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.user_settings
  add column if not exists agent_autonomy text not null default 'manual';

do $$
begin
  alter table public.user_settings
    add constraint user_settings_agent_autonomy_check
    check (agent_autonomy in ('manual', 'auto_onplatform', 'autonomous'));
exception
  when duplicate_object then null;
end $$;
