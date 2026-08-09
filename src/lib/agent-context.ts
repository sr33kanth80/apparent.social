type AgentContextMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const RECENT_MESSAGE_COUNT = 10;
const MAX_SUMMARY_ENTRIES = 24;
const MAX_SUMMARY_CHARS = 8_000;

const normalizeExcerpt = (value: string, maxChars: number) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(maxChars - 3, 0)).trimEnd()}...`;
};

const fingerprint = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const validSummaryLines = (summary: string) => summary
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => /^- \[[0-9a-f]{8}\] (?:User|Apparent): /i.test(line));

/**
 * Keep exact, bounded excerpts from turns that have rolled out of the recent
 * message window. The digest is stored in the latest assistant message payload,
 * so it survives thread reloads without replaying the full transcript.
 */
export const buildAgentThreadSummary = (
  messages: AgentContextMessage[],
  previousSummary = '',
): string => {
  const byFingerprint = new Map<string, string>();
  for (const line of validSummaryLines(previousSummary)) {
    const id = line.match(/^- \[([0-9a-f]{8})\]/i)?.[1];
    if (id) byFingerprint.set(id, line);
  }

  const retired = messages.slice(0, Math.max(messages.length - RECENT_MESSAGE_COUNT, 0));
  for (const message of retired) {
    const normalized = message.content.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    const id = fingerprint(`${message.role}:${normalized}`);
    const speaker = message.role === 'user' ? 'User' : 'Apparent';
    const maxChars = message.role === 'user' ? 650 : 900;
    byFingerprint.set(id, `- [${id}] ${speaker}: ${normalizeExcerpt(normalized, maxChars)}`);
  }

  const entries = Array.from(byFingerprint.values()).slice(-MAX_SUMMARY_ENTRIES);
  const selected: string[] = [];
  let totalChars = 0;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const line = entries[index];
    if (totalChars + line.length + 1 > MAX_SUMMARY_CHARS) break;
    selected.unshift(line);
    totalChars += line.length + 1;
  }
  return selected.join('\n');
};
