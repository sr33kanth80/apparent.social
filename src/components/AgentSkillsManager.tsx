import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CircleAlert, ExternalLink, Loader2, Power, Puzzle, ShieldCheck, Trash2, X } from 'lucide-react';

import { LogoIcon } from '@/components/LogoIcon';
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
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-[#140206]/25 p-4" onMouseDown={() => setOpen(false)}>
          <section
            aria-label="Agent Skills"
            aria-modal="true"
            role="dialog"
            className="agent-page max-h-[88dvh] w-full max-w-[760px] overflow-hidden rounded-none border border-[#140206] bg-[#f7f4ef] shadow-[8px_8px_0_#140206]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-5 border-b border-[#140206] bg-[#f7f4ef] px-5 py-5 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <LogoIcon className="mt-1 h-6 w-6 shrink-0 text-[#140206]" />
                <div>
                  <p className="agent-skills-meta text-[10px] font-medium uppercase tracking-[0.16em] text-black/45">Apparent agent</p>
                  <h2 className="agent-skills-display mt-1 font-serif text-2xl font-normal leading-none tracking-[-0.03em] text-[#140206]">Agent Skills</h2>
                  <p className="mt-2 max-w-xl text-sm leading-5 text-black/55">Install portable skills into your {role} agent. Type <span className="font-medium text-[#140206]">/</span> in chat to invoke any enabled skill.</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-[#140206] bg-transparent text-[#140206] transition-colors hover:bg-[#16a34a] hover:text-white" aria-label="Close Agent Skills">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="max-h-[calc(88dvh-112px)] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="border-b border-[#140206] pb-6">
                <p className="agent-skills-meta text-[10px] font-medium uppercase tracking-[0.16em] text-black/45">Install from source</p>
                <label htmlFor={`agent-skill-source-${role}`} className="agent-skills-display mt-1 block font-serif text-xl font-normal tracking-[-0.025em] text-[#140206]">Add a portable skill</label>
                <p className="mt-1 text-xs leading-5 text-black/55">Paste a GitHub repository, skill directory, or direct SKILL.md URL. Apparent inspects it before anything is installed.</p>
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
                    className="min-w-0 flex-1 rounded-none border border-[#140206] bg-transparent px-3 py-2.5 text-sm text-[#140206] outline-none transition focus:shadow-[3px_3px_0_#140206]"
                  />
                  <button
                    type="button"
                    onClick={() => void inspect()}
                    disabled={loading || !sourceUrl.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-none border border-[#140206] bg-[#16a34a] px-4 py-2.5 text-sm font-medium text-white shadow-[3px_3px_0_#140206] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Inspect
                  </button>
                </div>

                {preview && (
                  <div className="mt-5 rounded-none border border-[#140206] bg-[#e2f7ec] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="agent-skills-display font-serif text-lg font-normal tracking-[-0.02em] text-[#140206]">{preview.name}</p>
                        <p className="mt-1 max-w-xl text-sm leading-5 text-black/60">{preview.description}</p>
                      </div>
                      <button type="button" onClick={() => void install()} disabled={loading} className="rounded-none border border-[#140206] bg-[#16a34a] px-3.5 py-2 text-xs font-medium text-white shadow-[2px_2px_0_#140206] disabled:opacity-50 disabled:shadow-none">
                        Install skill
                      </button>
                    </div>
                    <div className="agent-skills-meta mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-black/55">
                      <span>{preview.resourcePaths.length} text resource{preview.resourcePaths.length === 1 ? '' : 's'}</span>
                      <span>•</span>
                      <span>{preview.allowedTools.length ? `${preview.allowedTools.length} declared tool${preview.allowedTools.length === 1 ? '' : 's'}` : 'No declared tools'}</span>
                      {preview.version && <><span>•</span><span>Version {preview.version}</span></>}
                    </div>
                    {preview.hasScripts && (
                      <div className="mt-3 flex items-start gap-2 rounded-none border border-amber-700 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        This skill includes scripts. Apparent will install its instructions and text references, but will not execute bundled code without a sandbox.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && <div className="mt-4 rounded-none border border-red-700 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}

              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <p className="agent-skills-meta text-[10px] font-medium uppercase tracking-[0.16em] text-black/45">Your library</p>
                  <h3 className="agent-skills-display mt-1 font-serif text-xl font-normal tracking-[-0.025em] text-[#140206]">Installed skills</h3>
                </div>
                <span className="agent-skills-meta font-mono text-[10px] uppercase tracking-[0.08em] text-black/45">{skills.filter((skill) => skill.enabled).length} enabled · {skills.length} installed</span>
              </div>

              <div className="mt-3 divide-y divide-[#140206]/20 border-y border-[#140206]">
                {loading && skills.length === 0 && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#6e7673]"><Loader2 className="h-4 w-4 animate-spin" /> Loading skills</div>
                )}
                {!loading && skills.length === 0 && (
                  <div className="px-5 py-10 text-center">
                    <p className="agent-skills-display font-serif text-lg font-normal text-[#140206]">Your agent has no installed skills yet.</p>
                    <p className="mt-1 text-xs text-black/50">Install one above. Apparent will keep it private to your account.</p>
                  </div>
                )}
                {skills.map((skill) => {
                  const active = activeSkill?.id === skill.id;
                  const busy = busyId === skill.id;
                  return (
                    <article key={skill.id} className={`p-4 transition-colors ${active ? 'border-l-4 border-[#16a34a] bg-[#e2f7ec]' : 'bg-transparent'} ${skill.enabled ? '' : 'opacity-55'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="agent-skills-display font-serif text-lg font-normal tracking-[-0.02em] text-[#140206]">{skill.name}</p>
                            {active && <span className="rounded-none border border-[#140206] bg-[#16a34a] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-white">Active</span>}
                            {!skill.enabled && <span className="rounded-none border border-[#140206]/50 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-black/55">Disabled</span>}
                            {skill.enabled && skill.activationMode === 'auto' && <span className="rounded-none border border-[#140206]/30 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-black/55">Auto-use</span>}
                          </div>
                          <p className="mt-1 text-sm leading-5 text-black/55">{skill.description}</p>
                          <a href={skill.sourceUrl} target="_blank" rel="noreferrer" className="agent-skills-meta mt-2 inline-flex max-w-full items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-black/45 hover:text-[#140206]">
                            <ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">Source</span>
                          </a>
                        </div>
                        <button type="button" onClick={() => void uninstall(skill)} disabled={busy} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none border border-[#140206]/40 text-black/45 transition-colors hover:border-red-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-50" aria-label={`Uninstall ${skill.name}`}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#140206]/15 pt-3">
                        <button
                          type="button"
                          onClick={() => onActiveSkillChange(active ? null : { id: skill.id, name: skill.name })}
                          disabled={!skill.enabled}
                          className={active ? 'rounded-none border border-[#140206] px-3 py-1.5 text-xs font-medium text-[#140206] hover:bg-black/[0.04]' : 'rounded-none border border-[#140206] bg-[#16a34a] px-3 py-1.5 text-xs font-medium text-white shadow-[2px_2px_0_#140206] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none'}
                        >
                          {active ? 'Stop using' : 'Use now'}
                        </button>
                        <button type="button" onClick={() => void updateActivation(skill)} disabled={busy || !skill.enabled} className="rounded-none border border-[#140206]/60 px-3 py-1.5 text-xs font-medium text-[#140206] transition-colors hover:border-[#140206] disabled:cursor-not-allowed disabled:opacity-40">
                          {skill.activationMode === 'auto' ? 'Require explicit use' : 'Allow auto-use'}
                        </button>
                        <button type="button" onClick={() => void updateEnabled(skill)} disabled={busy} className="inline-flex items-center gap-1 rounded-none border border-[#140206]/60 px-3 py-1.5 text-xs font-medium text-[#140206] transition-colors hover:border-[#140206] disabled:opacity-50">
                          <Power className="h-3 w-3" /> {skill.enabled ? 'Disable' : 'Enable'}
                        </button>
                        {skill.hasScripts && <span className="text-[11px] text-amber-700">Scripts disabled</span>}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-none border border-[#140206]/30 bg-transparent px-3.5 py-3 text-xs leading-5 text-black/55">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#140206]" />
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
