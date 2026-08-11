import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ArrowLeft, ArrowRight, CircleCheckBig, Search, ShieldCheck } from 'lucide-react';
import { AgentUseCases, type AgentUseCaseDemoSelection } from '@/components/AgentUseCases';
import {
  InvestorAIPrompt,
  type AgentPromptSkill,
  type AgentPromptSubmitOptions,
} from '@/components/InvestorAIAssist';
import { LogoIcon } from '@/components/LogoIcon';
import { cn } from '@/lib/utils';

type AgentConversationShellProps = {
  role: 'founder' | 'investor';
  hasConversation: boolean;
  isLoading: boolean;
  onSubmit: (value: string, options?: AgentPromptSubmitOptions) => void;
  transcript: ReactNode;
  transcriptRef: RefObject<HTMLDivElement | null>;
  toolbarExtras?: ReactNode;
  skillCommands?: AgentPromptSkill[];
  activeSkillId?: string;
  onSkillCommandSelect?: (skill: AgentPromptSkill) => void;
  className?: string;
};

const roleCopy = {
  founder: {
    eyebrow: 'Founder research workspace',
    title: 'What do you want to move forward?',
    description: 'Research investors, sharpen your profile, and turn fundraising context into a clear next move.',
    placeholder: 'Ask Apparent about your profile, investors, outreach, or next move',
    context: 'Grounded in your founder profile and Apparent network',
  },
  investor: {
    eyebrow: 'Investor research workspace',
    title: 'What do you want to know?',
    description: 'Research founders, pressure-test fit, and move the strongest opportunities into your workflow.',
    placeholder: 'Ask Apparent about founders, thesis fit, diligence, or outreach',
    context: 'Grounded in your thesis and Apparent deal flow',
  },
} as const;

const AgentUseCaseDemoThread = ({
  selection,
  onBack,
  onRun,
}: {
  selection: AgentUseCaseDemoSelection;
  onBack: () => void;
  onRun: () => void;
}) => {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div>
      <article className="flex justify-end pb-8 pt-2">
        <div className="max-w-[85%] rounded-2xl border border-black/15 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_3px_0_rgba(51,51,51,0.16),0_10px_24px_rgba(51,51,51,0.08)] sm:max-w-[72%]">
          <p className="whitespace-pre-wrap text-[15px] leading-6 text-[#333333] sm:text-base">{selection.prompt}</p>
        </div>
      </article>

      <article className="pb-10">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-[#16a34a]">Apparent</p>
          <span className="agent-use-cases-meta rounded-none border border-[#140206] bg-[#e2f7ec] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-[#140206]">
            Pre-run demo
          </span>
        </div>

        <div className="mt-4 border border-[#140206] bg-[#e2f7ec] px-4 py-3 text-xs leading-5 text-[#140206]">
          This is a preloaded example, not a live Agent response. No external endpoint was called, no current result was fetched, and nothing has been added to your chat history.
        </div>

        <div className="agent-research-answer mt-6 max-w-[800px] text-[#333333]">
          <h2 ref={headingRef} tabIndex={-1} className="agent-use-cases-display text-[26px] leading-tight text-[#140206] outline-none">{selection.title}</h2>
          <p className="mt-2 max-w-[700px] text-sm leading-6 text-black/60">
            Here is how Apparent would approach this request and organize the result when it runs against your live workspace.
          </p>

          <section aria-labelledby="demo-research-trail" className="mt-7">
            <h3 id="demo-research-trail" className="agent-use-cases-display text-xl text-[#140206]">Research trail</h3>
            <div className="mt-3 max-w-[680px] border-t border-[#140206]">
              {selection.demo.research.map((item) => (
                <div key={item} className="flex items-start gap-3 border-b border-[#140206]/20 py-3">
                  <Search className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" />
                  <p className="text-sm leading-6 text-black/60">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="demo-loaded-result" className="mt-7">
            <h3 id="demo-loaded-result" className="agent-use-cases-display text-xl text-[#140206]">Illustrative result</h3>
            <div className="mt-3 max-w-[760px] border border-[#140206] bg-[#f7f4ef]">
              {selection.demo.result.map((item) => (
                <div key={item.label} className="grid gap-1 border-b border-[#140206]/20 px-4 py-4 last:border-b-0 sm:grid-cols-[140px_1fr] sm:gap-5">
                  <p className="text-sm font-semibold text-[#140206]">{item.label}</p>
                  <p className="text-sm leading-6 text-black/60">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex max-w-[760px] items-start gap-2 text-sm leading-6 text-black/60">
              <CircleCheckBig className="mt-1 h-4 w-4 shrink-0 text-[#16a34a]" />
              <p>From here, Apparent could {selection.demo.next}.</p>
            </div>
          </section>

          <div className="mt-8 flex max-w-[760px] flex-col-reverse gap-3 border-t border-[#140206] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-2 rounded-none border border-[#140206]/55 px-4 py-2.5 text-sm font-medium text-[#140206] transition-colors hover:border-[#140206] hover:bg-black/[0.04]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to use cases
            </button>
            <button
              type="button"
              onClick={onRun}
              className="inline-flex items-center justify-center gap-2 rounded-none border border-[#140206] bg-[#16a34a] px-4 py-2.5 text-sm font-medium text-white shadow-[3px_3px_0_#140206] transition-transform hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#140206]"
            >
              Run with my data
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    </div>
  );
};

export const AgentConversationShell = ({
  role,
  hasConversation,
  isLoading,
  onSubmit,
  transcript,
  transcriptRef,
  toolbarExtras,
  skillCommands,
  activeSkillId,
  onSkillCommandSelect,
  className,
}: AgentConversationShellProps) => {
  const copy = roleCopy[role];
  const [demoSelection, setDemoSelection] = useState<AgentUseCaseDemoSelection | null>(null);

  const runDemoPrompt = () => {
    if (!demoSelection) return;
    const prompt = demoSelection.prompt;
    setDemoSelection(null);
    onSubmit(prompt);
  };

  return (
    <section
      className={cn(
        'ed-agent-chat-scope agent-page flex h-full min-h-0 flex-col overflow-hidden bg-[#fdf9f7]',
        className,
      )}
    >
      {!hasConversation && !isLoading && !demoSelection ? (
        <div className="flex min-h-0 flex-1 overflow-y-auto px-5 sm:px-10">
          <div className="m-auto w-full max-w-[900px] py-10 sm:py-14">
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
                skillCommands={skillCommands}
                activeSkillId={activeSkillId}
                onSkillCommandSelect={onSkillCommandSelect}
              />
            </div>

            <div className="mt-6 flex justify-center">
              <AgentUseCases role={role} onPreviewDemo={setDemoSelection} />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-[#a6a6a6]">
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
              {demoSelection ? (
                <AgentUseCaseDemoThread
                  selection={demoSelection}
                  onBack={() => setDemoSelection(null)}
                  onRun={runDemoPrompt}
                />
              ) : transcript}
            </div>
          </div>

          {!demoSelection && (
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
                  skillCommands={skillCommands}
                  activeSkillId={activeSkillId}
                  onSkillCommandSelect={onSkillCommandSelect}
                />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
