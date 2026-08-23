'use client'

import { SessionProvider } from 'next-auth/react'
import { LocaleProvider } from '@/lib/i18n/locale-context'
import { WorkspaceProvider } from '@/lib/workspace/workspace-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LocaleProvider>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </LocaleProvider>
    </SessionProvider>
  )
}
