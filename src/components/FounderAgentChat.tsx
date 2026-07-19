import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Megaphone, Send, Sparkles, Trash2, X } from 'lucide-react';

import { AgentConversationShell } from '@/components/AgentConversationShell';
import { AgentMarkdown } from '@/components/AgentMarkdown';
import { AgentProfilePatchCard } from '@/components/AgentProfilePatchCard';
import {
  AgentStatusTrail,
  appendStatus,
  CopyAnswerButton,
  postAgentStream,
  ResearchTrailDisclosure,
  useTypewriterReveal,
} from '@/components/agent-stream';
import { InvestorAIPrompt } from '@/components/InvestorAIAssist';
import { LogoIcon } from '@/components/LogoIcon';
import { useAgentAuthHeaders } from '@/lib/agent-auth';
import type { AgentChatHistoryMessage, AgentMemory, AgentProfilePatch } from '@/lib/apparent-types';

export type IntroProposal = {
  investorId: string;
  investorName: string;
  subject: string;
  body: string;
};

export type IntroResult = { ok: boolean; reason?: string };

type ProposalStatus = 'pending' | 'sending' | 'sent' | 'skipped' | 'error';
type ProposalState = IntroProposal & { status: ProposalStatus; reason?: string };

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  proposals?: ProposalState[];
  profilePatches?: AgentProfilePatch[];
  amplified?: { count: number } | { error: string };
  /** Research steps that produced this reply, kept for the collapsed trail. */
  steps?: string[];
};

interface FounderAgentChatProps {
  /** Founder context (profile fields + dossier summary) for thesis-aware matching. */
  founder: Record<string, string>;
  memories: AgentMemory[];
  threadId: string | null;
  persistedMessages: AgentChatHistoryMessage[];
  persistedMessagesLoaded: boolean;
  /** Investor ids already messaged — the agent won't re-propose them. */
  contactedInvestorIds: string[];
  /** Send an intro DM to an on-platform investor (RLS-safe, runs as the founder). */
  onSendIntro: (proposal: IntroProposal) => Promise<IntroResult>;
  /** Push the founder to thesis-matched investors. Returns how many were notified. */
  onAmplify: () => Promise<number>;
  onApplyProfilePatch: (patch: AgentProfilePatch, fields: string[]) => Promise<IntroResult>;
  onPersistMessages: (
    messages: AgentChatHistoryMessage[],
    suggestedTitle?: string,
    threadId?: string | null,
  ) => Promise<string>;
  onStartNewConversation: () => void;
  onRememberConversation: (userMessage: string, assistantReply: string) => Promise<void>;
  pageMode?: boolean;
  className?: string;
}

const SUGGESTIONS = [
  'Set up my founder profile from my links and pasted text',
  'Which investors on Apparent fit my thesis?',
  'Draft intros to the top 3 investors for me',
  'Put me in front of investors who match',
];

