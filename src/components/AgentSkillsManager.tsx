import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CircleAlert, ExternalLink, Loader2, Power, Puzzle, ShieldCheck, Trash2, X } from 'lucide-react';

import { useAgentAuthHeaders } from '@/lib/agent-auth';
import type { AgentInstalledSkill, AgentSkillPreview, DashboardRole } from '@/lib/apparent-types';

type ActiveSkill = Pick<AgentInstalledSkill, 'id' | 'name'> | null;

type AgentSkillsManagerProps = {
  role: DashboardRole;
  activeSkill: ActiveSkill;
  onActiveSkillChange: (skill: ActiveSkill) => void;
  onInstalledSkillsChange?: (skills: AgentInstalledSkill[]) => void;
};

const apiUrl = (role: DashboardRole, params = '') => `/api/agent-skills?role=${role}${params}`;

export const AgentSkillsManager = ({
  role,
  activeSkill,
  onActiveSkillChange,
  onInstalledSkillsChange,
}: AgentSkillsManagerProps) => {
  const authHeaders = useAgentAuthHeaders();
  const [open, setOpen] = useState(false);
  const [skills, setSkills] = useState<AgentInstalledSkill[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [preview, setPreview] = useState<AgentSkillPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const request = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const headers = await authHeaders();
    if (!headers.Authorization) throw new Error('Sign in again to manage Agent Skills.');
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
        ...(init?.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(String(payload?.error || 'The Agent Skill request failed.'));
    return payload as T;
  }, [authHeaders]);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await request<{ skills: AgentInstalledSkill[] }>(apiUrl(role));
      const installed = Array.isArray(payload.skills) ? payload.skills : [];
      setSkills(installed);
      if (activeSkill && !installed.some((skill) => skill.id === activeSkill.id && skill.enabled)) onActiveSkillChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Agent Skills.');
    } finally {
      setLoading(false);
    }
  }, [activeSkill, onActiveSkillChange, request, role]);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  useEffect(() => {
    onInstalledSkillsChange?.(skills);
  }, [onInstalledSkillsChange, skills]);

  useEffect(() => {
    if (!open) return;
    void loadSkills();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loadSkills, open]);

  const inspect = async () => {
    if (!sourceUrl.trim()) return;
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const payload = await request<{ preview: AgentSkillPreview }>(apiUrl(role), {
        method: 'POST',
        body: JSON.stringify({ action: 'inspect', role, sourceUrl: sourceUrl.trim() }),
      });
      setPreview(payload.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to inspect this skill.');
    } finally {
      setLoading(false);
    }
  };

  const install = async () => {
    if (!preview) return;
    setLoading(true);
    setError('');
    try {
      const payload = await request<{ skill: AgentInstalledSkill }>(apiUrl(role), {
        method: 'POST',
        body: JSON.stringify({ action: 'install', role, sourceUrl: preview.sourceUrl }),
      });
      setSkills((current) => [payload.skill, ...current.filter((skill) => skill.id !== payload.skill.id && skill.name !== payload.skill.name)]);
      onActiveSkillChange({ id: payload.skill.id, name: payload.skill.name });
      setPreview(null);
      setSourceUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to install this skill.');
    } finally {
      setLoading(false);
    }
  };

  const updateActivation = async (skill: AgentInstalledSkill) => {
    setBusyId(skill.id);
    setError('');
    try {
      const payload = await request<{ skill: AgentInstalledSkill }>(apiUrl(role), {
        method: 'PATCH',
        body: JSON.stringify({
          id: skill.id,
          role,
          activationMode: skill.activationMode === 'auto' ? 'explicit' : 'auto',
        }),
      });
      setSkills((current) => current.map((item) => item.id === skill.id ? payload.skill : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update this skill.');
    } finally {
      setBusyId('');
    }
  };

  const updateEnabled = async (skill: AgentInstalledSkill) => {
    setBusyId(skill.id);
    setError('');
    try {
      const payload = await request<{ skill: AgentInstalledSkill }>(apiUrl(role), {
        method: 'PATCH',
        body: JSON.stringify({ id: skill.id, role, enabled: !skill.enabled }),
      });
      setSkills((current) => current.map((item) => item.id === skill.id ? payload.skill : item));
      if (skill.enabled && activeSkill?.id === skill.id) onActiveSkillChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update this skill.');
    } finally {
      setBusyId('');
    }
  };

  const uninstall = async (skill: AgentInstalledSkill) => {
    if (!window.confirm(`Uninstall ${skill.name}?`)) return;
    setBusyId(skill.id);
    setError('');
    try {
      await request<{ ok: boolean }>(apiUrl(role, `&id=${encodeURIComponent(skill.id)}`), { method: 'DELETE' });
      setSkills((current) => current.filter((item) => item.id !== skill.id));
      if (activeSkill?.id === skill.id) onActiveSkillChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to uninstall this skill.');
    } finally {
      setBusyId('');
    }
  };

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex h-8 max-w-[180px] items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 text-xs font-medium text-[#4c514f] shadow-[0_2px_0_rgba(51,51,51,0.10)] transition-colors hover:border-black/20 hover:text-black"
      title={activeSkill ? `Active skill: ${activeSkill.name}` : 'Install and manage Agent Skills'}
    >
      <Puzzle className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{activeSkill?.name || 'Skills'}</span>
      {activeSkill && <Check className="h-3 w-3 shrink-0 text-[#15803d]" />}
    </button>
  );

  if (!open) return trigger;

  return (
    <>
      {trigger}
      {createPortal(
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
          <section
            aria-label="Agent Skills"
            className="max-h-[88dvh] w-full max-w-2xl overflow-hidden rounded-[22px] border border-black/10 bg-[#fdf9f7] shadow-[0_28px_90px_rgba(30,36,33,0.24)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b border-black/10 bg-white px-5 py-4 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <Puzzle className="h-5 w-5 text-[#003f2e]" />
                  <h2 className="text-lg font-semibold tracking-[-0.025em] text-[#252927]">Agent Skills</h2>
                </div>
                <p className="mt-1 text-sm leading-5 text-[#6e7673]">Install portable skills into your {role} agent. Type <span className="font-semibold text-[#45675c]">/</span> in chat to invoke any enabled skill.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-black/45 transition-colors hover:bg-black/5 hover:text-black" aria-label="Close Agent Skills">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="max-h-[calc(88dvh-92px)] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_6px_20px_rgba(34,48,42,0.04)]">
                <label htmlFor={`agent-skill-source-${role}`} className="text-sm font-semibold text-[#252927]">Install from a public URL</label>
                <p className="mt-1 text-xs leading-5 text-[#6e7673]">Paste a GitHub repository, skill directory, or direct SKILL.md URL.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    id={`agent-skill-source-${role}`}
                    type="url"
                    value={sourceUrl}
                    onChange={(event) => {
                      setSourceUrl(event.target.value);
                      setPreview(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void inspect();
                    }}
                    placeholder="https://github.com/owner/skill"
                    className="min-w-0 flex-1 rounded-xl border border-black/10 bg-[#fdf9f7] px-3 py-2.5 text-sm text-[#333333] outline-none transition focus:border-[#6fa38f] focus:ring-2 focus:ring-[#039861]/10"
                  />
                  <button
                    type="button"
                    onClick={() => void inspect()}
                    disabled={loading || !sourceUrl.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#003f2e] px-4 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_rgba(255,255,255,0.12),0_2px_0_rgba(0,40,30,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Inspect
                  </button>
                </div>

                {preview && (
                  <div className="mt-4 rounded-xl border border-[#8fb8a7]/50 bg-[#edf5f1] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#153e31]">{preview.name}</p>
                        <p className="mt-1 max-w-xl text-sm leading-5 text-[#45675c]">{preview.description}</p>
                      </div>
                      <button type="button" onClick={() => void install()} disabled={loading} className="rounded-xl bg-[#003f2e] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_2px_0_rgba(0,40,30,0.22)] disabled:opacity-50">
                        Install skill
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#45675c]">
                      <span>{preview.resourcePaths.length} text resource{preview.resourcePaths.length === 1 ? '' : 's'}</span>
                      <span>•</span>
                      <span>{preview.allowedTools.length ? `${preview.allowedTools.length} declared tool${preview.allowedTools.length === 1 ? '' : 's'}` : 'No declared tools'}</span>
                      {preview.version && <><span>•</span><span>Version {preview.version}</span></>}
                    </div>
                    {preview.hasScripts && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        This skill includes scripts. Apparent will install its instructions and text references, but will not execute bundled code without a sandbox.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}

              <div className="mt-6 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#252927]">Installed for this agent</h3>
                <span className="text-xs text-[#8a908d]">{skills.filter((skill) => skill.enabled).length} enabled · {skills.length} installed</span>
              </div>

              <div className="mt-3 grid gap-3">
                {loading && skills.length === 0 && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#6e7673]"><Loader2 className="h-4 w-4 animate-spin" /> Loading skills</div>
                )}
                {!loading && skills.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-black/15 px-5 py-8 text-center">
                    <p className="text-sm font-medium text-[#333333]">Your agent has no installed skills yet.</p>
                    <p className="mt-1 text-xs text-[#7a817e]">Install one above. Apparent will keep it private to your account.</p>
                  </div>
                )}
                {skills.map((skill) => {
                  const active = activeSkill?.id === skill.id;
                  const busy = busyId === skill.id;
                  return (
                    <article key={skill.id} className={`rounded-2xl border bg-white p-4 transition ${active ? 'border-[#6fa38f] shadow-[0_5px_18px_rgba(0,63,46,0.08)]' : 'border-black/10'} ${skill.enabled ? '' : 'opacity-65'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[#252927]">{skill.name}</p>
                            {active && <span className="rounded-full bg-[#edf5f1] px-2 py-0.5 text-[10px] font-semibold text-[#006b4e]">Active</span>}
                            {!skill.enabled && <span className="rounded-full bg-[#f1eee9] px-2 py-0.5 text-[10px] font-semibold text-[#756d65]">Disabled</span>}
                            {skill.enabled && skill.activationMode === 'auto' && <span className="rounded-full bg-[#f1eee9] px-2 py-0.5 text-[10px] font-medium text-[#6e6760]">Auto-use</span>}
                          </div>
                          <p className="mt-1 text-sm leading-5 text-[#6e7673]">{skill.description}</p>
                          <a href={skill.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 text-[11px] text-[#70827b] hover:text-[#003f2e]">
                            <ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">Source</span>
                          </a>
                        </div>
                        <button type="button" onClick={() => void uninstall(skill)} disabled={busy} className="shrink-0 rounded-lg p-2 text-black/35 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label={`Uninstall ${skill.name}`}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
                        <button
                          type="button"
                          onClick={() => onActiveSkillChange(active ? null : { id: skill.id, name: skill.name })}
                          disabled={!skill.enabled}
                          className={active ? 'rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-[#5f6764] hover:bg-black/[0.03]' : 'rounded-lg bg-[#003f2e] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_2px_0_rgba(0,40,30,0.18)] disabled:cursor-not-allowed disabled:opacity-40'}
                        >
                          {active ? 'Stop using' : 'Use now'}
                        </button>
                        <button type="button" onClick={() => void updateActivation(skill)} disabled={busy || !skill.enabled} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-[#5f6764] transition-colors hover:border-black/20 hover:text-black disabled:cursor-not-allowed disabled:opacity-40">
                          {skill.activationMode === 'auto' ? 'Require explicit use' : 'Allow auto-use'}
                        </button>
                        <button type="button" onClick={() => void updateEnabled(skill)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-[#5f6764] transition-colors hover:border-black/20 hover:text-black disabled:opacity-50">
                          <Power className="h-3 w-3" /> {skill.enabled ? 'Disable' : 'Enable'}
                        </button>
                        {skill.hasScripts && <span className="text-[11px] text-amber-700">Scripts disabled</span>}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#f1eee9] px-3.5 py-3 text-xs leading-5 text-[#68645f]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#45675c]" />
                Installed skills never gain permissions by themselves. Apparent still enforces your role, action approvals, research limits, and privacy boundaries.
              </div>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
};

export type { ActiveSkill };
