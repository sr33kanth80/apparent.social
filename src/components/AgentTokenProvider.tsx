import type { ReactNode } from 'react';

import { AgentTokenContext, type AgentTokenGetter } from '@/lib/agent-auth';

export const AgentTokenProvider = ({
  getToken,
  children,
}: {
  getToken: AgentTokenGetter;
  children: ReactNode;
}) => <AgentTokenContext.Provider value={getToken}>{children}</AgentTokenContext.Provider>;
