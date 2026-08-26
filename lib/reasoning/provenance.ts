import type {
  EvidenceRef,
  ReasoningLevel,
  TimestampAvailability,
} from '@/lib/reasoning/provenance-types'
import type {
  ReasoningClaim,
  ReasoningEvidence,
  ReasoningInsight,
  ReasoningJudgment,
  ReasoningPattern,
  ReasoningRelationship,
} from '@/lib/reasoning/types'

export function isCrossSourceRelationship(rel: ReasoningRelationship): boolean {
  return rel.fromSourceId !== rel.toSourceId
}

export function evidenceRefFromRecord(
  evidence: ReasoningEvidence,
  claimId?: string,
): EvidenceRef {
  const hasTimestamp = evidence.timestampStart != null && evidence.timestampStart > 0
  return {
    evidenceId: evidence.id,
    claimId,
    sourceId: evidence.sourceId,
    videoId: evidence.videoId,
    text: evidence.text,
    timestampStart: evidence.timestampStart,
    timestampEnd: evidence.timestampEnd,
    timestampAvailability: hasTimestamp ? 'available' : 'unavailable',
  }
}

export function evidenceRefsForClaim(
  claim: ReasoningClaim,
  evidenceById: Map<string, ReasoningEvidence>,
): EvidenceRef[] {
  return claim.evidenceIds
    .map((eid) => evidenceById.get(eid))
    .filter((e): e is ReasoningEvidence => Boolean(e))
    .map((e) => evidenceRefFromRecord(e, claim.id))
}

export function reasoningLevelForRelationship(rel: ReasoningRelationship): ReasoningLevel {
  if (rel.verificationStatus !== 'SUPPORTED') return 'INFERRED'
  if (rel.discoveryLevel === 'CROSS_SOURCE_INFERENCE') return 'INFERRED'
  if (rel.discoveryLevel === 'SEMANTIC_RELATIONSHIP') return 'SYNTHESIZED'
  return 'SUPPORTED'
}

export function reasoningLevelForClaim(claim: ReasoningClaim): ReasoningLevel {
  if (claim.evidenceIds.length > 0) return 'SUPPORTED'
  return 'SYNTHESIZED'
}

export function reasoningLevelForPattern(pattern: ReasoningPattern): ReasoningLevel {
  if (pattern.sourceIds.length >= 2 && pattern.relationshipIds.length > 0) return 'SYNTHESIZED'
  if (pattern.sourceIds.length >= 2) return 'SYNTHESIZED'
  return 'SUPPORTED'
}

export function reasoningLevelForJudgment(
  judgment: ReasoningJudgment,
  sourceCount: number,
): ReasoningLevel {
  if (judgment.verificationStatus === 'REJECTED') return 'INFERRED'
  if (sourceCount <= 2 && /\b(industry|market-wide|widespread|consensus)\b/i.test(judgment.statement)) {
    return 'INFERRED'
  }
  return 'SYNTHESIZED'
}

export function reasoningLevelForInsight(insight: ReasoningInsight): ReasoningLevel {
  return 'INFERRED'
}

export const OVERGENERALIZATION_PHRASES = [
  'industry consensus',
  'market-wide',
  'widespread adoption',
  'the industry',
  'market trend',
  'much-needed answer',
  'pivotal technology',
  'significant shift in the ai industry',
  'decline in api relevance',
  'traditional apis will',
  'apis will become irrelevant',
]

export function containsOvergeneralization(text: string, synthesizedSourceCount: number): boolean {
  if (synthesizedSourceCount > 2) return false
  const lower = text.toLowerCase()
  return OVERGENERALIZATION_PHRASES.some((p) => lower.includes(p))
}

export function softenOvergeneralization(text: string, synthesizedSourceCount: number): string {
  if (!containsOvergeneralization(text, synthesizedSourceCount)) return text
  if (/within the analyzed sources/i.test(text)) return text
  return `Within the analyzed sources, ${text.replace(/^\s*(the|this)\s+/i, '')}`
}

export function scopePhrase(synthesizedSourceCount: number): string {
  if (synthesizedSourceCount <= 1) return 'the analyzed source'
  if (synthesizedSourceCount === 2) return 'both analyzed sources'
  return `${synthesizedSourceCount} analyzed sources`
}
