import { ArrowRight, Check, Paperclip, Puzzle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { LogoIcon } from '@/components/LogoIcon';
import { Textarea } from '@/components/ui/textarea';
import type { AgentInstalledSkill } from '@/lib/apparent-types';
import { cn } from '@/lib/utils';

export type AgentPromptSkill = Pick<AgentInstalledSkill, 'id' | 'name' | 'description' | 'enabled'>;
export type AgentPromptSubmitOptions = { skill?: AgentPromptSkill };

type AIPromptProps = {
  placeholder?: string;
  onSubmit?: (value: string, options?: AgentPromptSubmitOptions) => void;
  className?: string;
  /** Focus the textarea on mount (used when the fullscreen chat opens). */
  autoFocus?: boolean;
  /** Extra controls rendered in the bottom toolbar, next to the attach button. */
  toolbarExtras?: ReactNode;
  /** Turn off the animated multilingual placeholder for focused agent pages. */
  animatePlaceholder?: boolean;
  /** Hide the attachment affordance until a caller wires file context through. */
  showAttachment?: boolean;
  /** Match the dashboard canvas when the prompt lives on the dedicated Agent page. */
  surface?: 'charcoal' | 'parchment';
  /** Remove the hero frame when this is the follow-up field in a research thread. */
  threadMode?: boolean;
  /** Installed skills exposed as slash commands in this prompt. */
  skillCommands?: AgentPromptSkill[];
  activeSkillId?: string;
  onSkillCommandSelect?: (skill: AgentPromptSkill) => void;
};

const promptPlaceholders = [
  { text: 'What can I do you for?', language: 'English' },
  { text: 'What can I handle for you?', language: 'English variation' },
  { text: '¿Qué puedo hacer por ti?', language: 'Spanish' },
  { text: 'Que puis-je faire pour vous ?', language: 'French' },
  { text: 'あなたのために何ができますか？', language: 'Japanese' },
  { text: '무엇을 도와드릴까요?', language: 'Korean' },
  { text: 'Cosa posso fare per te?', language: 'Italian' },
  { text: 'Was kann ich für dich tun?', language: 'German' },
];

const DynamicPromptPlaceholder = ({ active, fallbackText }: { active: boolean; fallbackText: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!active) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((previousIndex) => (previousIndex + 1) % promptPlaceholders.length);
    }, 900);

    return () => window.clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const currentPlaceholder = promptPlaceholders[currentIndex]?.text ?? fallbackText;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-4 right-4 top-3 z-10 h-6 overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.div
          animate={{ y: 0, opacity: 1 }}
          className="absolute inset-x-0 flex min-w-0 items-center gap-2 text-sm text-white/70"
          exit={{ y: -20, opacity: 0 }}
          initial={{ y: 20, opacity: 0 }}
          key={`${currentIndex}-${currentPlaceholder}`}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
          <span className="truncate">{currentPlaceholder}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const InvestorAIPrompt = ({
  placeholder = 'What can I do you for?',
  onSubmit,
  className,
  autoFocus = false,
  toolbarExtras,
  animatePlaceholder = true,
  showAttachment = true,
  surface = 'charcoal',
  threadMode = false,
  skillCommands = [],
  activeSkillId,
  onSkillCommandSelect,
}: AIPromptProps) => {
  const [value, setValue] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashMenuDismissed, setSlashMenuDismissed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasValue = Boolean(value.trim());
  const slashQuery = value.match(/^\/([a-z0-9-]*)$/i)?.[1]?.toLowerCase();
  const slashMenuOpen = slashQuery !== undefined && !slashMenuDismissed;
  const matchingSkills = skillCommands
    .filter((skill) => skill.enabled && (!slashQuery || skill.name.includes(slashQuery) || skill.description.toLowerCase().includes(slashQuery)))
    .slice(0, 7);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus, textareaRef]);

  useEffect(() => {
    setSlashIndex(0);
  }, [slashQuery]);

  const selectSlashSkill = (skill: AgentPromptSkill) => {
    onSkillCommandSelect?.(skill);
    setValue(`/${skill.name} `);
    setSlashMenuDismissed(true);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const submitPrompt = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (slashMenuOpen) {
      if (matchingSkills.length > 0) selectSlashSkill(matchingSkills[Math.min(slashIndex, matchingSkills.length - 1)]);
      return;
    }
    const invocation = trimmed.match(/^\/([a-z0-9-]+)(?:\s+([\s\S]+))?$/i);
    const invokedSkill = invocation
      ? skillCommands.find((skill) => skill.enabled && skill.name === invocation[1]?.toLowerCase())
      : undefined;
    if (invokedSkill && !invocation?.[2]?.trim()) {
      onSkillCommandSelect?.(invokedSkill);
      setValue('');
      setSlashMenuDismissed(false);
      return;
    }
    onSubmit?.(trimmed, invokedSkill ? { skill: invokedSkill } : undefined);
    if (invokedSkill) onSkillCommandSelect?.(invokedSkill);
    setValue('');
    setSlashMenuDismissed(false);
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashMenuOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (matchingSkills.length > 0) {
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          setSlashIndex((index) => (index + direction + matchingSkills.length) % matchingSkills.length);
        }
        return;
      }
      if ((event.key === 'Enter' || event.key === 'Tab') && matchingSkills.length > 0) {
        event.preventDefault();
        selectSlashSkill(matchingSkills[Math.min(slashIndex, matchingSkills.length - 1)]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setSlashMenuDismissed(true);
        return;
      }
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitPrompt();
    }
  };

  return (
    <div className={cn('w-full py-4', surface === 'charcoal' ? 'text-white' : 'text-ink', className)}>
      <div className={cn(
        'relative',
        surface === 'charcoal'
          ? 'rounded-2xl p-1.5 pt-4'
          : cn(
            'border border-[#d6d6d6] transition-[border-color,box-shadow] focus-within:border-[#6fa38f] focus-within:shadow-[0_0_0_3px_rgba(3,152,97,0.12)]',
            threadMode ? 'rounded-xl' : 'rounded-2xl p-1.5',
          ),
        surface === 'charcoal'
          ? 'bg-charcoal shadow-[0_18px_60px_rgba(0,0,0,0.24)]'
          : 'bg-[#fdf9f7] shadow-[0_1px_2px_rgba(0,0,0,0.08)]',
      )}>
        {slashMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_50px_rgba(27,38,33,0.18)]" role="listbox" aria-label="Installed Agent Skills">
            <div className="flex items-center justify-between border-b border-black/5 px-3.5 py-2.5">
              <span className="text-xs font-semibold text-[#252927]">Use an installed skill</span>
              <span className="text-[10px] text-[#8a908d]">↑↓ select · Enter</span>
            </div>
            {matchingSkills.length > 0 ? (
              <div className="max-h-64 overflow-y-auto p-1.5">
                {matchingSkills.map((skill, index) => (
                  <button
                    type="button"
                    key={skill.id}
                    role="option"
                    aria-selected={index === slashIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSlashSkill(skill)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                      index === slashIndex ? 'bg-[#edf5f1]' : 'hover:bg-[#f6f3f1]',
                    )}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#003f2e] text-white"><Puzzle className="h-3.5 w-3.5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-[#252927]">
                        /{skill.name}
                        {skill.id === activeSkillId && <Check className="h-3.5 w-3.5 text-[#15803d]" />}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[#6e7673]">{skill.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-5 text-center">
                <p className="text-sm font-medium text-[#333333]">No enabled skill matches “/{slashQuery}”.</p>
                <p className="mt-1 text-xs text-[#7a817e]">Open Skills to install or re-enable one.</p>
              </div>
            )}
          </div>
        )}
        {surface === 'charcoal' && (
          <div className="mx-2 mb-2.5 flex items-center">
            <LogoIcon className="h-3.5 w-3.5 text-white/90" />
          </div>
        )}
        <div className="relative">
          <div className="relative flex flex-col">
            <div className="relative overflow-y-auto" style={{ maxHeight: '400px' }}>
              <DynamicPromptPlaceholder active={animatePlaceholder && !value} fallbackText={placeholder} />
              <Textarea
                aria-label={placeholder}
                data-agent-surface={surface}
                className={cn(
                  'w-full resize-none overflow-y-auto overscroll-contain border-none px-4 py-3 focus-visible:ring-0 focus-visible:ring-offset-0',
                  surface === 'charcoal'
                    ? 'h-28 min-h-28 max-h-28 rounded-xl rounded-b-none bg-white/5 text-white placeholder:text-white/70'
                    : cn(
                      'rounded-xl rounded-b-none bg-transparent text-base leading-6 text-[#333333] caret-[#003f2e] outline-none placeholder:text-[#6e7673]',
                      threadMode ? 'h-20 min-h-20 max-h-20' : 'h-24 min-h-24 max-h-24',
                    ),
                )}
                id="ai-input-15"
                onChange={(event) => {
                  setValue(event.target.value);
                  setSlashMenuDismissed(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder={animatePlaceholder ? undefined : placeholder}
                ref={textareaRef}
                value={value}
              />
            </div>

            <div className={cn('flex items-center rounded-b-xl', surface === 'charcoal' ? 'h-14 bg-white/5' : 'h-12 bg-transparent')}>
              <div className="absolute bottom-3 left-3 right-3 flex w-[calc(100%-24px)] items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'flex h-8 items-center gap-1 px-2 text-xs',
                    surface === 'charcoal'
                      ? 'rounded-md bg-white/5 text-white/70'
                      : 'rounded-full bg-[#edf5f1] text-[#003f2e]',
                  )}>
                    <LogoIcon className="h-4 w-4 opacity-70" />
                    Research
                  </div>
                  {showAttachment && (
                    <>
                      <div className={cn('mx-0.5 h-4 w-px', surface === 'charcoal' ? 'bg-white/10' : 'bg-[#d6d6d6]')} />
                      <label
                        aria-label="Attach file"
                        className={cn(
                          'cursor-pointer rounded-lg p-2',
                          surface === 'charcoal' ? 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white' : 'bg-black/[0.04] text-[#756d65] hover:bg-black/[0.08] hover:text-black',
                        )}
                      >
                        <input className="hidden" type="file" />
                        <Paperclip className="h-4 w-4 transition-colors" />
                      </label>
                    </>
                  )}
                  {toolbarExtras && (
                    <>
                      <div className={cn('mx-0.5 h-4 w-px', surface === 'charcoal' ? 'bg-white/10' : 'bg-[#d6d6d6]')} />
                      {toolbarExtras}
                    </>
                  )}
                </div>
                <button
                  aria-label="Send message"
                  className={cn(
                    'rounded-lg border p-2 transition-colors disabled:cursor-not-allowed',
                    surface === 'charcoal'
                      ? 'border-transparent bg-white/5 hover:bg-white/10'
                      : hasValue
                        ? 'rounded-xl border-[#003f2e] bg-[#003f2e] hover:bg-[#002f22]'
                        : 'rounded-xl border-[#d6d6d6] bg-[#f4efea]',
                  )}
                  disabled={!value.trim()}
                  onClick={submitPrompt}
                  type="button"
                >
                  <ArrowRight
                    className={cn(
                      'h-4 w-4 transition-colors duration-200',
                      surface === 'charcoal'
                        ? cn('text-white', hasValue ? 'opacity-100' : 'opacity-30')
                        : hasValue
                          ? 'text-white'
                          : 'text-[#a6a6a6]',
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