export const FounderAgentChat = ({
  founder,
  memories,
  threadId,
  persistedMessages,
  persistedMessagesLoaded,
  contactedInvestorIds,
  onSendIntro,
  onAmplify,
  onApplyProfilePatch,
  onPersistMessages,
  onStartNewConversation,
  onRememberConversation,
  pageMode = false,
  className,
}: FounderAgentChatProps) => {
  const authHeaders = useAgentAuthHeaders();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Live progress labels streamed from the agent while it researches ("Matching…").
  const [statusSteps, setStatusSteps] = useState<string[]>([]);
  const { reveal, startReveal, stopReveal } = useTypewriterReveal();
  const transcriptRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const activeThreadRef = useRef<string | null>(threadId);

  const toHistoryMessages = (items: ChatMessage[]): AgentChatHistoryMessage[] =>
    items.map((item) => ({
      role: item.role,
      content: item.content,
      payload: {
        proposals: item.proposals,
        profilePatches: item.profilePatches,
        amplified: item.amplified,
        steps: item.steps,
      },
    }));

  const fromHistoryMessages = (items: AgentChatHistoryMessage[]): ChatMessage[] =>
    items.map((item) => ({
      role: item.role,
      content: item.content,
      proposals: Array.isArray(item.payload?.proposals) ? (item.payload.proposals as ProposalState[]) : undefined,
      profilePatches: Array.isArray(item.payload?.profilePatches) ? (item.payload.profilePatches as AgentProfilePatch[]) : undefined,
      amplified: item.payload?.amplified as ChatMessage['amplified'],
      steps: Array.isArray(item.payload?.steps) ? (item.payload.steps as string[]) : undefined,
    }));

  const persistTranscript = (
    nextMessages: ChatMessage[],
    suggestedTitle?: string,
    targetThreadId: string | null = threadId,
  ) => onPersistMessages(toHistoryMessages(nextMessages), suggestedTitle, targetThreadId);

  useEffect(() => {
    activeThreadRef.current = threadId;
  }, [threadId]);

  useEffect(() => {
    if (!persistedMessagesLoaded) return;
    stopReveal();
    if (persistedMessages.length > 0) {
      setMessages(fromHistoryMessages(persistedMessages));
      return;
    }
    setMessages([]);
  }, [persistedMessages, persistedMessagesLoaded]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading, statusSteps, reveal]);

  const patchProposal = (messageIndex: number, proposalIndex: number, patch: Partial<ProposalState>) => {
    setMessages((current) => {
      const next = current.map((message, mi) => {
        if (mi !== messageIndex || !message.proposals) return message;
        return {
          ...message,
          proposals: message.proposals.map((proposal, pi) => (pi === proposalIndex ? { ...proposal, ...patch } : proposal)),
        };
      });
      void persistTranscript(next);
      return next;
    });
  };

  const sendIntro = async (messageIndex: number, proposalIndex: number, proposal: ProposalState) => {
    patchProposal(messageIndex, proposalIndex, { status: 'sending' });
    try {
      const result = await onSendIntro(proposal);
      patchProposal(messageIndex, proposalIndex, { status: result.ok ? 'sent' : 'skipped', reason: result.reason });
    } catch (err) {
      patchProposal(messageIndex, proposalIndex, { status: 'error', reason: err instanceof Error ? err.message : 'Send failed' });
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loadingRef.current) return;

    loadingRef.current = true;
    setError('');
    stopReveal();
    setStatusSteps([]);
    const conversation: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(conversation);
    setIsLoading(true);

    try {
      const conversationThreadId = await persistTranscript(conversation, trimmed);
      if (activeThreadRef.current === threadId) activeThreadRef.current = conversationThreadId;
      const trail: string[] = [];
      const data = await postAgentStream(
        '/api/founder-agent',
        {
          messages: conversation.map((m) => ({ role: m.role, content: m.content })),
          founder,
          memories,
          contacted: contactedInvestorIds,
        },
        await authHeaders(),
        (label) => {
          if (trail[trail.length - 1] !== label) trail.push(label);
          setStatusSteps((steps) => appendStatus(steps, label));
        },
      );

      const assistantReply = String(data.reply ?? '');
      const rawProposals: IntroProposal[] = Array.isArray(data.proposals) ? data.proposals : [];
      const profilePatches: AgentProfilePatch[] = Array.isArray(data.profilePatches) ? data.profilePatches : [];
      const proposalStates: ProposalState[] = rawProposals.map((p) => ({ ...p, status: 'pending' }));

      const assistantIndex = conversation.length;
      let nextConversation: ChatMessage[] = [
        ...conversation,
        {
          role: 'assistant',
          content: assistantReply,
          proposals: proposalStates.length ? proposalStates : undefined,
          profilePatches: profilePatches.length ? profilePatches : undefined,
          steps: trail.length ? trail : undefined,
        },
      ];
      if (activeThreadRef.current === conversationThreadId) {
        setMessages(nextConversation);
        startReveal(assistantReply.length);
      }
      void persistTranscript(nextConversation, undefined, conversationThreadId);

      // The agent requested amplification — run it and record the outcome.
      if (data.amplify && assistantIndex >= 0) {
        try {
          const count = await onAmplify();
          nextConversation = nextConversation.map((message, index) => (
            index === assistantIndex ? { ...message, amplified: { count } } : message
          ));
          if (activeThreadRef.current === conversationThreadId) setMessages(nextConversation);
          void persistTranscript(nextConversation, undefined, conversationThreadId);
        } catch (err) {
          nextConversation = nextConversation.map((message, index) => (
            index === assistantIndex
              ? { ...message, amplified: { error: err instanceof Error ? err.message : 'Amplify failed' } }
              : message
          ));
          if (activeThreadRef.current === conversationThreadId) setMessages(nextConversation);
          void persistTranscript(nextConversation, undefined, conversationThreadId);
        }
      }

      void onRememberConversation(trimmed, assistantReply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The agent is unavailable right now.');
    } finally {
      setIsLoading(false);
      setStatusSteps([]);
      loadingRef.current = false;
    }
  };

  const clear = () => {
    setMessages([]);
    setError('');
    onStartNewConversation();
  };

  const hasConversation = messages.length > 0;

  // The newest assistant reply is revealed progressively; older messages show in full.
  const visibleAssistantText = (message: ChatMessage, index: number) =>
    reveal !== null && index === messages.length - 1 ? message.content.slice(0, reveal) : message.content;

  const renderProposal = (messageIndex: number, proposal: ProposalState, proposalIndex: number, flat = false) => {
    const badge = () => {
      switch (proposal.status) {
        case 'sent':
          return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink"><Check className="h-3 w-3" /> Sent</span>;
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
      <div
        key={`${proposal.investorId}-${proposalIndex}`}
        className={flat ? 'rounded-2xl border border-black/10 bg-white p-4' : 'rounded-xl border border-black/10 bg-white p-3'}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-black">To {proposal.investorName || 'investor'}</p>
          {badge()}
        </div>
        {proposal.subject && <p className="text-xs font-medium text-gray-600">{proposal.subject}</p>}
        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-600">{proposal.body}</p>
        {proposal.status === 'pending' && (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => sendIntro(messageIndex, proposalIndex, proposal)}
              className="inline-flex items-center gap-1 rounded-lg bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-black"
            >
              <Send className="h-3 w-3" /> Send intro
            </button>
            <button
              type="button"
              onClick={() => patchProposal(messageIndex, proposalIndex, { status: 'skipped', reason: 'Dismissed' })}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:bg-[#f6f3f1] hover:text-black"
            >
              <X className="h-3 w-3" /> Dismiss
            </button>
          </div>
        )}
      </div>
    );
  };

  if (pageMode) {
    const pageTranscript = (
      <div>
        {messages.map((message, index) => (
          <article
            key={index}
            className={
              message.role === 'user'
                ? `flex justify-end pb-8 pt-10 first:pt-0 ${index > 0 ? 'border-t border-[#d6d6d6]' : ''}`
                : 'pb-14'
            }
          >
            {message.role === 'user' ? (
              <div className="max-w-[85%] rounded-2xl border border-[#d6d6d6] bg-white px-4 py-3 sm:max-w-[72%]">
                <p className="whitespace-pre-wrap text-[15px] leading-6 text-[#333333] sm:text-base">
                  {message.content}
                </p>
              </div>
            ) : (
              <div>
                <p className="mb-1.5 text-sm font-medium text-[#333333]">Apparent</p>

                <ResearchTrailDisclosure steps={message.steps} />

                <AgentMarkdown className="agent-research-answer max-w-[800px] text-base leading-6 text-[#333333]">
                  {visibleAssistantText(message, index)}
                </AgentMarkdown>

                {message.proposals && message.proposals.length > 0 && (
                  <div className="mt-4 grid gap-3">{message.proposals.map((proposal, pi) => renderProposal(index, proposal, pi, true))}</div>
                )}

                {message.profilePatches && message.profilePatches.length > 0 && (
                  <div className="mt-4 grid gap-3">
                    {message.profilePatches.map((patch, pi) => (
                      <AgentProfilePatchCard
                        key={`${patch.role}-${pi}-${patch.fields.map((field) => field.field).join('-')}`}
                        onApply={onApplyProfilePatch}
                        patch={patch}
                      />
                    ))}
                  </div>
                )}

                {message.amplified && (
                  <div className="mt-4">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-[#d6d6d6] bg-[#edf5f1] px-3 py-2 text-xs font-medium text-[#003f2e]">
                      <Megaphone className="h-3.5 w-3.5" />
                      {'count' in message.amplified
                        ? message.amplified.count > 0
                          ? `Notified ${message.amplified.count} matched investor${message.amplified.count === 1 ? '' : 's'}.`
                          : 'No thesis-matched investors yet — strengthen your profile and try again.'
                        : `Couldn't amplify — ${message.amplified.error}`}
                    </div>
                  </div>
                )}

                {(reveal === null || index !== messages.length - 1) && (
                  <div className="mt-4">
                    <CopyAnswerButton text={message.content} />
                  </div>
                )}
              </div>
            )}
          </article>
        ))}

        {isLoading && (
          <div className="mt-2 border-t border-[#d6d6d6] pt-6">
            <p className="mb-3 text-sm font-medium text-[#333333]">Apparent</p>
            <AgentStatusTrail steps={statusSteps} />
          </div>
        )}

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      </div>
    );

    return (
      <AgentConversationShell
        className={className}
        hasConversation={hasConversation}
        isLoading={isLoading}
        onNewConversation={clear}
        onSubmit={send}
        role="founder"
        suggestions={SUGGESTIONS}
        transcript={pageTranscript}
        transcriptRef={transcriptRef}
      />
    );
  }

  return (
    <div className={className}>
      {hasConversation && (
        <div className="mb-3 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-black">
              <Sparkles className="h-4 w-4 text-ink" />
              Your founder agent
            </div>
            <button
              type="button"
              onClick={clear}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-[#f6f3f1] hover:text-black"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>

          <div ref={transcriptRef} className="max-h-[440px] space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div key={index} className={message.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start'}>
                <div className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  {message.role === 'assistant' && (
                    <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lavender">
                      <LogoIcon className="h-3.5 w-3.5 text-ink" />
                    </div>
                  )}
                  <div
                    className={
                      message.role === 'user'
                        ? 'max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-charcoal px-3.5 py-2.5 text-sm leading-relaxed text-white'
                        : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-[#f6f3f1] px-3.5 py-2.5 text-sm leading-relaxed text-gray-800'
                    }
                  >
                    {message.role === 'assistant'
                      ? <AgentMarkdown>{visibleAssistantText(message, index)}</AgentMarkdown>
                      : message.content}
                  </div>
                </div>

                {message.role === 'assistant' && message.proposals && message.proposals.length > 0 && (
                  <div className="ml-8 mt-2 w-[85%] space-y-2">
                    {message.proposals.map((proposal, pi) => renderProposal(index, proposal, pi))}
                  </div>
                )}

                {message.role === 'assistant' && message.profilePatches && message.profilePatches.length > 0 && (
                  <div className="ml-8 mt-2 w-[85%] space-y-2">
                    {message.profilePatches.map((patch, pi) => (
                      <AgentProfilePatchCard
                        key={`${patch.role}-${pi}-${patch.fields.map((field) => field.field).join('-')}`}
                        onApply={onApplyProfilePatch}
                        patch={patch}
                      />
                    ))}
                  </div>
                )}

                {message.role === 'assistant' && message.amplified && (
                  <div className="ml-8 mt-2 w-[85%]">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-lavender bg-[#eef2fb] px-3 py-2 text-xs font-medium text-ink">
                      <Megaphone className="h-3.5 w-3.5" />
                      {'count' in message.amplified
                        ? message.amplified.count > 0
                          ? `Notified ${message.amplified.count} matched investor${message.amplified.count === 1 ? '' : 's'}.`
                          : 'No thesis-matched investors yet — strengthen your profile and try again.'
                        : `Couldn't amplify — ${message.amplified.error}`}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lavender">
                  <LogoIcon className="h-3.5 w-3.5 text-ink" />
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-[#f6f3f1] px-3.5 py-2.5">
                  <AgentStatusTrail steps={statusSteps} />
                </div>
              </div>
            )}

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
          </div>
        </div>
      )}

      <InvestorAIPrompt className="py-0" onSubmit={send} />

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
