'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { IssueNavigation } from '@/components/issue-navigation'
import { Masthead } from '@/components/masthead'
import { listLocalArchive, type ArchiveEntry } from '@/lib/storage/synthesis-session'

export default function ArchivePage() {
  const [entries, setEntries] = useState<ArchiveEntry[]>([])

  useEffect(() => {
    async function load() {
      const local = listLocalArchive()
      try {
        const res = await fetch('/api/archive')
        const data = (await res.json()) as { entries?: ArchiveEntry[] }
        const remote = data.entries ?? []
        const merged = [...remote]
        for (const item of local) {
          if (!merged.some((e) => e.id === item.id)) merged.push(item)
        }
        setEntries(merged.sort((a, b) => (a.date < b.date ? 1 : -1)))
      } catch {
        setEntries(local)
      }
    }
    void load()
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <Masthead />
      <IssueNavigation issue="ARCHIVE" active="archive" />

      <section className="border-b border-line px-5 py-12 md:px-8 md:py-16">
        <div className="grid gap-6 lg:grid-cols-12">
          <h1 className="font-serif text-6xl font-medium leading-none tracking-tight md:text-8xl lg:col-span-8">
            Archive
          </h1>
          <p className="self-end font-serif text-lg leading-relaxed text-ink-soft text-pretty lg:col-span-4">
            Every past synthesis, kept like back issues. Each one is a set of YouTube voices read,
            compared, and resolved into a single understanding.
          </p>
        </div>
      </section>

      <div className="border-b border-line">
        {entries.length === 0 ? (
          <div className="px-5 py-16 md:px-8">
            <p className="mono-label text-xs text-ink-soft">No saved syntheses yet.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/synthesis/${entry.id}`}
              className="group grid grid-cols-1 items-baseline gap-2 border-b border-line px-5 py-7 transition-colors last:border-b-0 hover:bg-paper-2 md:grid-cols-[10rem_1fr_auto] md:gap-6 md:px-8 md:py-8"
            >
              <span className="mono-label text-xs text-ink-soft">{entry.number}</span>
              <h2 className="font-serif text-2xl font-medium leading-tight text-balance md:text-3xl">
                {entry.question}
                <span className="ml-3 inline-block translate-x-0 text-ink-soft opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                  {'\u2192'}
                </span>
              </h2>
              <div className="mono flex items-center gap-4 text-[11px] text-ink-soft md:justify-end">
                <span className="text-ink">{entry.voiceCount} voices</span>
                <span aria-hidden>·</span>
                <span>{entry.date}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="px-5 py-12 md:px-8">
        <Link
          href="/"
          className="mono-label inline-flex border border-line px-5 py-4 text-xs text-ink transition-colors hover:bg-ink hover:text-background"
        >
          Start a new synthesis {'\u2192'}
        </Link>
      </div>
    </main>
  )
}
