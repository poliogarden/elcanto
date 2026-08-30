import type { EvidenceSnippet } from '@/lib/direct-synthesis/evidence'
import type {
  CandidateInsight,
  ConnectionConcept,
  DirectInsight,
  DirectSourceAnswer,
  EvidenceValidationStatus,
  SourceConcept,
} from '@/lib/direct-synthesis/types'
import { isComparableForCrossSource } from '@/lib/direct-synthesis/synthesize-direct'

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function englishTokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z]{4,}/g) ?? []
}

function scorePropositionAgainstEvidence(
  proposition: string,
  evidenceText: string,
): number {
  const norm = normalize(proposition)
  const evNorm = normalize(evidenceText)
  if (
    evNorm.includes(norm.slice(0, Math.min(48, norm.length))) ||
    norm.includes(evNorm.slice(0, 48))
  ) {
    return 1
  }
  let best = 0
  const words = norm.split(' ').filter((w) => w.length > 4)
  if (words.length > 0) {
    const hits = words.filter((w) => evNorm.includes(w)).length
    best = hits / words.length
  }
  const enWords = englishTokens(proposition)
  if (enWords.length >= 2) {
    const enHits = enWords.filter((w) => evNorm.includes(w)).length
    best = Math.max(best, enHits / enWords.length)
  }
  return best
}

export function groundProposition(
  proposition: string,
  sourceId: string,
  catalog: EvidenceSnippet[],
  contextText?: string,
): { status: EvidenceValidationStatus; ref?: string; evidenceText?: string } {
  const candidates = catalog.filter((e) => e.sourceId === sourceId)
  if (candidates.length === 0) return { status: 'UNSUPPORTED' }

  let bestScore = 0
  let best: EvidenceSnippet | undefined

  for (const ev of candidates) {
    const score = scorePropositionAgainstEvidence(proposition, ev.text)
    if (score > bestScore) {
      bestScore = score
      best = ev
    }
  }

  if (!best || bestScore < 0.35) {
    const contextTokens = englishTokens(contextText ?? '')
    if (contextTokens.length >= 3) {
      for (const ev of candidates) {
        const evNorm = normalize(ev.text)
        const hits = contextTokens.filter((t) => evNorm.includes(t)).length
        const score = hits / contextTokens.length
        if (score > bestScore) {
          bestScore = score
          best = ev
        }
      }
    }
  }

  if (!best) return { status: 'UNSUPPORTED' }
  if (bestScore >= 0.85) {
    return { status: 'SUPPORTED', ref: best.ref, evidenceText: best.text }
  }
  if (bestScore >= 0.35) {
    return { status: 'PARTIAL', ref: best.ref, evidenceText: best.text }
  }
  return { status: 'UNSUPPORTED' }
}

export type GroundedCandidateRemoval = {
  candidate: CandidateInsight
  reason: 'UNSUPPORTED' | 'INSUFFICIENT_SOURCES' | 'NOT_COMPARABLE'
}

export type GroundCandidateInsightsResult = {
  insights: DirectInsight[]
  removed: number
  partiallyGroundedCount: number
  removedCandidates: GroundedCandidateRemoval[]
}

function allComparableSourceIds(
  sourceIds: string[],
  sourceAnswers: DirectSourceAnswer[],
): boolean {
  if (sourceIds.length === 0) return false
  return sourceIds.every((id) => {
    const sa = sourceAnswers.find((a) => a.sourceId === id)
    return sa && isComparableForCrossSource(sa.answerability)
  })
}

function buildConnectionLabel(candidate: CandidateInsight): string {
  const thesis = candidate.thesis.trim()
  if (thesis.length <= 120) return thesis
  return candidate.title.trim() || thesis.slice(0, 120)
}

