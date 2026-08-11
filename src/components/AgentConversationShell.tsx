import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ArrowLeft, ArrowRight, Clock3, ExternalLink, ShieldCheck } from 'lucide-react';
import { AgentMarkdown } from '@/components/AgentMarkdown';
import { AgentUseCases, type AgentUseCaseDemoSelection } from '@/components/AgentUseCases';
import {
  InvestorAIPrompt,
  type AgentPromptSkill,
  type AgentPromptSubmitOptions,
} from '@/components/InvestorAIAssist';
import { LogoIcon } from '@/components/LogoIcon';
import { CopyAnswerButton, ResearchTrailDisclosure } from '@/components/agent-stream';
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

const recordingDate = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const formatRunDuration = (durationMs: number) => {
  const seconds = Math.max(1, Math.round(durationMs / 1_000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const stringValue = (record: Record<string, unknown>, key: string) => (
  typeof record[key] === 'string' ? record[key] : ''
);

const RecordedAgentArtifacts = ({ selection }: { selection: AgentUseCaseDemoSelection }) => {
  const { recording } = selection;
  if (!recording.profilePatches.length && !recording.emailDrafts.length && !recording.proposals.length && !recording.amplify) return null;

  return (
    <div className="ml-0 mt-6 max-w-[800px] space-y-4 sm:ml-0">
      {recording.profilePatches.map((patch, patchIndex) => (
        <section key={`${patch.summary}-${patchIndex}`} className="border border-[#140206] bg-[#f7f4ef]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#140206] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#140206]">Profile update draft</p>
              <p className="mt-1 text-xs leading-5 text-black/55">{patch.summary}</p>
            </div>
            <span className="border border-[#140206]/45 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.1em] text-black/50">Recorded, read only</span>
          </div>
          <div>
            {patch.fields.map((field) => (
              <div key={field.field} className="grid gap-1 border-b border-[#140206]/20 px-4 py-3 last:border-b-0 sm:grid-cols-[150px_1fr] sm:gap-5">
                <p className="text-xs font-semibold text-[#140206]">{field.label || field.field}</p>
                <div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-[#333333]">{field.newValue}</p>
                  <p className="mt-1 text-xs leading-5 text-black/45">{field.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {recording.emailDrafts.map((draft, draftIndex) => (
        <section key={`${draft.founderName || draft.company || 'email'}-${draftIndex}`} className="border border-[#140206] bg-[#f7f4ef] px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#140206]">Recorded email draft</p>
              <p className="mt-1 text-xs text-black/50">{[draft.founderName, draft.company].filter(Boolean).join(' · ')}</p>
            </div>
            <span className="border border-[#140206]/45 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.1em] text-black/50">Not sent</span>
          </div>
          {draft.toEmail && <p className="mt-4 text-xs text-black/50">Contact: {draft.toEmail}</p>}
          {draft.subject && <p className="mt-2 text-sm font-semibold text-[#140206]">{draft.subject}</p>}
          {draft.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#333333]">{draft.body}</p>}
          {draft.sourceUrl && (
            <a className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#16a34a] hover:underline" href={draft.sourceUrl} rel="noreferrer" target="_blank">
              Verify source <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </section>
      ))}

      {recording.proposals.map((proposal, proposalIndex) => (
        <section key={`proposal-${proposalIndex}`} className="border border-[#140206] bg-[#f7f4ef] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#140206]">Recorded outreach proposal</p>
            <span className="border border-[#140206]/45 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.1em] text-black/50">Not sent</span>
          </div>
          {stringValue(proposal, 'subject') && <p className="mt-3 text-sm font-semibold text-[#140206]">{stringValue(proposal, 'subject')}</p>}
          {stringValue(proposal, 'body') && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#333333]">{stringValue(proposal, 'body')}</p>}
        </section>
      ))}

      {recording.amplify && (
        <div className="border border-[#140206] bg-[#f7f4ef] px-4 py-3 text-sm text-[#333333]">
          This recorded run proposed investor matching notifications. The demo did not execute them.
        </div>
      )}
    </div>
  );
};

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

  const recordedMessages = selection.recording.messages?.length
    ? selection.recording.messages
    : [
      { role: 'user' as const, content: selection.prompt },
      { role: 'assistant' as const, content: selection.recording.reply },
    ];

  return (
    <div>
      <header className="border-b border-[#140206] pb-6 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="agent-use-cases-meta border border-[#140206] bg-[#e2f7ec] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-[#140206]">Recorded Agent run</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-black/45">
            <Clock3 className="h-3.5 w-3.5" />
            {recordingDate.format(new Date(selection.recording.recordedAt))} · completed in {formatRunDuration(selection.recording.durationMs)}
          </span>
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="agent-use-cases-display mt-4 text-[26px] leading-tight text-[#140206] outline-none">{selection.title}</h2>
        <p className="mt-2 max-w-[760px] text-sm leading-6 text-black/60">
          This is a saved result from the real Apparent Agent using dedicated, public-safe demo profiles. Replaying it makes no live endpoint call, performs no action, and adds nothing to your chat history.
        </p>
      </header>

      <div className="mt-8">
        {recordedMessages.map((message, index) => (
          message.role === 'user' ? (
            <article key={`${index}-user`} className="flex justify-end pb-8">
              <div className="max-w-[85%] rounded-2xl border border-black/15 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_3px_0_rgba(51,51,51,0.16),0_10px_24px_rgba(51,51,51,0.08)] sm:max-w-[72%]">
                <p className="whitespace-pre-wrap text-[15px] leading-6 text-[#333333] sm:text-base">{message.content}</p>
              </div>
            </article>
          ) : (
            <article key={`${index}-assistant`} className="pb-10">
              <div className="mb-4 flex items-center gap-3">
                <p className="text-sm font-medium text-[#16a34a]">Apparent</p>
                <CopyAnswerButton text={message.content} />
              </div>
              {index === 1 && <ResearchTrailDisclosure steps={selection.recording.steps} />}
              <AgentMarkdown className="agent-research-answer max-w-[800px] text-base leading-6 text-[#333333]">
                {message.content}
              </AgentMarkdown>
            </article>
          )
        ))}

        <RecordedAgentArtifacts selection={selection} />

        <div className="mt-8 flex max-w-[800px] flex-col-reverse gap-3 border-t border-[#140206] pb-10 pt-5 sm:flex-row sm:items-center sm:justify-between">
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
