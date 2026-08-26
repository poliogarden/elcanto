'use client'

import type { AnalysisResult } from '@/lib/reasoning/analysis-result'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import type { SurvivalAnalysis, SurvivalClaim, SurvivalRelationship } from '@/lib/survival/types'
import { SurvivalDeepDive } from '@/components/survival/survival-deep-dive'
import { ReasoningDiagnosticsPanel } from '@/components/survival/reasoning-diagnostics'
import { useTranslation } from '@/lib/i18n/locale-context'

type Props = {
  survival: SurvivalAnalysis
  reasoning?: MultiSourceReasoning | null
  analysis?: AnalysisResult | null
  onSelectClaim: (claim: SurvivalClaim) => void
  onSelectRelationship: (rel: SurvivalRelationship) => void
}

export function AdvancedAnalysis({
  survival,
  reasoning,
  analysis,
  onSelectClaim,
  onSelectRelationship,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="mt-6 space-y-6">
      <p className="text-xs text-ink-soft">{t('explorer.advancedHint')}</p>
      {reasoning && <ReasoningDiagnosticsPanel reasoning={reasoning} analysis={analysis} />}
      <SurvivalDeepDive
        survival={survival}
        analysis={analysis}
        onSelectClaim={onSelectClaim}
        onSelectRelationship={onSelectRelationship}
      />
    </div>
  )
}