function groundSingleCandidate(
  candidate: CandidateInsight,
  catalog: EvidenceSnippet[],
  sourceAnswers: DirectSourceAnswer[],
): { insight: DirectInsight | null; partial: boolean; reason?: GroundedCandidateRemoval['reason'] } {
  const groundedInteractions: Array<{
    sourceId: string
    proposition: string
    status: EvidenceValidationStatus
    ref?: string
    evidenceText?: string
  }> = []

  for (const interaction of candidate.sourceInteractions) {
    const insightContext = `${candidate.title} ${candidate.thesis} ${candidate.explanation ?? ''} ${interaction.proposition}`
    const grounded = groundProposition(
      interaction.proposition,
      interaction.sourceId,
      catalog,
      insightContext,
    )
    if (grounded.status === 'UNSUPPORTED') continue
    groundedInteractions.push({
      sourceId: interaction.sourceId,
      proposition: interaction.proposition,
      status: grounded.status,
      ref: grounded.ref,
      evidenceText: grounded.evidenceText,
    })
  }

  const supportedSources = new Set(groundedInteractions.map((g) => g.sourceId))
  let partialCount = groundedInteractions.filter((g) => g.status === 'PARTIAL').length

  if (supportedSources.size < 2) {
    return { insight: null, partial: false, reason: 'INSUFFICIENT_SOURCES' }
  }

  if (!allComparableSourceIds([...supportedSources], sourceAnswers)) {
    return { insight: null, partial: false, reason: 'NOT_COMPARABLE' }
  }

  const sourceConcepts: SourceConcept[] = []
  const evidenceRefs: string[] = []

  for (const g of groundedInteractions) {
    if (!g.ref) continue
    const conceptId = `${candidate.id}_sc_${g.sourceId}`
    const label =
      g.status === 'PARTIAL' && g.evidenceText
        ? g.evidenceText
        : g.proposition
    sourceConcepts.push({
      id: conceptId,
      sourceId: g.sourceId,
      label,
      summary: g.status === 'PARTIAL' ? g.proposition : undefined,
      evidenceRefs: [g.ref],
      origin: 'SOURCE',
    })
    evidenceRefs.push(g.ref)
  }

  if (sourceConcepts.length < 2) {
    return { insight: null, partial: false, reason: 'INSUFFICIENT_SOURCES' }
  }

  const sourceIds = [...new Set(sourceConcepts.map((c) => c.sourceId))]
  const connectionConcepts: ConnectionConcept[] = [
    {
      id: `${candidate.id}_conn_1`,
      label: buildConnectionLabel(candidate),
      explanation:
        candidate.explanation?.trim() ||
        candidate.thesis ||
        'Cross-source interpretive connection.',
      derivedFromConceptIds: sourceConcepts.map((c) => c.id),
      origin: 'AI_DERIVED',
    },
  ]

  let explanation = candidate.explanation
  if (partialCount > 0 && explanation) {
    explanation = `${explanation} (일부 출처 명제는 원문과 부분적으로만 일치합니다.)`
  }

  return {
    insight: {
      id: candidate.id,
      title: candidate.title,
      summary: candidate.thesis,
      explanation,
      sourceIds,
      sourceConcepts,
      connectionConcepts,
      evidenceRefs: [...new Set(evidenceRefs)],
    },
    partial: partialCount > 0,
  }
}

export function groundCandidateInsights(input: {
  candidates: CandidateInsight[]
  evidenceCatalog: EvidenceSnippet[]
  sourceAnswers: DirectSourceAnswer[]
}): GroundCandidateInsightsResult {
  const insights: DirectInsight[] = []
  const removedCandidates: GroundedCandidateRemoval[] = []
  let partiallyGroundedCount = 0

  for (const candidate of input.candidates.slice(0, 4)) {
    const result = groundSingleCandidate(
      candidate,
      input.evidenceCatalog,
      input.sourceAnswers,
    )
    if (result.insight) {
      insights.push(result.insight)
      if (result.partial) partiallyGroundedCount++
    } else {
      removedCandidates.push({
        candidate,
        reason: result.reason ?? 'UNSUPPORTED',
      })
    }
  }

  return {
    insights,
    removed: removedCandidates.length,
    partiallyGroundedCount,
    removedCandidates,
  }
}
