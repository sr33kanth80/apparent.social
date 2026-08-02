import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, ExternalLink, Loader2, Mail, Maximize2, Minimize2, Send, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { AgentConversationShell } from '@/components/AgentConversationShell';
import { AgentMarkdown } from '@/components/AgentMarkdown';
import {
  AgentStatusTrail,
  appendStatus,
  CopyAnswerButton,
  postAgentStream,
  ResearchTrailDisclosure,
  useTypewriterReveal,
} from '@/components/agent-stream';
import { AgentProfilePatchCard } from '@/components/AgentProfilePatchCard';
import { InvestorAIPrompt } from '@/components/InvestorAIAssist';
import { LogoIcon } from '@/components/LogoIcon';
import { useAgentAuthHeaders } from '@/lib/agent-auth';
import type { AgentChatHistoryMessage, AgentMemory, AgentProfilePatch } from '@/lib/apparent-types';
import { cn } from '@/lib/utils';

export type OutreachProposal = {
  founderId: string;
  founderName: string;
  subject: string;
  body: string;
};

export type OutreachResult = { ok: boolean; reason?: string };

/** Off-platform intro the investor sends from their own inbox (never auto-sent). */
export type EmailDraft = {
  founderName: string;
  company: string;
  toEmail: string;
  subject: string;
  body: string;
  sourceUrl: string;
};

type ProposalStatus = 'pending' | 'sending' | 'sent' | 'skipped' | 'error';
type ProposalState = OutreachProposal & { status: ProposalStatus; reason?: string };

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  proposals?: ProposalState[];
  emailDrafts?: EmailDraft[];
  profilePatches?: AgentProfilePatch[];
  /** Research steps that produced this reply, kept for the collapsed trail. */
  steps?: string[];
};

