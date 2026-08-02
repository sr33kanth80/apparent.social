import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { KindeProvider, useKindeAuth } from '@kinde-oss/kinde-auth-react'
import './index.css'
import './editorial.css'
import './apparent-theme.css'
import App from './App.tsx'
import { AgentTokenProvider } from './components/AgentTokenProvider.tsx'
import {
  getKindeDomain,
  getKindeLogoutUri,
  getKindeRedirectUri,
  isKindeConfigured,
  kindeAudience,
  kindeClientId,
} from './lib/kinde-auth.ts'

/**
 * Publishes the Kinde access token to useAgentAuthHeaders on every route.
 *
 * ProtectedDashboardRoute already does this for /dashboard/*, but public routes
 * render outside it — so a signed-in user on a public page that calls an
 * authenticated API fell through to the Supabase session, which does not exist
 * when sign-in went through Kinde. Only mounted inside KindeProvider, so the
 * hook is always legal here.
 */
const KindeAgentToken = ({ children }: { children: ReactNode }) => {
  const { getAccessToken } = useKindeAuth()
  return <AgentTokenProvider getToken={getAccessToken}>{children}</AgentTokenProvider>
}

const app = isKindeConfigured ? (
  <KindeProvider
    clientId={kindeClientId!}
    domain={getKindeDomain()}
    audience={kindeAudience || undefined}
    redirectUri={getKindeRedirectUri()}
    logoutUri={getKindeLogoutUri()}
  >
    <KindeAgentToken>
      <App />
    </KindeAgentToken>
  </KindeProvider>
) : (
  <App />
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {app}
  </StrictMode>,
)
