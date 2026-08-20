'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { PersonalGap, PersonalHomeSummary } from '@/lib/types/personal'

export function PersonalHomeSection() {
  const [summary, setSummary] = useState<PersonalHomeSummary | null>(null)

  useEffect(() => {
    void fetch('/api/personal/home')
      .then((res) => res.json())
      .then((data: { summary: PersonalHomeSummary }) => setSummary(data.summary))
      .catch(() => setSummary(null))
  }, [])

  if (!summary?.hasProfile) return null

  return (
    <section className="border-b border-line bg-background px-5 py-12 md:px-8 md:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <span className="mono-label text-[10px] text-ink-soft">YOUR CURRENT THREAD</span>
          <Link href="/personal" className="mono-label text-[10px] hover:opacity-60">
            My YouTube →
          </Link>
        </div>

        <blockquote className="mt-4 font-serif text-2xl leading-relaxed md:text-3xl">
          {summary.currentThread}
        </blockquote>

        {summary.threadNarrative && (
          <p className="mt-6 font-serif text-lg leading-relaxed text-ink-soft">
            {summary.threadNarrative}
          </p>
        )}

        {summary.emerging.length > 0 && (
          <div className="mt-10 border-t border-line pt-8">
            <h3 className="mono-label text-[10px] text-ink-soft">3 EMERGING INTERESTS</h3>
            <ul className="mt-4 space-y-2">
              {summary.emerging.map((label) => (
                <li key={label} className="font-serif text-xl">
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.connection && summary.connection !== summary.threadNarrative && (
          <div className="mt-10 border-t border-line pt-8">
            <h3 className="mono-label text-[10px] text-ink-soft">
              A CONNECTION YOU MAY NOT HAVE NOTICED
            </h3>
            <p className="mt-4 font-serif text-lg leading-relaxed">{summary.connection}</p>
          </div>
        )}

        {summary.gap && <GapCta gap={summary.gap} />}
      </div>
    </section>
  )
}

function GapCta({ gap }: { gap: PersonalGap }) {
  return (
    <div className="mt-10 border-t border-line pt-8">
      <h3 className="mono-label text-[10px] text-ink-soft">A QUESTION YOU HAVEN&apos;T EXPLORED</h3>
      <p className="mono-label mt-4 text-[10px] text-ink-soft">YOU&apos;VE EXPLORED</p>
      <p className="mt-2 font-serif text-base">{gap.explored}</p>
      <p className="mono-label mt-4 text-[10px] text-ink-soft">BUT NOT YET</p>
      <p className="mt-2 font-serif text-xl font-medium">{gap.notYetExplored}</p>
      <Link
        href={`/personal?ask=${encodeURIComponent(gap.question)}`}
        className="mono-label mt-6 inline-block border border-line px-4 py-2 text-[11px] hover:bg-ink hover:text-background"
      >
        Explore this question →
      </Link>
    </div>
  )
}
