import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  CircleCheckBig,
  FileSearch,
  Globe2,
  Mail,
  Megaphone,
  Search,
  Target,
  UserRoundSearch,
  X,
  type LucideIcon,
} from 'lucide-react';

import { LogoIcon } from '@/components/LogoIcon';

type AgentRole = 'founder' | 'investor';

type AgentUseCase = {
  title: string;
  description: string;
  icon: LucideIcon;
  prompts: [string, string];
};

type AgentUseCasesProps = {
  role: AgentRole;
  onSelectPrompt: (prompt: string) => void;
};

const useCasesByRole: Record<AgentRole, AgentUseCase[]> = {
  investor: [
    {
      title: 'Source thesis-fit founders',
      description: 'Search Apparent first, then broaden to verified founders and startups across the public web.',
      icon: UserRoundSearch,
      prompts: [
        'Show me founders raising now on Apparent who fit my thesis, and explain the fit.',
        'Find developer-tools founders outside Apparent with recent funding or hiring signals.',
      ],
    },
    {
      title: 'Pressure-test an opportunity',
      description: 'Compare a company with your thesis, preferred signals, stage, geography, and available evidence.',
      icon: Target,
      prompts: [
        'Compare my top three founder matches and show the strongest evidence for and against each one.',
        'What would need to be true for this opportunity to fit my thesis? Build me a verification checklist.',
      ],
    },
    {
      title: 'Run company and founder diligence',
      description: 'Research funding, headcount, hiring, founder background, launches, traction, and recent news.',
      icon: FileSearch,
      prompts: [
        'Research this company and founder. Separate verified facts, positive signals, risks, and open questions.',
        'Check whether this startup is gaining momentum through funding, hiring, launches, and current news.',
      ],
    },
    {
      title: 'Map a market',
      description: 'Use live web research and Orthogonal data endpoints to understand a category and its players.',
      icon: Globe2,
      prompts: [
        'Map the current AI developer-tools market by category, notable startups, funding stage, and differentiation.',
        'Research the latest changes in this market and tell me what could create new investment opportunities.',
      ],
    },
    {
      title: 'Prepare founder outreach',
      description: 'Draft specific outreach grounded in the founder\'s work and why it matches your investment thesis.',
      icon: Mail,
      prompts: [
        'Draft personalized outreach to the top three on-platform founders who fit my thesis.',
        'Find one strong off-platform founder, verify the contact path, and prepare an email draft for me.',
      ],
    },
    {
      title: 'Build your investor profile',
      description: 'Turn firm pages, biographies, investment writing, and pasted text into reviewable profile updates.',
      icon: ChartNoAxesCombined,
      prompts: [
        'Set up my investor profile from the firm links and biography I paste next.',
        'Review my current thesis and show me which profile fields would make founder matching more precise.',
      ],
    },
  ],
  founder: [
    {
      title: 'Find thesis-fit investors',
      description: 'Match your company with investors already on Apparent and explain why each thesis fits.',
      icon: UserRoundSearch,
      prompts: [
        'Which investors on Apparent are the strongest fit for what I am building, and why?',
        'Rank the top investors for my round by sector, stage, geography, and thesis overlap.',
      ],
    },
    {
      title: 'Strengthen your fundraising profile',
      description: 'Turn your site, GitHub, launch page, deck text, and traction evidence into reviewable updates.',
      icon: Target,
      prompts: [
        'Set up my founder profile from the links and product information I paste next.',
        'Audit my profile and tell me what evidence is missing before an investor reviews it.',
      ],
    },
    {
      title: 'Research your market',
      description: 'Use live public research and Orthogonal data endpoints to investigate competitors and market shifts.',
      icon: Globe2,
      prompts: [
        'Map my closest competitors and compare their positioning, funding, traction signals, and recent activity.',
        'Research the latest changes in my market and explain what they mean for my fundraising story.',
      ],
    },
    {
      title: 'Prepare for investor meetings',
      description: 'Research an investor, anticipate thesis questions, and build a focused meeting brief.',
      icon: FileSearch,
      prompts: [
        'Prepare me for a meeting with one of my matched investors. Show thesis fit and likely objections.',
        'Pressure-test my fundraising story from an investor perspective and identify weak claims.',
      ],
    },
    {
      title: 'Draft targeted introductions',
      description: 'Write concise messages in your voice, grounded in the investor\'s thesis and your real proof.',
      icon: Mail,
      prompts: [
        'Draft personalized introductions to my top three matched investors for me to review.',
        'Rewrite my investor introduction using my strongest traction and product evidence.',
      ],
    },
    {
      title: 'Get discovered by the right investors',
      description: 'Put your dossier in front of matched Apparent investors without broadcasting it indiscriminately.',
      icon: Megaphone,
      prompts: [
        'Show me how many investors currently match my profile before I choose to notify them.',
        'Put me in front of investors whose thesis matches what I am building.',
      ],
    },
  ],
};

const roleCopy = {
  investor: {
    label: 'Investor workspace',
    context: 'your thesis, Apparent deal flow, live public research, and Orthogonal data endpoints',
  },
  founder: {
    label: 'Founder workspace',
    context: 'your founder profile, Apparent investor network, live public research, and Orthogonal data endpoints',
  },
} as const;

