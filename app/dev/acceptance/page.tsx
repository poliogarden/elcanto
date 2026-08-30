import { AcceptanceDashboard } from '@/components/dev/acceptance-dashboard'
import { isDevToolsAllowed } from '@/lib/production/dev-access'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function DevAcceptancePage() {
  if (!isDevToolsAllowed()) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8 border-b border-paper-3 pb-6">
        <h1 className="text-2xl font-semibold text-ink">Product acceptance</h1>
        <p className="mt-2 text-sm text-ink-soft max-w-2xl">
          Dev-only tool to rate live synthesis quality. Results feed V3 backlog — not shown to end users.
        </p>
        <p className="mt-2 text-xs text-ink-soft">
          Open a completed synthesis from{' '}
          <a href="/" className="underline">home</a>
          , then rate it here. Engine: reasoning-v2.2 (frozen).
        </p>
      </header>
      <AcceptanceDashboard />
    </main>
  )
}
