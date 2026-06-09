import { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';

import { InvestorAIPrompt } from '@/components/InvestorAIAssist';
import { LogoIcon } from '@/components/LogoIcon';
import type { AppUser } from '@/lib/apparent-types';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

interface InvestorAgentChatProps {
  user: AppUser;
  /** The investor's saved criteria (intakeValues) — passed to the agent for thesis-aware sourcing. */
  criteria: Record<string, string>;
  className?: string;
}

const STORAGE_PREFIX = 'apparent:agent-chat:';

const SUGGESTIONS = [
  'Show me founders raising now that fit my thesis',
  'Who are the strongest builders on Apparent right now?',
  'Find developer-tools founders I should look at',
];

export const InvestorAgentChat = ({ user, criteria, className }: InvestorAgentChatProps) => {
  const storageKey = `${STORAGE_PREFIX}${user.id}`;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
    } catch {
      /* quota — ignore */
    }
  }, [messages, storageKey]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loadingRef.current) return;

    loadingRef.current = true;
    setError('');
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, criteria }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setMessages((current) => [...current, { role: 'assistant', content: String(data.reply ?? '') }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The agent is unavailable right now.');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };

  const clear = () => {
    setMessages([]);
    setError('');
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  const hasConversation = messages.length > 0;

  return (
    <div className={className}>
      {hasConversation && (
        <div className="mb-3 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-black">
              <Sparkles className="h-4 w-4 text-[#42520d]" />
              Apparent agent
            </div>
            <button
              type="button"
              onClick={clear}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-[#fbf8f3] hover:text-black"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>

          <div ref={transcriptRef} className="max-h-[420px] space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div key={index} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                {message.role === 'assistant' && (
                  <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dcefc7]">
                    <LogoIcon className="h-3.5 w-3.5 text-[#42520d]" />
                  </div>
                )}
                <div
                  className={
                    message.role === 'user'
                      ? 'max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-neutral-900 px-3.5 py-2.5 text-sm leading-relaxed text-white'
                      : 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-[#fbf8f3] px-3.5 py-2.5 text-sm leading-relaxed text-gray-800'
                  }
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dcefc7]">
                  <LogoIcon className="h-3.5 w-3.5 text-[#42520d]" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-[#fbf8f3] px-3.5 py-2.5 text-sm text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sourcing…
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
            )}
          </div>
        </div>
      )}

      <InvestorAIPrompt className="py-0" onSubmit={send} />

      {!hasConversation && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-black/30 hover:text-black"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
