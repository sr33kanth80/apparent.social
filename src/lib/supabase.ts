import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const shouldProxySupabaseRequest = (url: URL) => {
  if (!supabaseUrl || typeof window === 'undefined') return false;

  try {
    const configured = new URL(supabaseUrl);
    return url.origin === configured.origin;
  } catch {
    return false;
  }
};

const initFromRequest = async (request: Request, body?: ArrayBuffer): Promise<RequestInit> => ({
  method: request.method,
  headers: new Headers(request.headers),
  body: body && !['GET', 'HEAD'].includes(request.method.toUpperCase()) ? body.slice(0) : undefined,
  credentials: request.credentials,
  signal: request.signal,
});

const fetchWithSupabaseProxyFallback: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  const requestUrl = new URL(request.url);

  if (!shouldProxySupabaseRequest(requestUrl)) {
    return fetch(request);
  }

  const method = request.method.toUpperCase();
  const body = ['GET', 'HEAD'].includes(method) ? undefined : await request.clone().arrayBuffer();

  try {
    return await fetch(request.url, await initFromRequest(request, body));
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error;
    }

    const proxyUrl = new URL('/api/supabase-proxy', window.location.origin);
    proxyUrl.searchParams.set('target', requestUrl.toString());

    return fetch(proxyUrl.toString(), await initFromRequest(request, body));
  }
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        fetch: fetchWithSupabaseProxyFallback,
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
