'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { listLocalArchive, type ArchiveEntry } from '@/lib/storage/synthesis-session'
import { useTranslation } from '@/lib/i18n/locale-context'

export function ArchiveList() {
  const { t } = useTranslation()
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
    <div className="border-b border-line">
      {entries.length === 0 ? (
        <div className="py-16">
          <p className="mono-label text-xs text-ink-soft">{t('archive.empty')}</p>
        </div>
      ) : (
        entries.map((entry) => (
          <Link
            key={entry.id}
            href={`/synthesis/${entry.id}`}
            className="group grid grid-cols-1 items-baseline gap-2 border-b border-line py-7 transition-colors last:border-b-0 hover:bg-paper-2 md:grid-cols-[10rem_1fr_auto] md:gap-6 md:py-8"
          >
            <span className="mono-label text-xs text-ink-soft">{entry.number}</span>
            <h2 className="font-serif text-2xl font-medium leading-tight text-balance md:text-3xl">
              {entry.question}
              <span className="ml-3 inline-block translate-x-0 text-ink-soft opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                {'\u2192'}
              </span>
            </h2>
            <div className="mono flex items-center gap-4 text-[11px] text-ink-soft md:justify-end">
              <span className="text-ink">{t('archive.voices', { count: entry.voiceCount })}</span>
              <span aria-hidden>·</span>
              <span>{entry.date}</span>
            </div>
          </Link>
        ))
      )}
    </div>
  )
}
