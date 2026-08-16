'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { IssueNavigation } from '@/components/issue-navigation'
import { Masthead } from '@/components/masthead'
import { SynthesisView } from '@/components/synthesis-view'
import { loadSynthesisDocument } from '@/lib/storage/synthesis-session'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { toSynthesisViewModel } from '@/lib/synthesis/presenter'

export default function SynthesisPage() {
  const params = useParams()
  const id = params.id as string
  const [doc, setDoc] = useState<SynthesisDocument | null>(null)

  useEffect(() => {
    async function load() {
      const local = loadSynthesisDocument(id)
      if (local) {
        setDoc(local)
        return
      }

      try {
        const res = await fetch(`/api/synthesis/${id}`)
        if (res.ok) {
          const data = (await res.json()) as { document?: SynthesisDocument }
          if (data.document) {
            setDoc(data.document)
            return
          }
        }
      } catch {
        // fall through
      }
      setDoc(null)
    }
    void load()
  }, [id])

  if (!doc) {
    return (
      <main className="min-h-screen bg-background">
        <Masthead />
        <div className="px-5 py-20 md:px-8">
          <p className="mono-label text-xs text-ink-soft">Synthesis not found</p>
          <Link href="/" className="mono-label mt-4 inline-block text-xs text-ink hover:opacity-60">
            Start a new synthesis {'\u2192'}
          </Link>
        </div>
      </main>
    )
  }

  const view = toSynthesisViewModel(doc)
  if (!view) {
    return (
      <main className="min-h-screen bg-background">
        <Masthead />
        <div className="px-5 py-20 md:px-8">
          <p className="mono-label text-xs text-ink-soft">Synthesis is still processing…</p>
          <Link
            href={`/synthesize/${id}`}
            className="mono-label mt-4 inline-block text-xs text-ink hover:opacity-60"
          >
            Return to pipeline {'\u2192'}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Masthead />
      <SynthesisView view={view} document={doc} />
      <footer className="border-t border-line px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="font-serif text-2xl">
            elcanto<span className="text-ink-soft">.</span>
          </span>
          <span className="mono-label text-[11px] text-ink-soft">Many voices. One understanding.</span>
          <Link href="/" className="mono-label text-[11px] text-ink hover:opacity-60">
            New synthesis {'\u2192'}
          </Link>
        </div>
      </footer>
    </main>
  )
}
