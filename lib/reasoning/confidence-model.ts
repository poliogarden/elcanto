import type {
  ConfidenceLevel,
  DiscoveryLevel,
  ReasoningClaim,
  RelationshipCandidate,
} from '@/lib/reasoning/types'

export type ConfidenceSignals = {
  semanticSupport: number
  evidenceStrength: number
  crossSourceSupport: number
  logicalCoherence: number
  relevanceScore: number
  contradictionRisk: number
  inferenceDistance: number
}

function inferenceDistance(level: DiscoveryLevel): number {
  if (level === 'DIRECT_MATCH') return 0.15
  if (level === 'SEMANTIC_RELATIONSHIP') return 0.45
  return 0.75
}

export function computeConfidenceSignals(
  candidate: RelationshipCandidate,
  from: ReasoningClaim,
  to: ReasoningClaim,
): ConfidenceSignals {
  const fromEvidence = from.evidenceIds.length > 0 ? 0.8 : 0.4
  const toEvidence = to.evidenceIds.length > 0 ? 0.8 : 0.4
  const evidenceStrength = (fromEvidence + toEvidence) / 2

  const relevanceScore =
    ((from.relevanceScore ?? 0.5) + (to.relevanceScore ?? 0.5)) / 2

  const sharedConcepts = from.conceptIds.filter((id) => to.conceptIds.includes(id))
  const semanticSupport =
    candidate.discoveryLevel === 'DIRECT_MATCH'
      ? 0.85
      : candidate.discoveryLevel === 'SEMANTIC_RELATIONSHIP'
        ? 0.65
        : 0.45

  const crossSourceSupport = from.sourceId !== to.sourceId ? 1 : 0

  const logicalCoherence =
    candidate.type === 'INDEPENDENT' ? 0.2 : semanticSupport

  const contradictionRisk =
    candidate.type === 'CONTRADICTION' || candidate.type === 'TENSION' ? 0.3 : 0.1

  return {
    semanticSupport,
    evidenceStrength,
    crossSourceSupport,
    logicalCoherence,
    relevanceScore,
    contradictionRisk,
    inferenceDistance: inferenceDistance(candidate.discoveryLevel),
  }
}

export function combineConfidence(signals: ConfidenceSignals): ConfidenceLevel {
  const base =
    signals.semanticSupport * 0.25 +
    signals.evidenceStrength * 0.2 +
    signals.crossSourceSupport * 0.15 +
    signals.logicalCoherence * 0.2 +
    signals.relevanceScore * 0.15 -
    signals.contradictionRisk * 0.05 -
    signals.inferenceDistance * 0.15

  if (base >= 0.72) return 'strong'
  if (base >= 0.48) return 'moderate'
  return 'weak'
}

export function meetsEvidenceRequirement(
  level: DiscoveryLevel,
  signals: ConfidenceSignals,
): boolean {
  if (level === 'DIRECT_MATCH') return signals.evidenceStrength >= 0.35
  if (level === 'SEMANTIC_RELATIONSHIP') return signals.evidenceStrength >= 0.4
  return signals.evidenceStrength >= 0.55 && signals.logicalCoherence >= 0.5
}
