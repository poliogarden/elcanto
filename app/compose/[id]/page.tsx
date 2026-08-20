'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ComposeView } from '@/components/compose/compose-view'
import { BrandFooter } from '@/components/brand/brand-footer'
import { HomePageShell } from '@/components/home/home-page-shell'
import { Masthead } from '@/components/masthead'
import { loadSynthesisDocument } from '@/lib/storage/synthesis-session'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

export default function ComposePage() {
  const params = useParams()
  const id = params.id as string
  const [doc, setDoc] = useState<SynthesisDocument | null>(null)

  useEffect(() => {
    async function load() {
      const local = loadSynthesisDocument(id)
      if (local?.result) {
        setDoc(local)
        return
      }

      try {
        const res = await fetch(`/api/synthesis/${id}`)
        if (res.ok) {
          const data = (await res.json()) as { document?: SynthesisDocument }
          if (data.document?.result) {
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
        <HomePageShell className="py-16">
          <p className="mono-label text-xs text-ink-soft">Complete synthesis required for compose.</p>
          <Link
            href={`/synthesis/${id}`}
            className="mono-label mt-4 inline-block text-xs text-ink hover:opacity-60"
          >
            Return to synthesis {'\u2192'}
          </Link>
        </HomePageShell>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Masthead />
      <ComposeView synthesisDoc={doc} synthesisId={id} />
      <BrandFooter />
    </main>
  )
}
