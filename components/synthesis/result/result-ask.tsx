'use client'

import { useRef } from 'react'
import { AskSynthesis } from '@/components/synthesis/ask-synthesis'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { SynthesisViewModel } from '@/lib/types/view-model'
import type { AskScope } from '@/components/synthesis-view'

type Props = {
  view: SynthesisViewModel
  document: SynthesisDocument
  scope: AskScope | null
  onClearScope: () => void
  prefillQuestion: string
  onPrefillConsumed: () => void
}

export function ResultAsk({
  view,
  document,
  scope,
  onClearScope,
  prefillQuestion,
  onPrefillConsumed,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  return (
    <section ref={ref} id="ask" className="border-b border-line py-10 md:py-14">
      <p className="font-serif text-sm text-ink-soft md:mono-label md:text-[10px]">
        {t('result.askVideos')}
      </p>

      <AskSynthesis
        view={view}
        document={document}
        scope={scope}
        onClearScope={onClearScope}
        prefillQuestion={prefillQuestion}
        onPrefillConsumed={onPrefillConsumed}
        compact
        progressive
      />
    </section>
  )
}
