'use client'

import { useRef, useState } from 'react'
import { HomePageShell } from '@/components/home/home-page-shell'
import { CreateFromSection } from '@/components/synthesis/result/create-from-section'
import { ExploreDeeper } from '@/components/synthesis/result/explore-deeper'
import { ResultActions } from '@/components/synthesis/result/result-actions'
import { ResultAsk } from '@/components/synthesis/result/result-ask'
import { ResultHero } from '@/components/synthesis/result/result-hero'
import { WhyThisEmerged } from '@/components/synthesis/result/why-this-emerged'
import { useTranslation } from '@/lib/i18n/locale-context'
import { markSavedToArchive } from '@/lib/storage/synthesis-session'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { SynthesisViewModel } from '@/lib/types/view-model'
import type { KnowledgeExtensionStatus } from '@/components/synthesis/use-deferred-knowledge-extension'

type SynthesisViewProps = {
  view: SynthesisViewModel
  document: SynthesisDocument
  knowledgeExtensionStatus?: KnowledgeExtensionStatus
}

export type AskScope = {
  type: string
  label: string
  context: string
}

export function SynthesisView({
  view,
  document,
}: SynthesisViewProps) {
  const { t } = useTranslation()
  const [saved, setSaved] = useState(document.savedToArchive ?? false)
  const [saving, setSaving] = useState(false)
  const [askScope, setAskScope] = useState<AskScope | null>(null)
  const [prefillQuestion, setPrefillQuestion] = useState('')
  const whyRef = useRef<HTMLDivElement>(null)
  const exploreRef = useRef<HTMLDivElement>(null)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document }),
      })
      if (res.ok) {
        markSavedToArchive(document.id)
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  function scrollToWhy() {
    whyRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function scrollToExplore(section?: string) {
    exploreRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (section) {
      window.setTimeout(() => {
        const el = globalThis.document.getElementById(`explore-${section}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 400)
    }
  }

  function scrollToAsk(question?: string) {
    if (question) setPrefillQuestion(question)
    globalThis.document.getElementById('ask')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <HomePageShell>
      <section className="flex justify-end py-4">
        <ResultActions
          synthesisId={document.id}
          saved={saved}
          saving={saving}
          onSave={() => void handleSave()}
        />
      </section>

      <ResultHero
        view={view}
        onWhy={scrollToWhy}
        onSeeDifferences={() => scrollToExplore('different')}
      />

      <div ref={whyRef}>
        <WhyThisEmerged
          view={view}
          voices={view.voices}
          onAskAboutInsight={(statement) => {
            setAskScope({
              type: 'insight',
              label: t('result.insightScope'),
              context: statement,
            })
            scrollToAsk(t('result.tellMeMore', { statement }))
          }}
        />
      </div>

      <div ref={exploreRef}>
        <ExploreDeeper
          view={view}
          document={document}
          askScope={askScope}
          onAskScope={setAskScope}
          onAsk={scrollToAsk}
        />
      </div>

      <ResultAsk
        view={view}
        document={document}
        scope={askScope}
        onClearScope={() => setAskScope(null)}
        prefillQuestion={prefillQuestion}
        onPrefillConsumed={() => setPrefillQuestion('')}
      />

      <CreateFromSection synthesisId={document.id} />
    </HomePageShell>
  )
}
