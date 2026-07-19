import type { ReactNode, RefObject } from 'react';
import { Megaphone, PenLine, Plus, Search, ShieldCheck, Sparkles } from 'lucide-react';

import { InvestorAIPrompt } from '@/components/InvestorAIAssist';
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
    title: 'What do you want to move forward?',
    description: 'Research investors, sharpen your profile, draft introductions, and turn your fundraising context into action.',
    placeholder: 'Ask Apparent about your profile, investors, outreach, or next move',
    context: 'Grounded in your founder profile and Apparent network',
  },
  investor: {
    title: 'What do you want to know?',
    description: 'Research founders, pressure-test fit, draft outreach, and move the strongest opportunities into your workflow.',
    placeholder: 'Ask Apparent about founders, thesis fit, diligence, or outreach',
    context: 'Grounded in your thesis and Apparent deal flow',
  },
} as const;

// Icon cycle for the suggestion cards — search, discover, draft, amplify.
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
        'ed-agent-chat-scope flex h-full min-h-0 flex-col overflow-hidden bg-[#fdf9f7]',
        className,
      )}
    >
      {!hasConversation && !isLoading ? (
        <div className="flex min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10">
          <div className="m-auto w-full max-w-[900px] py-6 text-center sm:py-12">
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.035em] text-black sm:text-4xl">{copy.title}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-[15px]">{copy.description}</p>

            <div className="mx-auto mt-10 max-w-[720px] text-left">
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

            <div className="mx-auto mt-8 grid max-w-[720px] gap-3 text-left sm:grid-cols-2">
              {suggestions.map((suggestion, index) => {
                const Icon = SUGGESTION_ICONS[index % SUGGESTION_ICONS.length];
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onSubmit(suggestion)}
                    className="group flex items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-colors hover:bg-white/70"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-black" />
                    <span className="text-sm leading-5 text-gray-700 transition-colors group-hover:text-black">{suggestion}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-gray-400">
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
                <div className="mb-6 flex justify-end">
                  <button
                    type="button"
                    onClick={onNewConversation}
                    className="inline-flex items-center gap-1.5 rounded-md border border-black/10 px-2.5 py-1.5 text-xs text-gray-500 transition-colors hover:border-black/25 hover:text-black"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New thread
                  </button>
                </div>
              )}
              {transcript}
            </div>
          </div>

          <div className="relative shrink-0 bg-[#fdf9f7] px-5 pb-4 pt-2 sm:px-10 sm:pb-5">
            <div className="mx-auto w-full max-w-[900px]">
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
