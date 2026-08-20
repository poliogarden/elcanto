'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { HomePageShell } from '@/components/home/home-page-shell'
import type { PersonalHomeSummary } from '@/lib/types/personal'

function usePersonalHomeSummary() {
  const [summary, setSummary] = useState<PersonalHomeSummary | null>(null)

  useEffect(() => {
    void fetch('/api/personal/home')
      .then((res) => res.json())
      .then((data: { summary: PersonalHomeSummary }) => setSummary(data.summary))
      .catch(() => setSummary(null))
  }, [])

  return summary
}

/** Compact resume + YouTube pattern — hidden when not signed in / no profile */
export function HomeContinueSection() {
  const summary = usePersonalHomeSummary()

  if (!summary?.hasProfile) return null

  const topics = summary.emerging.slice(0, 3).join(' · ')

  return (
    <section className="border-b border-line py-6 md:py-8">
      <HomePageShell>
        {summary.currentThread && (
          <article className="border border-line bg-background p-4 md:p-5">
            <p className="mt-2 max-w-2xl font-serif text-base leading-relaxed md:text-lg">
              {summary.currentThread}
            </p>
            <Link
              href="/personal"
              className="mono-label mt-4 inline-flex text-[10px] text-ink hover:opacity-60"
            >
              CONTINUE →
            </Link>
          </article>
        )}

        {topics && (
          <div className={`${summary.currentThread ? 'mt-4' : ''} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <span className="mono-label text-[10px] text-ink-soft">YOUR YOUTUBE</span>
              <p className="mono mt-1 text-[11px] text-ink">{topics}</p>
            </div>
            <Link
              href="/personal"
              className="mono-label border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
            >
              SEE YOUR PATTERN →
            </Link>
          </div>
        )}
      </HomePageShell>
    </section>
  )
}
