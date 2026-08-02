import type { ReactNode, RefObject } from 'react';
import { InvestorAIPrompt } from '@/components/InvestorAIAssist';
import { LogoIcon } from '@/components/LogoIcon';
import { cn } from '@/lib/utils';

type AgentConversationShellProps = {
  role: 'founder' | 'investor';
  hasConversation: boolean;
  isLoading: boolean;
  onSubmit: (value: string) => void;
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

export const AgentConversationShell = ({
  role,
  hasConversation,
  isLoading,
  onSubmit,
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
              <div className="mb-7 inline-flex items-center gap-2.5">
                <LogoIcon className="h-8 w-8 text-black" />
                <img src="/apparent-wordmark.png" alt="Apparent" className="h-8 w-auto object-contain" />
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

          </div>
        </div>
      ) : (
        <>
          <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
            <div className="mx-auto w-full max-w-[900px] px-5 py-6 sm:px-10 sm:py-8">
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
