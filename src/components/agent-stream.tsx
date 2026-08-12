import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Loader2 } from 'lucide-react';

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
  signal?: AbortSignal,
): Promise<Record<string, unknown>> => {
  const requestId = typeof body.requestId === 'string' && body.requestId
    ? body.requestId
    : globalThis.crypto?.randomUUID?.() || `agent_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const role = url.includes('founder-agent') ? 'founder' : 'investor';
  const wait = (milliseconds: number) => new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Agent run cancelled.', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
  const recoverCompletedRun = async (): Promise<Record<string, unknown>> => {
    onStatus('Reconnecting to the active research run…');
    const deadline = Date.now() + 285_000;
    let delay = 1_500;
    while (Date.now() < deadline) {
      if (signal?.aborted) throw new DOMException('Agent run cancelled.', 'AbortError');
      const statusResponse = await fetch(`/api/agent-run?requestId=${encodeURIComponent(requestId)}&role=${role}`, {
        headers,
        signal,
      });
      const statusData = await statusResponse.json().catch(() => ({}));
      if (statusResponse.ok && statusData.status === 'completed' && statusData.responsePayload) {
        return statusData.responsePayload as Record<string, unknown>;
      }
      if (statusResponse.ok && ['failed', 'cancelled', 'expired'].includes(String(statusData.status))) {
        throw new Error(
          statusData.status === 'cancelled'
            ? 'The Agent run was cancelled.'
            : statusData.status === 'expired'
              ? 'The Agent run expired safely before completion. Please try a narrower question.'
              : 'The Agent could not finish this research. Please retry or narrow the question.',
        );
      }
      if (statusResponse.status !== 202 && statusResponse.status !== 503) {
        throw new Error(String(statusData.error || 'The Agent run could not be recovered.'));
      }
      await wait(delay);
      delay = Math.min(delay + 500, 5_000);
    }
    throw new Error('The Agent reached its safe research deadline. Please try a narrower question.');
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestId, ...headers },
    body: JSON.stringify({ ...body, requestId, stream: true }),
    signal,
  });

  if (!(res.ok && res.body && (res.headers.get('content-type') || '').includes('text/event-stream'))) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data?.status === 'running') return recoverCompletedRun();
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
  if (!doneEvent) return recoverCompletedRun();
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
          {current ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Check className="h-3.5 w-3.5 shrink-0 text-[#16a34a]" />}
          {label}
        </div>
      );
    })}
  </div>
);

/** Appends a status label, deduping consecutive repeats and capping the trail. */
export const appendStatus = (steps: string[], label: string) =>
  steps[steps.length - 1] === label ? steps : [...steps, label].slice(-8);

/**
 * Collapsed record of the research steps behind an answer, kept after the
 * reply lands (Perplexity-style). Native <details> — no state needed.
 */
export const ResearchTrailDisclosure = ({ steps }: { steps?: string[] }) => {
  const trail = (steps ?? []).filter(Boolean);
  if (trail.length === 0) return null;
  return (
    <details className="group mb-5 w-fit max-w-full">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-[#d6d6d6] bg-white px-3 py-1 text-[11px] text-[#a6a6a6] transition-colors hover:text-[#333333] [&::-webkit-details-marker]:hidden">
        <Check className="h-3 w-3 shrink-0 text-[#039861]" />
        <span className="font-medium">
          {trail.length} step{trail.length === 1 ? '' : 's'}
        </span>
        <span aria-hidden="true">·</span>
        <span>show work</span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="ml-1.5 mt-2 space-y-1.5 border-l border-[#d6d6d6] py-1 pl-4">
        {trail.map((label, index) => (
          <div key={`${index}-${label}`} className="flex items-center gap-2 text-xs text-gray-500">
            <Check className="h-3 w-3 shrink-0 text-[#16a34a]" />
            {label}
          </div>
        ))}
      </div>
    </details>
  );
};

/** Ghost copy-to-clipboard button for an answer. */
export const CopyAnswerButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md border border-black/10 px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:border-black/25 hover:text-black"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};
