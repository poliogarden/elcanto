'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
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

/** Current thread — below synthesis workflow on home */
export function PersonalCurrentThread() {
  const summary = usePersonalHomeSummary()

  if (!summary?.hasProfile || !summary.currentThread) return null

  return (
    <section className="border-b border-line py-5 md:py-6">
      <div className="mx-auto w-full max-w-[1280px] px-5 md:px-6">
        <span className="mono-label text-[10px] text-ink-soft">CURRENT THREAD</span>
        <blockquote className="mt-3 max-w-2xl border-l-2 border-mint pl-4 font-serif text-lg leading-relaxed md:text-xl">
          {summary.currentThread}
        </blockquote>
        <Link
          href="/personal"
          className="mono-label mt-4 inline-block text-[11px] text-ink hover:opacity-60"
        >
          Continue on personal desk →
        </Link>
      </div>
    </section>
  )
}

/** Compact My YouTube teaser — below current thread on home */
export function PersonalHomeTeaser() {
  const summary = usePersonalHomeSummary()

  if (!summary?.hasProfile) return null

  return (
    <section className="border-b border-line py-5 md:py-6">
      <div className="mx-auto w-full max-w-[1280px] px-5 md:px-6">
        <span className="mono-label text-[10px] text-ink-soft">MY YOUTUBE</span>
        <p className="mt-3 font-serif text-xl leading-relaxed md:text-2xl">
          What have you been thinking about lately?
        </p>

        {summary.emerging.length > 0 && (
          <ul className="mt-5 space-y-2 border-t border-line pt-5">
            <li className="mono-label text-[10px] text-ink-soft">
              Based on your recent YouTube interests
            </li>
            {summary.emerging.slice(0, 4).map((label) => (
              <li key={label} className="font-serif text-lg">
                {label}
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/personal"
          className="mono-label mt-5 inline-block text-[11px] text-ink hover:opacity-60"
        >
          See your YouTube pattern →
        </Link>
      </div>
    </section>
  )
}
