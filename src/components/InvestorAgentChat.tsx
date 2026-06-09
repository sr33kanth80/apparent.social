import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Send, Sparkles, Trash2, X } from 'lucide-react';

import { InvestorAIPrompt } from '@/components/InvestorAIAssist';
import { LogoIcon } from '@/components/LogoIcon';
import type { AgentAutonomy, AppUser } from '@/lib/apparent-types';

export type OutreachProposal = {
  founderId: string;
  founderName: string;
  subject: string;
  body: string;
};

export type OutreachResult = { ok: boolean; reason?: string };

type ProposalStatus = 'pending' | 'sending' | 'sent' | 'skipped' | 'error';
type ProposalState = OutreachProposal & { status: ProposalStatus; reason?: string };

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  proposals?: ProposalState[];
};

interface InvestorAgentChatProps {
  user: AppUser;
  /** The investor's saved criteria (intakeValues) — passed to the agent for thesis-aware sourcing. */
  criteria: Record<string, string>;
  autonomy: AgentAutonomy;
  onAutonomyChange: (next: AgentAutonomy) => void;
  /** Founder ids the investor has already messaged — the agent avoids re-proposing them. */
  contactedFounderIds: string[];
  /** Performs the actual RLS-authenticated send (and guardrail enforcement). */
  onSendOutreach: (proposal: OutreachProposal) => Promise<OutreachResult>;
  className?: string;
}

const STORAGE_PREFIX = 'apparent:agent-chat:';

const SUGGESTIONS = [
  'Show me founders raising now that fit my thesis',
  'Who are the strongest builders on Apparent right now?',
  'Find developer-tools founders and draft intros to the top 3',
];

const AUTONOMY_OPTIONS: { value: AgentAutonomy; label: string; hint: string }[] = [
  { value: 'manual', label: 'Draft & approve', hint: 'Agent drafts outreach; you send each one.' },
  { value: 'auto_onplatform', label: 'Auto-DM', hint: 'Agent auto-sends in-app DMs to matched founders.' },
  { value: 'autonomous', label: 'Autonomous', hint: 'Agent sources and reaches out on its own.' },
];

const isAutoMode = (autonomy: AgentAutonomy) => autonomy === 'auto_onplatform' || autonomy === 'autonomous';

