'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { BrandFooter } from '@/components/brand/brand-footer'
import { HomePageShell } from '@/components/home/home-page-shell'
import { Masthead } from '@/components/masthead'
import { SingleSourceBoard } from '@/components/reasoning/single-source-board'
import { InsightExplorerResult } from '@/components/insight-explorer/insight-explorer-result'
import { SurvivalBoard } from '@/components/survival/survival-board'
import { isDirectSynthesisDocument } from '@/lib/direct-synthesis/persisted'
import { SynthesisView } from '@/components/synthesis-view'
import { SynthesisPerfDebug } from '@/components/synthesis/synthesis-perf-debug'
import { getBoardSurvival } from '@/lib/reasoning/adapter-survival'
import { isSynthesisDocumentHydrated } from '@/lib/storage/synthesis-document-storage'
import { loadSynthesisDocument, saveSynthesisDocument } from '@/lib/storage/synthesis-session'
import { fetchSynthesisJobBySynthesisId } from '@/lib/synthesis/synthesis-job-client'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { toSynthesisViewModel } from '@/lib/synthesis/presenter'

function SynthesisPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-background font-ui">
      <Masthead />
      <div className="flex-1">{children}</div>
      <BrandFooter />
    </main>
  )
}

export default function SynthesisPage() {
  const { t } = useTranslation()
  const params = useParams()
  const id = params.id as string
  const [doc, setDoc] = useState<SynthesisDocument | null>(null)

  const view = doc?.result ? toSynthesisViewModel(doc) : null
  const boardSurvival = useMemo(() => (doc ? getBoardSurvival(doc) : null), [doc])

  useEffect(() => {
    async function load() {
      const local = loadSynthesisDocument(id)
      if (local && isSynthesisDocumentHydrated(local)) {
        setDoc(local)
        return
      }

      try {
        const job = await fetchSynthesisJobBySynthesisId(id)
        if (job?.document) {
          setDoc(job.document)
          saveSynthesisDocument(job.document)
          return
        }
      } catch {
        // fall through
      }

      try {
        const res = await fetch(`/api/synthesis/${id}`)
        if (res.ok) {
          const data = (await res.json()) as { document?: SynthesisDocument }
          if (data.document) {
            setDoc(data.document)
            saveSynthesisDocument(data.document)
            return
          }
        }
      } catch {
        // fall through
      }

      if (local) {
        setDoc(local)
        return
      }

      setDoc(null)
    }
    void load()
  }, [id])

  if (!doc) {
    return (
      <SynthesisPageShell>
        <HomePageShell className="flex min-h-[40vh] flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-ink-soft">{t('errors.synthesisNotFound')}</p>
          <Link href="/" className="mt-4 text-sm font-medium text-ink hover:opacity-60">
            {t('errors.startNew')}
          </Link>
        </HomePageShell>
      </SynthesisPageShell>
    )
  }

  if (doc.directSynthesis && isDirectSynthesisDocument(doc)) {
    return <InsightExplorerResult direct={doc.directSynthesis} document={doc} />
  }

  if (doc.reasoning?.mode === 'single') {
    return (
      <SynthesisPageShell>
        <SingleSourceBoard reasoning={doc.reasoning} document={doc} />
      </SynthesisPageShell>
    )
  }

  if (boardSurvival) {
    return (
      <SynthesisPageShell>
        <SurvivalBoard survival={boardSurvival} document={doc} />
      </SynthesisPageShell>
    )
  }

  if (!view) {
    return (
      <SynthesisPageShell>
        <HomePageShell className="flex min-h-[40vh] flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-ink-soft">{t('errors.stillProcessing')}</p>
          <Link
            href={`/synthesize/${id}`}
            className="mt-4 text-sm font-medium text-ink hover:opacity-60"
          >
            {t('errors.returnPipeline')}
          </Link>
        </HomePageShell>
      </SynthesisPageShell>
    )
  }

  return (
    <SynthesisPageShell>
      <SynthesisPerfDebug synthesisId={id} />
      <SynthesisView view={view} document={doc} />
    </SynthesisPageShell>
  )
}
