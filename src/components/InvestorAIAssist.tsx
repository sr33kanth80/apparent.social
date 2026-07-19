import { ArrowRight, Paperclip } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { LogoIcon } from '@/components/LogoIcon';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type AIPromptProps = {
  placeholder?: string;
  onSubmit?: (value: string) => void;
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
}: AIPromptProps) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasValue = Boolean(value.trim());

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus, textareaRef]);

  const submitPrompt = () => {
    if (!value.trim()) return;
    onSubmit?.(value);
    setValue('');
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitPrompt();
    }
  };

  return (
    <div className={cn('w-full py-4', surface === 'charcoal' ? 'text-white' : 'text-ink', className)}>
      <div className={cn(
        surface === 'charcoal'
          ? 'rounded-2xl p-1.5 pt-4'
          : cn(
            'overflow-hidden border border-[#d6d6d6] transition-[border-color,box-shadow] focus-within:border-[#6fa38f] focus-within:shadow-[0_0_0_3px_rgba(3,152,97,0.12)]',
            threadMode ? 'rounded-xl' : 'rounded-2xl p-1.5',
          ),
        surface === 'charcoal'
          ? 'bg-charcoal shadow-[0_18px_60px_rgba(0,0,0,0.24)]'
          : 'bg-[#fdf9f7] shadow-[0_1px_2px_rgba(0,0,0,0.08)]',
      )}>
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
                onChange={(event) => setValue(event.target.value)}
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
