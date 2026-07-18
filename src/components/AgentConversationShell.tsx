import type { ReactNode, RefObject } from 'react';
import { ArrowUpRight, Plus, ShieldCheck, Sparkles } from 'lucide-react';

import { InvestorAIPrompt } from '@/components/InvestorAIAssist';
import { LogoIcon } from '@/components/LogoIcon';
import { cn } from '@/lib/utils';

type AgentConversationShellProps = {
  role: 'founder' | 'investor';
  hasConversation: boolean;
  isLoading: boolean;
  onSubmit: (value: string) => void;
  onNewConversation: () => void;
  suggestions: string[];
  transcript: ReactNode;
  transcriptRef: RefObject<HTMLDivElement | null>;
  toolbarExtras?: ReactNode;
  className?: string;
};

const roleCopy = {
  founder: {
    eyebrow: 'Founder workspace',
    title: 'What do you want to move forward?',
    description: 'Research investors, sharpen your profile, draft introductions, and turn your fundraising context into action.',
    placeholder: 'Ask Apparent about your profile, investors, outreach, or next move',
    context: 'Grounded in your founder profile and Apparent network',
  },
  investor: {
    eyebrow: 'Investor workspace',
    title: 'What do you want to know?',
    description: 'Research founders, pressure-test fit, draft outreach, and move the strongest opportunities into your workflow.',
    placeholder: 'Ask Apparent about founders, thesis fit, diligence, or outreach',
    context: 'Grounded in your thesis and Apparent deal flow',
  },
} as const;

export const AgentConversationShell = ({
  role,
  hasConversation,
  isLoading,
  onSubmit,
  onNewConversation,
  suggestions,
  transcript,
  transcriptRef,
  toolbarExtras,
  className,
}: AgentConversationShellProps) => {
  const copy = roleCopy[role];

  return (
    <section
      className={cn(
        'ed-agent-chat-scope flex h-full min-h-0 flex-col overflow-hidden bg-[#fdf9f7]',
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-black/[0.07] bg-[#fdf9f7]/95 px-5 py-3.5 backdrop-blur-xl sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-charcoal text-white shadow-sm">
            <LogoIcon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold text-black">Apparent Agent</h1>
              <span className="hidden h-1.5 w-1.5 rounded-full bg-[#039861] sm:block" />
            </div>
            <p className="truncate text-[11px] text-gray-500">{copy.eyebrow}</p>
          </div>
        </div>

        {hasConversation && (
          <button
            type="button"
            onClick={onNewConversation}
            title="Start a new conversation"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-[#f6f1e8] px-3.5 text-xs font-semibold text-gray-700 transition hover:border-black/20 hover:bg-[#efe7da] hover:text-black"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New conversation</span>
            <span className="sm:hidden">New</span>
          </button>
        )}
      </header>

      {!hasConversation && !isLoading ? (
        <div className="flex min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-8">
          <div className="m-auto w-full max-w-4xl py-4 text-center sm:py-10">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
              <Sparkles className="h-5 w-5 text-ink" />
            </div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Ask Apparent</p>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.035em] text-black sm:text-4xl">{copy.title}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-[15px]">{copy.description}</p>

            <div className="mx-auto mt-8 max-w-3xl text-left">
              <InvestorAIPrompt
                animatePlaceholder={false}
                autoFocus
                className="py-0"
                onSubmit={onSubmit}
                placeholder={copy.placeholder}
                showAttachment={false}
                surface="parchment"
                toolbarExtras={toolbarExtras}
              />
            </div>

            <div className="mx-auto mt-5 grid max-w-3xl gap-2 text-left sm:grid-cols-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSubmit(suggestion)}
                  className="group flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-black/10 bg-[#f6f1e8] px-4 py-3 text-left text-sm leading-5 text-gray-700 transition hover:-translate-y-0.5 hover:border-black/20 hover:bg-[#efe7da]"
                >
                  <span>{suggestion}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-black" />
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                {copy.context}
              </span>
              <span>Follow-ups keep this conversation in context</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
            <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-10">{transcript}</div>
          </div>

          <div className="relative shrink-0 border-t border-black/[0.07] bg-[#fdf9f7]/95 px-4 pb-4 pt-3 backdrop-blur-xl sm:px-8 sm:pb-5">
            <div className="mx-auto w-full max-w-4xl">
              <InvestorAIPrompt
                animatePlaceholder={false}
                className="py-0"
                onSubmit={onSubmit}
                placeholder="Ask a follow-up"
                showAttachment={false}
                surface="parchment"
                toolbarExtras={toolbarExtras}
              />
              <p className="mt-2 text-center text-[10px] text-gray-400">Enter to send · Shift+Enter for a new line</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
