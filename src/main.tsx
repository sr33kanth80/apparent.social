import { StrictMode } from 'react'
import type { ComponentType, PropsWithChildren } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.tsx'
import { isClerkConfigured } from './lib/clerk-auth.ts'

const ClerkProviderFromEnv = ClerkProvider as ComponentType<PropsWithChildren<{ afterSignOutUrl: string }>>

const app = isClerkConfigured ? (
  <ClerkProviderFromEnv afterSignOutUrl="/">
    <App />
  </ClerkProviderFromEnv>
) : (
  <App />
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {app}
  </StrictMode>,
)
