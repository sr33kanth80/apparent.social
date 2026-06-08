import { useCallback, useRef } from 'react';

type UseAutoResizeTextareaOptions = {
  minHeight: number;
  maxHeight?: number;
};

export const useAutoResizeTextarea = ({ minHeight, maxHeight }: UseAutoResizeTextareaOptions) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = useCallback(
    (reset = false) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.style.height = `${minHeight}px`;
      if (reset) return;

      const nextHeight = maxHeight ? Math.min(textarea.scrollHeight, maxHeight) : textarea.scrollHeight;
      textarea.style.height = `${Math.max(nextHeight, minHeight)}px`;
      textarea.style.overflowY = maxHeight && textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    },
    [maxHeight, minHeight],
  );

  return { textareaRef, adjustHeight };
};