export const InvestorAgentChat = ({
  user,
  criteria,
  autonomy,
  onAutonomyChange,
  contactedFounderIds,
  onSendOutreach,
  className,
}: InvestorAgentChatProps) => {
  const storageKey = `${STORAGE_PREFIX}${user.id}`;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
    } catch {
      /* quota — ignore */
    }
  }, [messages, storageKey]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  // Patch a single proposal's status inside a specific assistant message.
  const patchProposal = (messageIndex: number, proposalIndex: number, patch: Partial<ProposalState>) => {
    setMessages((current) =>
      current.map((message, mi) => {
        if (mi !== messageIndex || !message.proposals) return message;
        return {
          ...message,
          proposals: message.proposals.map((proposal, pi) =>
            pi === proposalIndex ? { ...proposal, ...patch } : proposal,
          ),
        };
      }),
    );
  };

  const executeProposal = async (messageIndex: number, proposalIndex: number, proposal: ProposalState) => {
    patchProposal(messageIndex, proposalIndex, { status: 'sending' });
    try {
      const result = await onSendOutreach(proposal);
      patchProposal(messageIndex, proposalIndex, {
        status: result.ok ? 'sent' : 'skipped',
        reason: result.reason,
      });
    } catch (err) {
      patchProposal(messageIndex, proposalIndex, {
        status: 'error',
        reason: err instanceof Error ? err.message : 'Send failed',
      });
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loadingRef.current) return;

    loadingRef.current = true;
    setError('');
    const conversation: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(conversation);
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversation.map((m) => ({ role: m.role, content: m.content })),
          criteria,
          autonomy,
          contacted: contactedFounderIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const rawProposals: OutreachProposal[] = Array.isArray(data.proposals) ? data.proposals : [];
      const auto = isAutoMode(autonomy);
      const proposalStates: ProposalState[] = rawProposals.map((proposal) => ({
        ...proposal,
        status: auto ? 'sending' : 'pending',
      }));

      let assistantIndex = -1;
      setMessages((current) => {
        assistantIndex = current.length;
        return [...current, { role: 'assistant', content: String(data.reply ?? ''), proposals: proposalStates.length ? proposalStates : undefined }];
      });

      // Auto modes send immediately; manual mode waits for the investor to approve.
      if (auto && proposalStates.length && assistantIndex >= 0) {
        for (let i = 0; i < proposalStates.length; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          await executeProposal(assistantIndex, i, proposalStates[i]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The agent is unavailable right now.');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };

  const clear = () => {
    setMessages([]);
    setError('');
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  const hasConversation = messages.length > 0;

  const renderProposal = (messageIndex: number, proposal: ProposalState, proposalIndex: number) => {
    const statusBadge = () => {
      switch (proposal.status) {
        case 'sent':
          return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#42520d]"><Check className="h-3 w-3" /> Sent</span>;
        case 'sending':
          return <span className="inline-flex items-center gap-1 text-[11px] text-gray-500"><Loader2 className="h-3 w-3 animate-spin" /> Sending…</span>;
        case 'skipped':
          return <span className="text-[11px] text-amber-700">Skipped{proposal.reason ? ` — ${proposal.reason}` : ''}</span>;
        case 'error':
          return <span className="text-[11px] text-red-600">Failed{proposal.reason ? ` — ${proposal.reason}` : ''}</span>;
        default:
          return null;
      }
    };

    return (
      <div key={`${proposal.founderId}-${proposalIndex}`} className="rounded-xl border border-black/10 bg-white p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-black">To {proposal.founderName || 'founder'}</p>
          {statusBadge()}
        </div>
        {proposal.subject && <p className="text-xs font-medium text-gray-600">{proposal.subject}</p>}
        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-600">{proposal.body}</p>
        {proposal.status === 'pending' && (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => executeProposal(messageIndex, proposalIndex, proposal)}
              className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-black"
            >
              <Send className="h-3 w-3" /> Send DM
            </button>
            <button
              type="button"
              onClick={() => patchProposal(messageIndex, proposalIndex, { status: 'skipped', reason: 'Dismissed' })}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:bg-[#fbf8f3] hover:text-black"
            >
              <X className="h-3 w-3" /> Dismiss
            </button>
          </div>
        )}
      </div>
    );
  };

  const autonomyBar = (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500">Agent mode</span>
      <div className="inline-flex rounded-full border border-black/10 bg-white p-0.5">
        {AUTONOMY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.hint}
            onClick={() => onAutonomyChange(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              autonomy === option.value ? 'bg-[#dcefc7] text-[#42520d]' : 'text-gray-500 hover:text-black'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={className}>
      {hasConversation && (
        <div className="mb-3 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-black">
              <Sparkles className="h-4 w-4 text-[#42520d]" />
              Apparent agent
            </div>
            <button
              type="button"
              onClick={clear}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-[#fbf8f3] hover:text-black"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>

          <div ref={transcriptRef} className="max-h-[460px] space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div key={index} className={message.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start'}>
                <div className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  {message.role === 'assistant' && (
                    <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dcefc7]">
                      <LogoIcon className="h-3.5 w-3.5 text-[#42520d]" />
                    </div>
                  )}
                  <div
                    className={
                      message.role === 'user'
                        ? 'max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-neutral-900 px-3.5 py-2.5 text-sm leading-relaxed text-white'
                        : 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-[#fbf8f3] px-3.5 py-2.5 text-sm leading-relaxed text-gray-800'
                    }
                  >
                    {message.content}
                  </div>
                </div>

                {message.role === 'assistant' && message.proposals && message.proposals.length > 0 && (
                  <div className="ml-8 mt-2 w-[85%] space-y-2">
                    {message.proposals.map((proposal, pi) => renderProposal(index, proposal, pi))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dcefc7]">
                  <LogoIcon className="h-3.5 w-3.5 text-[#42520d]" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-[#fbf8f3] px-3.5 py-2.5 text-sm text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Working…
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
            )}
          </div>
        </div>
      )}

      <InvestorAIPrompt className="py-0" onSubmit={send} />

      {autonomyBar}

      {!hasConversation && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-black/30 hover:text-black"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
