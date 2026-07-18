import { createContext, useCallback, useContext } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type AgentTokenGetter = () => Promise<string | undefined>;

export const AgentTokenContext = createContext<AgentTokenGetter | null>(null);

export const useAgentAuthHeaders = () => {
  const externalTokenGetter = useContext(AgentTokenContext);

  return useCallback(async (): Promise<Record<string, string>> => {
    if (externalTokenGetter) {
      const token = await externalTokenGetter();
      return token ? { Authorization: `Bearer ${token}` } : {};
    }

    if (!isSupabaseConfigured || !supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [externalTokenGetter]);
};
