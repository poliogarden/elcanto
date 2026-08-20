import { discoverThemes } from '@/lib/synthesis/theme-engine'
import {
  buildEditorialComparisons,
  buildReportMeta,
  buildSynthesisFindings,
} from '@/lib/synthesis/finding-engine'
import type { SynthesisResult } from '@/lib/types/analysis'
import type { RelationshipGraph } from '@/lib/types/relationship'
import type { SetAnalysis } from '@/lib/types/knowledge'
import type { SourceAnalysis } from '@/lib/types/source'

export function enrichSynthesisReport(input: {
  sources: SourceAnalysis[]
  graph: RelationshipGraph
  setAnalysis: SetAnalysis
  result: SynthesisResult
}): SynthesisResult {
  const claimCount = input.sources.reduce((n, s) => n + (s.claims?.length ?? 0), 0)
  const themes = discoverThemes(input.sources, input.result.patterns)
  const findings = buildSynthesisFindings(
    themes,
    input.setAnalysis,
    input.result.patterns,
    input.graph.relationships,
  )
  const { agreements, disagreements } = buildEditorialComparisons(
    input.sources,
    input.graph.relationships,
  )

  return {
    ...input.result,
    themes,
    findings,
    editorialAgreements: agreements,
    editorialDisagreements: disagreements,
    reportMeta: buildReportMeta({
      claimCount,
      themeCount: themes.length,
      relationshipCount: input.graph.relationships.length,
      findingCount: findings.length,
    }),
  }
}
