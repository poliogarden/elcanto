import { DirectCompareView } from '@/components/dev/direct-compare-view'
import { FINAL_DECISION_CASES } from '@/lib/direct-synthesis/cases'
import { isDirectSynthesisExperimentAllowed } from '@/lib/production/dev-access'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DirectCompareIndexPage() {
  if (!isDirectSynthesisExperimentAllowed()) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8 border-b border-paper-3 pb-6">
        <h1 className="text-2xl font-semibold text-ink">Final product decision compare</h1>
        <p className="mt-2 text-sm text-ink-soft max-w-2xl">
          Side-by-side V2.2 vs Direct Synthesis. No automatic architecture decision — human
          comparison only.
        </p>
        <p className="mt-2 text-xs text-ink-soft">
          <Link href="/dev/acceptance" className="underline">Product acceptance</Link>
        </p>
      </header>
      <ul className="space-y-3">
        {FINAL_DECISION_CASES.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/dev/direct-compare/${c.slug}`}
              className="block rounded-lg border border-paper-3 p-4 hover:bg-paper-2"
            >
              <span className="font-medium text-ink">{c.label}</span>
              <span className="mt-1 block text-xs text-ink-soft">
                {c.isRealYouTube ? 'Real YouTube' : 'Benchmark set'} · {c.setType}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
