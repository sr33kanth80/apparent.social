import type { ReactNode, RefObject } from 'react';
import { ArrowUpRight, Megaphone, PenLine, Plus, Search, ShieldCheck, Sparkles } from 'lucide-react';

import { InvestorAIPrompt } from '@/components/InvestorAIAssist';
import { LogoIcon } from '@/components/LogoIcon';
import { cn } from '@/lib/utils';

type AgentConversationShellProps = {
  role: 'founder' | 'investor';
  hasConversation: boolean;
  isLoading: boolean;
  onSubmit: (value: string) => void;
  onNewConversation?: () => void;
  suggestions: string[];
  transcript: ReactNode;
  transcriptRef: RefObject<HTMLDivElement | null>;
  toolbarExtras?: ReactNode;
  className?: string;
};

const roleCopy = {
  founder: {
    eyebrow: 'Founder research workspace',
    title: 'What do you want to move forward?',
    description: 'Research investors, sharpen your profile, and turn fundraising context into a clear next move.',
    placeholder: 'Ask Apparent about your profile, investors, outreach, or next move',
    context: 'Grounded in your founder profile and Apparent network',
    suggestionLabels: ['Research investors', 'Improve my profile', 'Draft an introduction', 'Plan outreach'],
  },
  investor: {
    eyebrow: 'Investor research workspace',
    title: 'What do you want to know?',
    description: 'Research founders, pressure-test fit, and move the strongest opportunities into your workflow.',
    placeholder: 'Ask Apparent about founders, thesis fit, diligence, or outreach',
    context: 'Grounded in your thesis and Apparent deal flow',
    suggestionLabels: ['Source founders', 'Test thesis fit', 'Draft outreach', 'Plan diligence'],
  },
} as const;

const SUGGESTION_ICONS = [Search, Sparkles, PenLine, Megaphone];

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
        'ed-agent-chat-scope agent-page flex h-full min-h-0 flex-col overflow-hidden bg-[#fdf9f7]',
        className,
      )}
    >
      {!hasConversation && !isLoading ? (
        <div className="flex min-h-0 flex-1 overflow-y-auto px-5 sm:px-10">
          <div className="m-auto w-full max-w-[900px] py-10 sm:py-14">
            <nav aria-label="Agent capabilities" className="mb-12 flex flex-wrap items-center justify-center gap-1 sm:mb-16">
              {copy.suggestionLabels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onSubmit(suggestions[index] ?? label)}
                  className={cn(
                    'rounded-full px-3 py-2 text-sm transition-colors',
                    index === 0
                      ? 'bg-[#003f2e] text-[#fdf9f7]'
                      : 'text-[#6e7673] hover:bg-[#f4efea] hover:text-[#333333]',
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="text-center">
              <div className="mb-7 inline-flex items-center gap-2.5 text-[#003f2e]">
                <LogoIcon className="h-7 w-7" />
                <span className="text-[28px] font-medium tracking-[-0.045em]">Apparent</span>
              </div>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#6e7673]">{copy.eyebrow}</p>
              <h1 className="text-balance text-[28px] font-medium leading-tight tracking-[-0.035em] text-[#333333] sm:text-[34px]">{copy.title}</h1>
              <p className="mx-auto mt-3 max-w-[620px] text-sm leading-6 text-[#6e7673]">{copy.description}</p>
            </div>

            <div className="mx-auto mt-9 max-w-[680px] text-left">
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

            <div className="mx-auto mt-5 grid max-w-[680px] gap-3 text-left sm:grid-cols-2">
              {suggestions.map((suggestion, index) => {
                const Icon = SUGGESTION_ICONS[index % SUGGESTION_ICONS.length];
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onSubmit(suggestion)}
                    className="group flex min-h-[104px] items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#f8f3ef]"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#003f2e]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3 text-sm font-medium text-[#333333]">
                        {copy.suggestionLabels[index] ?? 'Explore'}
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#a6a6a6] transition-colors group-hover:text-[#003f2e]" />
                      </span>
                      <span className="mt-1.5 block text-[13px] leading-5 text-[#6e7673]">{suggestion}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-[#a6a6a6]">
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
            <div className="mx-auto w-full max-w-[900px] px-5 py-6 sm:px-10 sm:py-8">
              {onNewConversation && (
                <div className="mb-8 flex justify-end">
                  <button
                    type="button"
                    onClick={onNewConversation}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#d6d6d6] px-3 py-2 text-xs text-[#6e7673] transition-colors hover:border-[#003f2e] hover:text-[#003f2e]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New thread
                  </button>
                </div>
              )}
              {transcript}
            </div>
          </div>

          <div className="relative shrink-0 bg-[#fdf9f7] px-5 pb-5 pt-2 sm:px-10 sm:pb-6">
            <div className="mx-auto w-full max-w-[680px]">
              <InvestorAIPrompt
                animatePlaceholder={false}
                className="py-0"
                onSubmit={onSubmit}
                placeholder="Ask a follow-up"
                showAttachment={false}
                surface="parchment"
                threadMode
                toolbarExtras={toolbarExtras}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
};