const EmailDraftCard = ({ draft, flat = false }: { draft: EmailDraft; flat?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const mailtoHref = `mailto:${draft.toEmail}?subject=${encodeURIComponent(draft.subject || '')}&body=${encodeURIComponent(draft.body || '')}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${draft.subject ? `Subject: ${draft.subject}\n\n` : ''}${draft.body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={flat ? 'rounded-2xl border border-black/10 bg-white p-4' : 'rounded-xl border border-black/10 bg-white p-3'}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-black">
          {draft.founderName || 'Founder'}
          {draft.company ? ` · ${draft.company}` : ''}
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#f6f3f1] px-2 py-0.5 text-[10px] font-medium text-gray-500">
          <Mail className="h-3 w-3" /> Off-platform
        </span>
      </div>
      <p className="text-[11px] text-gray-500">{draft.toEmail || 'No email found — send via the source below or your own channel'}</p>
      {draft.subject && <p className="mt-1 text-xs font-medium text-gray-600">{draft.subject}</p>}
      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-600">{draft.body}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {draft.toEmail && (
          <a
            href={mailtoHref}
            className="inline-flex items-center gap-1 rounded-lg bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-black"
          >
            <Mail className="h-3 w-3" /> Open email
          </a>
        )}
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:text-black"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}
        </button>
        {draft.sourceUrl && (
          <a
            href={draft.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:text-black"
          >
            <ExternalLink className="h-3 w-3" /> Source
          </a>
        )}
      </div>
    </div>
  );
};

interface InvestorAgentChatProps {
  /** The investor's saved criteria (intakeValues) — passed to the agent for thesis-aware sourcing. */
  criteria: Record<string, string>;
  memories: AgentMemory[];
  threadId: string | null;
  persistedMessages: AgentChatHistoryMessage[];
  persistedMessagesLoaded: boolean;
  /** Founder ids the investor has already messaged — the agent avoids re-proposing them. */
  contactedFounderIds: string[];
  /** Performs the actual RLS-authenticated send (and guardrail enforcement). */
  onSendOutreach: (proposal: OutreachProposal) => Promise<OutreachResult>;
  onApplyProfilePatch: (patch: AgentProfilePatch, fields: string[]) => Promise<OutreachResult>;
  onPersistMessages: (
    messages: AgentChatHistoryMessage[],
    suggestedTitle?: string,
    threadId?: string | null,
  ) => Promise<string>;
  onStartNewConversation: () => void;
  onRememberConversation: (userMessage: string, assistantReply: string, threadId: string) => Promise<void>;
  pageMode?: boolean;
  className?: string;
}

const SUGGESTIONS = [
  'Set up my investor profile from links I paste',
  'Show me founders raising now that fit my thesis',
  'Find developer-tools founders on Apparent and draft intros to the top 3',
  'Find founders NOT on Apparent that fit my thesis and prep intros',
];

/** Spring used for the prompt box flying between its in-page spot and the fullscreen bottom dock. */
const DOCK_TRANSITION = { type: 'spring', bounce: 0.18, duration: 0.55 } as const;

export const InvestorAgentChat = ({
  criteria,
  memories,
  threadId,
  persistedMessages,
  persistedMessagesLoaded,
  contactedFounderIds,
  onSendOutreach,
  onApplyProfilePatch,
  onPersistMessages,
  onStartNewConversation,
  onRememberConversation,
  pageMode = false,
  className,
}: InvestorAgentChatProps) => {
  const authHeaders = useAgentAuthHeaders();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Live progress labels streamed from the agent while it researches ("Searching…").
  const [statusSteps, setStatusSteps] = useState<string[]>([]);
  const { reveal, startReveal, stopReveal } = useTypewriterReveal();
  // Fullscreen chat mode — entered automatically on send, exited via minimize/Esc.
  const [expanded, setExpanded] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const activeThreadRef = useRef<string | null>(threadId);

  const toHistoryMessages = (items: ChatMessage[]): AgentChatHistoryMessage[] =>
    items.map((item) => ({
      role: item.role,
      content: item.content,
      payload: {
        proposals: item.proposals,
        emailDrafts: item.emailDrafts,
        profilePatches: item.profilePatches,
        steps: item.steps,
      },
    }));

  const fromHistoryMessages = (items: AgentChatHistoryMessage[]): ChatMessage[] =>
    items.map((item) => ({
      role: item.role,
      content: item.content,
      proposals: Array.isArray(item.payload?.proposals) ? (item.payload.proposals as ProposalState[]) : undefined,
      emailDrafts: Array.isArray(item.payload?.emailDrafts) ? (item.payload.emailDrafts as EmailDraft[]) : undefined,
      profilePatches: Array.isArray(item.payload?.profilePatches) ? (item.payload.profilePatches as AgentProfilePatch[]) : undefined,
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
  }, [messages, isLoading, expanded, statusSteps, reveal]);

  // Fullscreen chat: lock the page scroll behind the overlay and close on Escape.
  useEffect(() => {
    if (!expanded || pageMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded, pageMode]);

  // Patch a single proposal's status inside a specific assistant message.
  const patchProposal = (
    messageIndex: number,
    proposalIndex: number,
    patch: Partial<ProposalState>,
    targetThreadId: string | null = threadId,
  ) => {
    setMessages((current) => {
      const next = current.map((message, mi) => {
        if (mi !== messageIndex || !message.proposals) return message;
        return {
          ...message,
          proposals: message.proposals.map((proposal, pi) =>
            pi === proposalIndex ? { ...proposal, ...patch } : proposal,
          ),
        };
      });
      void persistTranscript(next, undefined, targetThreadId);
      return next;
    });
  };

  const executeProposal = async (
    messageIndex: number,
    proposalIndex: number,
    proposal: ProposalState,
    targetThreadId: string | null = threadId,
  ) => {
    patchProposal(messageIndex, proposalIndex, { status: 'sending' }, targetThreadId);
    try {
      const result = await onSendOutreach(proposal);
      patchProposal(messageIndex, proposalIndex, {
        status: result.ok ? 'sent' : 'skipped',
        reason: result.reason,
      }, targetThreadId);
    } catch (err) {
      patchProposal(messageIndex, proposalIndex, {
        status: 'error',
        reason: err instanceof Error ? err.message : 'Send failed',
      }, targetThreadId);
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loadingRef.current) return;

    loadingRef.current = true;
    if (!pageMode) setExpanded(true);
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
        '/api/agent',
        {
          messages: conversation.map((m) => ({ role: m.role, content: m.content })),
          criteria,
          memories,
          autonomy: 'autonomous',
          contacted: contactedFounderIds,
        },
        await authHeaders(),
        (label) => {
          if (trail[trail.length - 1] !== label) trail.push(label);
          setStatusSteps((steps) => appendStatus(steps, label));
        },
      );

      const assistantReply = String(data.reply ?? '');
      const rawProposals: OutreachProposal[] = Array.isArray(data.proposals) ? data.proposals : [];
      const emailDrafts: EmailDraft[] = Array.isArray(data.emailDrafts) ? data.emailDrafts : [];
      const profilePatches: AgentProfilePatch[] = Array.isArray(data.profilePatches) ? data.profilePatches : [];
      const auto = true;
      const proposalStates: ProposalState[] = rawProposals.map((proposal) => ({
        ...proposal,
        status: auto ? 'sending' : 'pending',
      }));

      const assistantIndex = conversation.length;
      let nextConversation: ChatMessage[] = [
        ...conversation,
        {
          role: 'assistant',
          content: assistantReply,
          proposals: proposalStates.length ? proposalStates : undefined,
          emailDrafts: emailDrafts.length ? emailDrafts : undefined,
          profilePatches: profilePatches.length ? profilePatches : undefined,
          steps: trail.length ? trail : undefined,
        },
      ];
      if (activeThreadRef.current === conversationThreadId) {
        setMessages(nextConversation);
        startReveal(assistantReply.length);
      }
      void persistTranscript(nextConversation, undefined, conversationThreadId);

      // Auto modes send immediately; manual mode waits for the investor to approve.
      if (auto && proposalStates.length && assistantIndex >= 0) {
        for (let i = 0; i < proposalStates.length; i += 1) {
          nextConversation = nextConversation.map((message, messageIndex) => (
            messageIndex === assistantIndex && message.proposals
              ? { ...message, proposals: message.proposals.map((proposal, proposalIndex) => (
                  proposalIndex === i ? { ...proposal, status: 'sending' } : proposal
                )) }
              : message
          ));
          if (activeThreadRef.current === conversationThreadId) setMessages(nextConversation);
          void persistTranscript(nextConversation, undefined, conversationThreadId);

          let outcome: Partial<ProposalState>;
          try {
            const result = await onSendOutreach(proposalStates[i]);
            outcome = { status: result.ok ? 'sent' : 'skipped', reason: result.reason };
          } catch (err) {
            outcome = { status: 'error', reason: err instanceof Error ? err.message : 'Send failed' };
          }
          nextConversation = nextConversation.map((message, messageIndex) => (
            messageIndex === assistantIndex && message.proposals
              ? { ...message, proposals: message.proposals.map((proposal, proposalIndex) => (
                  proposalIndex === i ? { ...proposal, ...outcome } : proposal
                )) }
              : message
          ));
          if (activeThreadRef.current === conversationThreadId) setMessages(nextConversation);
          void persistTranscript(nextConversation, undefined, conversationThreadId);
        }
      }

      void onRememberConversation(trimmed, assistantReply, conversationThreadId);
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

  const statusTrail = <AgentStatusTrail steps={statusSteps} />;

  const renderProposal = (messageIndex: number, proposal: ProposalState, proposalIndex: number, flat = false) => {
    const statusBadge = () => {
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
        key={`${proposal.founderId}-${proposalIndex}`}
        className={flat ? 'rounded-2xl border border-black/10 bg-white p-4' : 'rounded-xl border border-black/10 bg-white p-3'}
      >
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
              className="inline-flex items-center gap-1 rounded-lg bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-black"
            >
              <Send className="h-3 w-3" /> Send DM
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

  const suggestionChips = (centered = false) => (
    <div className={`flex flex-wrap gap-2 ${centered ? 'justify-center' : ''}`}>
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
  );

  // Assistant bubbles sit on white in the compact card, but on the cream page
  // background in fullscreen — swap surfaces so they stay visible in both.
  const assistantBubbleClass = expanded
    ? 'max-w-[85%] rounded-2xl rounded-bl-sm border border-black/5 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-gray-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)]'
    : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-[#f6f3f1] px-3.5 py-2.5 text-sm leading-relaxed text-gray-800';

  const transcript = (
    <>
      {messages.map((message, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={message.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start'}
        >
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
                  : assistantBubbleClass
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

          {message.role === 'assistant' && message.emailDrafts && message.emailDrafts.length > 0 && (
            <div className="ml-8 mt-2 w-[85%] space-y-2">
              {message.emailDrafts.map((draft, di) => (
                <EmailDraftCard key={`${draft.toEmail || draft.founderName}-${di}`} draft={draft} />
              ))}
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
        </motion.div>
      ))}

      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex justify-start"
        >
          <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lavender">
            <LogoIcon className="h-3.5 w-3.5 text-ink" />
          </div>
          <div
            className={`rounded-2xl rounded-bl-sm px-3.5 py-2.5 ${
              expanded ? 'border border-black/5 bg-white' : 'bg-[#f6f3f1]'
            }`}
          >
            {statusTrail}
          </div>
        </motion.div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
      )}
    </>
  );

  // Shared element: the prompt box glides between its in-page spot and the
  // fullscreen bottom dock via framer-motion's layoutId.
  const promptDock = (
    <motion.div layoutId="agent-prompt-dock" transition={DOCK_TRANSITION}>
      <InvestorAIPrompt
        className="py-0"
        onSubmit={send}
        autoFocus={expanded}
      />
    </motion.div>
  );

  if (pageMode) {
    const pageTranscript = (
      <div>
        {messages.map((message, index) => (
          <motion.article
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
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
                <p className="mb-1.5 text-sm font-medium text-[#16a34a]">Apparent</p>

                <ResearchTrailDisclosure steps={message.steps} />

                <AgentMarkdown className="agent-research-answer max-w-[800px] text-base leading-6 text-[#333333]">
                  {visibleAssistantText(message, index)}
                </AgentMarkdown>

                {message.proposals && message.proposals.length > 0 && (
                  <div className="mt-4 grid gap-3">{message.proposals.map((proposal, pi) => renderProposal(index, proposal, pi, true))}</div>
                )}

                {message.emailDrafts && message.emailDrafts.length > 0 && (
                  <div className="mt-4 grid gap-3">
                    {message.emailDrafts.map((draft, di) => (
                      <EmailDraftCard key={`${draft.toEmail || draft.founderName}-${di}`} draft={draft} flat />
                    ))}
                  </div>
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

                {(reveal === null || index !== messages.length - 1) && (
                  <div className="mt-4">
                    <CopyAnswerButton text={message.content} />
                  </div>
                )}
              </div>
            )}
          </motion.article>
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 border-t border-[#d6d6d6] pt-6"
          >
            <p className="mb-3 text-sm font-medium text-[#333333]">Apparent</p>
            {statusTrail}
          </motion.div>
        )}

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      </div>
    );

    return (
      <AgentConversationShell
        className={className}
        hasConversation={hasConversation}
        isLoading={isLoading}
        onSubmit={send}
        role="investor"
        suggestions={SUGGESTIONS}
        transcript={pageTranscript}
        transcriptRef={transcriptRef}
      />
    );
  }

  return (
    <div className={className}>
      {!expanded && (
        <>
          {hasConversation && (
            <div className="mb-3 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between border-b border-black/5 px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-black">
                  <LogoIcon className="h-4 w-4 text-ink" />
                  Apparent agent
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-[#f6f3f1] hover:text-black"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Expand
                  </button>
                  <button
                    type="button"
                    onClick={clear}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-[#f6f3f1] hover:text-black"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                </div>
              </div>

              <div ref={transcriptRef} className="max-h-[460px] space-y-4 overflow-y-auto px-4 py-4">
                {transcript}
              </div>
            </div>
          )}

          {promptDock}


          {!hasConversation && <div className="mt-3">{suggestionChips()}</div>}
        </>
      )}

      {/* Portal to <body>: ancestors animated by framer-motion keep transform/filter
          styles that would otherwise re-anchor this fixed overlay to the page content. */}
      {createPortal(
        <AnimatePresence>
        {expanded && (
          <motion.div
            key="agent-chat-overlay"
            className="monad-app fixed inset-0 z-[120] flex flex-col bg-parchment"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-black">
                <LogoIcon className="h-4 w-4 text-ink" />
                Apparent agent
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {hasConversation && (
                  <button
                    type="button"
                    onClick={clear}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-black/5 hover:text-black"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  title="Minimize (Esc)"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-black/5 hover:text-black"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  Minimize
                </button>
              </div>
            </div>

            <div ref={transcriptRef} className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6">
                {!hasConversation && !isLoading && (
                  <div className="flex flex-col items-center gap-4 pt-20 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-lavender">
                      <LogoIcon className="h-5 w-5 text-ink" />
                    </div>
                    <p className="text-sm text-gray-500">Ask the agent to source founders, rank them against your thesis, or draft outreach.</p>
                    {suggestionChips(true)}
                  </div>
                )}
                {transcript}
              </div>
            </div>

            <div className="px-4 pb-5 pt-1 sm:px-6">
              <div className="mx-auto w-full max-w-3xl">
                {promptDock}
                <p className="mt-2 text-center text-[11px] text-gray-400">
                  Enter to send · Shift+Enter for a new line · Esc to minimize
                </p>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};
