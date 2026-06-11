import { ArrowRight, Paperclip } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';

import { LogoIcon } from '@/components/LogoIcon';
import { Textarea } from '@/components/ui/textarea';
import { useAutoResizeTextarea } from '@/hooks/use-auto-resize-textarea';
import { cn } from '@/lib/utils';

type AIPromptProps = {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  className?: string;
  /** Focus the textarea on mount (used when the fullscreen chat opens). */
  autoFocus?: boolean;
  /** Extra controls rendered in the bottom toolbar, next to the attach button. */
  toolbarExtras?: ReactNode;
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
}: AIPromptProps) => {
  const [value, setValue] = useState('');
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 300,
  });

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus, textareaRef]);

  const submitPrompt = () => {
    if (!value.trim()) return;
    onSubmit?.(value);
    setValue('');
    adjustHeight(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitPrompt();
    }
  };

  return (
    <div className={cn('w-full py-4 text-white', className)}>
      <div className="rounded-2xl bg-neutral-950 p-1.5 pt-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
        <div className="mx-2 mb-2.5 flex items-center">
          <LogoIcon className="h-3.5 w-3.5 text-white/90" />
        </div>
        <div className="relative">
          <div className="relative flex flex-col">
            <div className="relative overflow-y-auto" style={{ maxHeight: '400px' }}>
              <DynamicPromptPlaceholder active={!value} fallbackText={placeholder} />
              <Textarea
                aria-label={placeholder}
                className={cn(
                  'min-h-[72px] w-full resize-none rounded-xl rounded-b-none border-none bg-white/5 px-4 py-3 text-white placeholder:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0',
                )}
                id="ai-input-15"
                onChange={(event) => {
                  setValue(event.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                ref={textareaRef}
                value={value}
              />
            </div>

            <div className="flex h-14 items-center rounded-b-xl bg-white/5">
              <div className="absolute bottom-3 left-3 right-3 flex w-[calc(100%-24px)] items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 items-center gap-1 rounded-md bg-white/5 px-2 text-xs text-white/70">
                    <LogoIcon className="h-4 w-4 opacity-70" />
                    Apparent AI
                  </div>
                  <div className="mx-0.5 h-4 w-px bg-white/10" />
                  <label
                    aria-label="Attach file"
                    className={cn(
                      'cursor-pointer rounded-lg bg-white/5 p-2',
                      'hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0',
                      'text-white/40 hover:text-white',
                    )}
                  >
                    <input className="hidden" type="file" />
                    <Paperclip className="h-4 w-4 transition-colors" />
                  </label>
                  {toolbarExtras && (
                    <>
                      <div className="mx-0.5 h-4 w-px bg-white/10" />
                      {toolbarExtras}
                    </>
                  )}
                </div>
                <button
                  aria-label="Send message"
                  className={cn(
                    'rounded-lg bg-white/5 p-2',
                    'hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0',
                  )}
                  disabled={!value.trim()}
                  onClick={submitPrompt}
                  type="button"
                >
                  <ArrowRight
                    className={cn(
                      'h-4 w-4 text-white transition-opacity duration-200',
                      value.trim() ? 'opacity-100' : 'opacity-30',
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