export const AgentUseCases = ({ role, onSelectPrompt }: AgentUseCasesProps) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const copy = roleCopy[role];
  const useCases = useCasesByRole[role];

  const closeDialog = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDialog();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const choosePrompt = (prompt: string) => {
    onSelectPrompt(prompt);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-none border border-[#140206] bg-[#16a34a] px-4 py-2.5 text-sm font-medium text-white shadow-[3px_3px_0_#140206] transition-transform hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#140206]"
      >
        <BookOpen className="h-4 w-4" />
        Explore use cases
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-[#140206]/25 p-3 sm:p-5" onMouseDown={closeDialog}>
          <section
            ref={dialogRef}
            aria-describedby="agent-use-cases-description"
            aria-labelledby="agent-use-cases-title"
            aria-modal="true"
            role="dialog"
            className="agent-page flex max-h-[92dvh] w-full max-w-[960px] flex-col overflow-hidden rounded-none border border-[#140206] bg-[#f7f4ef] shadow-[8px_8px_0_#140206]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-5 border-b border-[#140206] px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex min-w-0 items-start gap-3">
                <LogoIcon className="mt-1 h-7 w-7 shrink-0 text-[#140206]" />
                <div>
                  <p className="agent-use-cases-meta text-[10px] font-medium uppercase tracking-[0.16em] text-black/45">{copy.label}</p>
                  <h2 id="agent-use-cases-title" className="agent-use-cases-display mt-1 text-[26px] leading-none text-[#140206] sm:text-[32px]">
                    What Apparent Agent can do
                  </h2>
                  <p id="agent-use-cases-description" className="mt-3 max-w-[720px] text-sm leading-6 text-black/60">
                    Ask in plain language. Apparent combines {copy.context} to research the question and move the answer into your workflow.
                  </p>
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closeDialog}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-[#140206] bg-transparent text-[#140206] transition-colors hover:bg-[#16a34a] hover:text-white"
                aria-label="Close Agent use cases"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <section aria-labelledby="how-apparent-works">
                <h3 id="how-apparent-works" className="agent-use-cases-display text-xl text-[#140206]">How it works</h3>
                <div className="mt-3 grid border border-[#140206] sm:grid-cols-3 sm:divide-x sm:divide-[#140206]">
                  <div className="border-b border-[#140206] p-4 sm:border-b-0">
                    <Search className="h-5 w-5 text-[#16a34a]" />
                    <p className="mt-3 text-sm font-semibold text-[#140206]">Ask naturally</p>
                    <p className="mt-1 text-xs leading-5 text-black/55">Describe the outcome you need. You do not need to choose a data provider or endpoint.</p>
                  </div>
                  <div className="border-b border-[#140206] p-4 sm:border-b-0">
                    <ChartNoAxesCombined className="h-5 w-5 text-[#16a34a]" />
                    <p className="mt-3 text-sm font-semibold text-[#140206]">Research with context</p>
                    <p className="mt-1 text-xs leading-5 text-black/55">The agent selects relevant Apparent context, public sources, and external data tools.</p>
                  </div>
                  <div className="p-4">
                    <CircleCheckBig className="h-5 w-5 text-[#16a34a]" />
                    <p className="mt-3 text-sm font-semibold text-[#140206]">Review and act</p>
                    <p className="mt-1 text-xs leading-5 text-black/55">Check the evidence, apply profile changes, prepare outreach, or continue the research.</p>
                  </div>
                </div>
              </section>

              <section aria-labelledby="agent-use-case-library" className="mt-7">
                <div>
                  <h3 id="agent-use-case-library" className="agent-use-cases-display text-xl text-[#140206]">Start with a real use case</h3>
                  <p className="mt-1 text-xs leading-5 text-black/50">Choose an example to place it in the chat box. You can edit it before sending.</p>
                </div>

                <div className="mt-4 grid gap-x-7 sm:grid-cols-2">
                  {useCases.map((useCase) => {
                    const Icon = useCase.icon;
                    return (
                      <article key={useCase.title} className="border-t border-[#140206] py-5">
                        <div className="flex items-start gap-3">
                          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#16a34a]" />
                          <div>
                            <h4 className="agent-use-cases-display text-lg leading-tight text-[#140206]">{useCase.title}</h4>
                            <p className="mt-1 text-xs leading-5 text-black/55">{useCase.description}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-2">
                          {useCase.prompts.map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              onClick={() => choosePrompt(prompt)}
                              className="group flex w-full items-start justify-between gap-4 rounded-none border border-[#140206]/35 bg-transparent px-3 py-2.5 text-left transition-colors hover:border-[#140206] hover:bg-[#e2f7ec] active:translate-y-px"
                              aria-label={`Use prompt: ${prompt}`}
                            >
                              <span className="text-xs leading-5 text-[#140206]">{prompt}</span>
                              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-black/40 transition-transform group-hover:translate-x-0.5 group-hover:text-[#16a34a]" />
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <div className="flex items-start gap-3 border border-[#140206]/35 px-4 py-3 text-xs leading-5 text-black/55">
                <LogoIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#140206]" />
                <p>
                  Need a specialist workflow? Install Agent Skills and type <span className="font-semibold text-[#140206]">/</span> in chat. Your role, permissions, research limits, and privacy boundaries still apply.
                </p>
              </div>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
};
