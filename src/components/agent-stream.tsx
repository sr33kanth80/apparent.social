import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * POST to an agent endpoint with SSE progress streaming. Emits status labels
 * via onStatus while the agent researches, and resolves with the final `done`
 * payload. Falls back to plain JSON when the server doesn't stream.
 */
export const postAgentStream = async (
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
  onStatus: (label: string) => void,
): Promise<Record<string, unknown>> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!(res.ok && res.body && (res.headers.get('content-type') || '').includes('text/event-stream'))) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) throw new Error(String(data?.error || `Request failed (${res.status})`));
    return data;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let doneEvent: Record<string, unknown> | null = null;
  let errorEvent: Record<string, unknown> | null = null;
  for (;;) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const event of events) {
      const dataLine = event.split('\n').find((line) => line.startsWith('data: '));
      if (!dataLine) continue;
      try {
        const payload = JSON.parse(dataLine.slice(6));
        if (payload.type === 'status' && typeof payload.label === 'string') onStatus(payload.label);
        else if (payload.type === 'done') doneEvent = payload;
        else if (payload.type === 'error') errorEvent = payload;
      } catch {
        /* ignore malformed events */
      }
    }
  }
  if (errorEvent) throw new Error(String(errorEvent.error || 'The agent is unavailable right now.'));
  if (!doneEvent) throw new Error('The agent connection dropped — please retry.');
  return doneEvent;
};

/** Typewriter reveal for the newest assistant reply (null = show everything). */
export const useTypewriterReveal = () => {
  const [reveal, setReveal] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopReveal = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setReveal(null);
  };

  const startReveal = (length: number) => {
    stopReveal();
    if (length < 120) return; // short replies just appear
    setReveal(0);
    const step = Math.max(4, Math.round(length / 110)); // ~1.8s total at 16ms ticks
    let shown = 0;
    timerRef.current = window.setInterval(() => {
      shown += step;
      if (shown >= length) {
        stopReveal();
        return;
      }
      setReveal(shown);
    }, 16);
  };

  useEffect(() => () => stopReveal(), []);

  return { reveal, startReveal, stopReveal };
};

/** Perplexity-style research trail: finished steps get a check, the current one spins. */
export const AgentStatusTrail = ({ steps, className }: { steps: string[]; className?: string }) => (
  <div className={cn('space-y-1.5', className)}>
    {(steps.length ? steps : ['Working…']).map((label, index, all) => {
      const current = index === all.length - 1;
      return (
        <div
          key={`${index}-${label}`}
          className={cn('flex items-center gap-2 text-sm', current ? 'text-gray-600' : 'text-gray-400')}
        >
          {current ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Check className="h-3.5 w-3.5 shrink-0" />}
          {label}
        </div>
      );
    })}
  </div>
);

/** Appends a status label, deduping consecutive repeats and capping the trail. */
export const appendStatus = (steps: string[], label: string) =>
  steps[steps.length - 1] === label ? steps : [...steps, label].slice(-8);
