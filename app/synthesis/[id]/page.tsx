'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { BrandFooter } from '@/components/brand/brand-footer'
import { HomePageShell } from '@/components/home/home-page-shell'
import { Masthead } from '@/components/masthead'
import { SynthesisView } from '@/components/synthesis-view'
import { SynthesisPerfDebug } from '@/components/synthesis/synthesis-perf-debug'
import { useDeferredKnowledgeExtension } from '@/components/synthesis/use-deferred-knowledge-extension'
import { loadSynthesisDocument } from '@/lib/storage/synthesis-session'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { toSynthesisViewModel } from '@/lib/synthesis/presenter'

export default function SynthesisPage() {
  const { t } = useTranslation()
  const params = useParams()
  const id = params.id as string
  const [doc, setDoc] = useState<SynthesisDocument | null>(null)

  useDeferredKnowledgeExtension(doc, setDoc)

  const view = useMemo(() => (doc ? toSynthesisViewModel(doc) : null), [doc])

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
        <HomePageShell className="flex min-h-[40vh] flex-col items-center justify-center py-16 text-center">
          <p className="mono-label text-xs text-ink-soft">{t('errors.synthesisNotFound')}</p>
          <Link href="/" className="mono-label mt-4 inline-block text-xs text-ink hover:opacity-60">
            {t('errors.startNew')}
          </Link>
        </HomePageShell>
      </main>
    )
  }

  if (!view) {
    return (
      <main className="min-h-screen bg-background">
        <Masthead />
        <HomePageShell className="flex min-h-[40vh] flex-col items-center justify-center py-16 text-center">
          <p className="mono-label text-xs text-ink-soft">{t('errors.stillProcessing')}</p>
          <Link
            href={`/synthesize/${id}`}
            className="mono-label mt-4 inline-block text-xs text-ink hover:opacity-60"
          >
            {t('errors.returnPipeline')}
          </Link>
        </HomePageShell>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Masthead />
      <SynthesisPerfDebug synthesisId={id} />
      <SynthesisView view={view} document={doc} />
      <BrandFooter />
    </main>
  )
}
