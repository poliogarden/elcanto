import {
  filterQualityInsights,
  isGenericInsight,
} from '@/lib/synthesis/insight-quality'
import { rejectInsightWithReasons } from '@/lib/synthesis/insight-partition'
import type {
  FourthIdea,
  FourthIdeaCandidate,
  FourthIdeaSelection,
  UnderstandingChange,
} from '@/lib/types/fourth-idea'
import type { Insight, CrossSourcePattern, SynthesisConclusion } from '@/lib/types/relationship'
import type { RejectedInsight } from '@/lib/types/knowledge'

function specificityScore(statement: string): number {
  const words = statement.split(/\s+/).filter(Boolean).length
  if (words < 8) return 0.35
  if (words > 40) return 0.7
  return Math.min(0.95, 0.45 + words * 0.012)
}

function insightToFourthIdea(insight: Insight): FourthIdea {
  return {
    id: `fourth_${insight.id}`,
    statement: insight.statement,
    explanation: insight.derivation,
    sourceIds: insight.sourceIds,
    claimIds: insight.claimIds,
    relationshipIds: insight.relationshipIds,
    patternIds: insight.patternIds,
    noveltyScore: insight.noveltyScore,
    specificityScore: specificityScore(insight.statement),
    confidence: insight.confidence,
    derivationSummary: insight.derivation.slice(0, 280),
    multiSourceDependency: insight.sourceIds.length >= 2,
  }
}

function emergentToFourthIdea(
  emergent: string,
  synthesis: SynthesisConclusion,
  patterns: CrossSourcePattern[],
): FourthIdea | null {
  const text = emergent.trim()
  if (!text || isGenericInsight(text)) return null
  if (text.split(/\s+/).length < 10) return null

  const pattern = patterns[0]
  return {
    id: 'fourth_emergent',
    statement: text,
    explanation: synthesis.overallConclusion || synthesis.bottomLine,
    sourceIds: synthesis.usedSourceIds,
    claimIds: synthesis.sections.flatMap((s) => s.claimIds).slice(0, 6),
    relationshipIds: pattern?.relationshipIds ?? [],
    patternIds: pattern ? [pattern.id] : [],
    noveltyScore: 0.72,
    specificityScore: specificityScore(text),
    confidence: 0.68,
    derivationSummary: 'Derived from cross-source emergent statement.',
    multiSourceDependency: synthesis.usedSourceIds.length >= 2,
  }
}

function rankCandidate(a: FourthIdea, b: FourthIdea): number {
  const scoreA = a.noveltyScore * 0.4 + a.specificityScore * 0.35 + a.confidence * 0.25
  const scoreB = b.noveltyScore * 0.4 + b.specificityScore * 0.35 + b.confidence * 0.25
  return scoreB - scoreA
}

function passesComparativeValue(idea: FourthIdea): boolean {
  return idea.sourceIds.length >= 2
}

function passesFourthIdeaTests(idea: FourthIdea): boolean {
  if (isGenericInsight(idea.statement)) return false
  if (!passesComparativeValue(idea)) return false
  if (idea.noveltyScore < 0.45) return false
  if (idea.specificityScore < 0.4) return false
  const hasLineage =
    idea.claimIds.length > 0 ||
    idea.relationshipIds.length > 0 ||
    idea.patternIds.length > 0
  return hasLineage && idea.derivationSummary.trim().length > 15
}

export function selectFourthIdea(input: {
  insights: Insight[]
  synthesis: SynthesisConclusion
  patterns: CrossSourcePattern[]
  noStrongRelationship: boolean
}): FourthIdeaSelection {
  const { insights, synthesis, patterns, noStrongRelationship } = input

  if (noStrongRelationship && synthesis.synthesisType === 'mostly_independent') {
    return {
      fourthIdea: null,
      candidates: [],
      rejected: insights.map(
        (i) =>
          rejectInsightWithReasons(i) ?? {
            id: i.id,
            statement: i.statement,
            reasons: ['LOW_NOVELTY'],
          },
      ),
      noStrongRelationship: true,
    }
  }

  const qualityInsights = filterQualityInsights(insights)
  const fromInsights = qualityInsights.map(insightToFourthIdea)
  const emergent = synthesis.emergentStatement
    ? emergentToFourthIdea(synthesis.emergentStatement, synthesis, patterns)
    : null

  const pool = [...fromInsights]
  if (emergent) pool.push(emergent)

  const accepted: FourthIdea[] = []
  const rejected: RejectedInsight[] = []

  for (const insight of insights) {
    if (qualityInsights.some((q) => q.id === insight.id)) continue
    const rejection = rejectInsightWithReasons(insight)
    if (rejection) rejected.push(rejection)
  }

  for (const candidate of pool) {
    if (passesFourthIdeaTests(candidate)) accepted.push(candidate)
    else {
      const reasons: RejectedInsight['reasons'] = []
      if (isGenericInsight(candidate.statement)) reasons.push('GENERIC', 'LOW_SPECIFICITY')
      if (candidate.noveltyScore < 0.45) reasons.push('LOW_NOVELTY')
      if (!passesComparativeValue(candidate)) reasons.push('NO_ADDED_VALUE')
      if (candidate.claimIds.length === 0 && candidate.relationshipIds.length === 0) {
        reasons.push('NO_TRACEABILITY')
      }
      rejected.push({
        id: candidate.id,
        statement: candidate.statement,
        reasons: reasons.length > 0 ? [...new Set(reasons)] : ['LOW_NOVELTY'],
      })
    }
  }

  accepted.sort(rankCandidate)
  const selected = accepted[0] ?? null

  const candidates: FourthIdeaCandidate[] = pool.map((c) => ({
    ...c,
    selected: selected?.id === c.id,
    rejectReasons: rejected.find((r) => r.id === c.id || r.statement === c.statement)?.reasons,
  }))

  return {
    fourthIdea: selected,
    candidates,
    rejected,
    noStrongRelationship: noStrongRelationship && !selected,
  }
}

export function buildUnderstandingChange(
  before: FourthIdea | null | undefined,
  after: FourthIdea | null,
  trigger: UnderstandingChange['trigger'] = 're_synthesis',
): UnderstandingChange | null {
  if (!before || !after) return null
  if (before.statement.trim() === after.statement.trim()) return null
  return {
    before: before.statement,
    after: after.statement,
    changedAt: new Date().toISOString(),
    trigger,
  }
}
