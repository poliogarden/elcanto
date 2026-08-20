'use client'

import { InsightGraphSection } from '@/components/insight-graph/insight-graph-section'
import { VoiceRelationshipCanvas } from '@/components/home/voice-relationship-canvas'
import { useTranslation } from '@/lib/i18n/locale-context'
import { getTopShapedRelationships } from '@/lib/synthesis/result-helpers'
import type { SynthesisViewModel } from '@/lib/types/view-model'
import type { Voice } from '@/lib/types/voice'

type Props = {
  view: SynthesisViewModel
  voices: Voice[]
  onAskAboutInsight?: (statement: string) => void
}

export function WhyThisEmerged({ view, voices, onAskAboutInsight }: Props) {
  const { t } = useTranslation()
  const shaped = getTopShapedRelationships(view, 3)

  const relLabel = (cat: string) => {
    if (cat === 'shared') return t('relationship.shared')
    if (cat === 'different') return t('relationship.different')
    if (cat === 'contradiction') return t('relationship.contradiction')
    return t('relationship.emerges')
  }

  return (
    <section id="why" className="border-b border-line py-10 md:py-14">
      <p className="font-serif text-lg font-medium md:mono-label md:text-[10px] md:font-normal md:text-ink-soft">
        {t('result.whyTitle')}
      </p>

      <div className="mt-6 w-full">
        <VoiceRelationshipCanvas voices={voices} phase="complete" compact />
      </div>

      {shaped.length > 0 && (
        <div className="mt-10">
          <p className="mt-4 font-serif text-sm text-ink-soft">
            {t('result.shapedInsight')}
          </p>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {shaped.map((item) => (
              <li key={item.id} className="py-5">
                <p className="mt-2 font-serif text-sm text-ink-soft">
                  {item.symbol} {relLabel(item.category)}
                </p>
                <p className="mt-2 max-w-2xl font-serif text-lg leading-relaxed">{item.statement}</p>
                {item.voices.length > 0 && (
                  <p className="mono mt-2 text-[10px] text-ink-soft">
                    {item.voices.map((v) => String(v).padStart(2, '0')).join(' · ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.insightGraph && (
        <div className="mt-10">
          <InsightGraphSection
            graph={view.insightGraph}
            voices={voices}
            whyMode
            onAskAboutInsight={onAskAboutInsight}
          />
        </div>
      )}
    </section>
  )
}
