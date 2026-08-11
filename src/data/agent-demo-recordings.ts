import recordingData from './agent-demo-recordings.generated.json';

import type { AgentProfilePatch } from '@/lib/apparent-types';

export type AgentDemoRole = 'founder' | 'investor';

export type AgentDemoMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AgentDemoEmailDraft = {
  founderName?: string;
  company?: string;
  toEmail?: string;
  subject?: string;
  body?: string;
  sourceUrl?: string;
};

export type AgentDemoRecording = {
  id: string;
  role: AgentDemoRole;
  title: string;
  prompt: string;
  recordedAt: string;
  durationMs: number;
  steps: string[];
  messages?: AgentDemoMessage[];
  reply: string;
  proposals: Record<string, unknown>[];
  emailDrafts: AgentDemoEmailDraft[];
  profilePatches: AgentProfilePatch[];
  amplify: boolean;
};

const recordings = recordingData.recordings as unknown as AgentDemoRecording[];
const recordingsByPrompt = new Map(recordings.map((recording) => [
  `${recording.role}:${recording.prompt}`,
  recording,
]));

export const findAgentDemoRecording = (role: AgentDemoRole, prompt: string) => (
  recordingsByPrompt.get(`${role}:${prompt}`)
);
