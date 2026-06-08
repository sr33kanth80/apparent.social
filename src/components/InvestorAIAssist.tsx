import { ArrowRight, Paperclip } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

import { LogoIcon } from '@/components/LogoIcon';
import { Textarea } from '@/components/ui/textarea';
import { useAutoResizeTextarea } from '@/hooks/use-auto-resize-textarea';
import { cn } from '@/lib/utils';

type AIPromptProps = {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  className?: string;
};

export const InvestorAIPrompt = ({
  placeholder = 'What can I do for you?',
  onSubmit,
  className,
}: AIPromptProps) => {
  const [value, setValue] = useState('');
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 300,
  });

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
            <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
              <Textarea
                className={cn(
                  'min-h-[72px] w-full resize-none rounded-xl rounded-b-none border-none bg-white/5 px-4 py-3 text-white placeholder:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0',
                )}
                id="ai-input-15"
                onChange={(event) => {
                  setValue(event.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
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
