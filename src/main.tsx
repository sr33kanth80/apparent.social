import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { KindeProvider } from '@kinde-oss/kinde-auth-react'
import './index.css'
import './editorial.css'
import './apparent-theme.css'
import App from './App.tsx'
import {
  getKindeDomain,
  getKindeLogoutUri,
  getKindeRedirectUri,
  isKindeConfigured,
  kindeClientId,
} from './lib/kinde-auth.ts'

const app = isKindeConfigured ? (
  <KindeProvider
    clientId={kindeClientId!}
    domain={getKindeDomain()}
    redirectUri={getKindeRedirectUri()}
    logoutUri={getKindeLogoutUri()}
  >
    <App />
  </KindeProvider>
) : (
  <App />
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {app}
  </StrictMode>,
)
