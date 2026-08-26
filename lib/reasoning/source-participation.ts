import { countPossibleCrossSourcePairs } from '@/lib/reasoning/candidate-funnel'
import type {
  ReasoningClaim,
  ReasoningRelationship,
  RelationshipCandidate,
  RelationshipCluster,
} from '@/lib/reasoning/types'

export type SourceCandidateZeroReason =
  | 'NO_SEMANTIC_MATCH'
  | 'TOPIC_MISMATCH'
  | 'DIMENSION_MISMATCH'
  | 'LOW_SIMILARITY'
  | 'NO_COMPARABLE_PROPOSITION'
  | 'NOT_IN_GENERATION_SET'

export type SourceParticipationRow = {
  sourceId: string
  extracted: number
  relevanceUsable: number
  qualityAccepted: number
  generationClaims: number
  possibleCrossSourcePairs: number
  candidatePairsAsMember: number
  semanticCandidatesAsMember: number
  verifiedRelationships: number
  clusterMembership: number
  candidateZeroReason?: SourceCandidateZeroReason
}

export type SourceParticipationDiagnostics = {
  rows: SourceParticipationRow[]
  relevantSourceCount: number
  generationParticipatingCount: number
  verifiedParticipatingCount: number
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 3),
  )
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const t of a) if (b.has(t)) shared++
  return shared / Math.min(a.size, b.size)
}

function diagnoseCandidateZeroReason(
  sourceId: string,
  sourceClaims: ReasoningClaim[],
  otherClaims: ReasoningClaim[],
): SourceCandidateZeroReason {
  if (sourceClaims.length === 0) return 'NOT_IN_GENERATION_SET'
  if (otherClaims.length === 0) return 'NO_COMPARABLE_PROPOSITION'

  let maxOverlap = 0
  let topicHits = 0
  for (const a of sourceClaims) {
    const ta = tokenSet(a.statement)
    for (const b of otherClaims) {
      const tb = tokenSet(b.statement)
      const overlap = overlapRatio(ta, tb)
      if (overlap > maxOverlap) maxOverlap = overlap
      if (overlap >= 0.08) topicHits++
    }
  }

  if (topicHits === 0) return 'TOPIC_MISMATCH'
  if (maxOverlap < 0.04) return 'LOW_SIMILARITY'
  if (maxOverlap < 0.12) return 'NO_SEMANTIC_MATCH'
  return 'DIMENSION_MISMATCH'
}

export function buildSourceParticipationDiagnostics(input: {
  allClaims: ReasoningClaim[]
  relevanceUsableClaims: ReasoningClaim[]
  qualityAcceptedClaims: ReasoningClaim[]
  generationClaims: ReasoningClaim[]
  candidates: RelationshipCandidate[]
  verified: ReasoningRelationship[]
  significantClusters: RelationshipCluster[]
  relevantSourceIds: string[]
}): SourceParticipationDiagnostics {
  const sourceIds = [...new Set(input.allClaims.map((c) => c.sourceId))].sort()
  const generationBySource = new Map<string, ReasoningClaim[]>()
  for (const c of input.generationClaims) {
    const list = generationBySource.get(c.sourceId) ?? []
    list.push(c)
    generationBySource.set(c.sourceId, list)
  }

  const rows: SourceParticipationRow[] = sourceIds.map((sourceId) => {
    const extracted = input.allClaims.filter((c) => c.sourceId === sourceId).length
    const relevanceUsable = input.relevanceUsableClaims.filter((c) => c.sourceId === sourceId).length
    const qualityAccepted = input.qualityAcceptedClaims.filter((c) => c.sourceId === sourceId).length
    const generationClaims = generationBySource.get(sourceId)?.length ?? 0
    const genClaims = generationBySource.get(sourceId) ?? []
    const otherGenClaims = input.generationClaims.filter((c) => c.sourceId !== sourceId)

    const possibleCrossSourcePairs =
      genClaims.length > 0
        ? countPossibleCrossSourcePairs([...genClaims, ...otherGenClaims]) -
          countPossibleCrossSourcePairs(genClaims)
        : 0

    const candidatePairsAsMember = input.candidates.filter(
      (cand) => {
        const from = input.generationClaims.find((cl) => cl.id === cand.fromClaimId)
        const to = input.generationClaims.find((cl) => cl.id === cand.toClaimId)
        return from?.sourceId === sourceId || to?.sourceId === sourceId
      },
    ).length

    const semanticCandidatesAsMember = input.candidates.filter(
      (cand) =>
        cand.discoveryLevel === 'SEMANTIC_RELATIONSHIP' &&
        (input.generationClaims.find((cl) => cl.id === cand.fromClaimId)?.sourceId === sourceId ||
          input.generationClaims.find((cl) => cl.id === cand.toClaimId)?.sourceId === sourceId),
    ).length

    const verifiedRelationships = input.verified.filter(
      (r) => r.fromSourceId === sourceId || r.toSourceId === sourceId,
    ).length

    const clusterMembership = input.significantClusters.filter((cl) =>
      cl.supportingSourceIds.includes(sourceId),
    ).length

    let candidateZeroReason: SourceCandidateZeroReason | undefined
    if (
      generationClaims > 0 &&
      possibleCrossSourcePairs > 0 &&
      candidatePairsAsMember === 0
    ) {
      candidateZeroReason = diagnoseCandidateZeroReason(sourceId, genClaims, otherGenClaims)
    }

    return {
      sourceId,
      extracted,
      relevanceUsable,
      qualityAccepted,
      generationClaims,
      possibleCrossSourcePairs,
      candidatePairsAsMember,
      semanticCandidatesAsMember,
      verifiedRelationships,
      clusterMembership,
      candidateZeroReason,
    }
  })

  const generationParticipatingCount = new Set(input.generationClaims.map((c) => c.sourceId)).size
  const verifiedParticipatingCount = new Set(
    input.verified.flatMap((r) => [r.fromSourceId, r.toSourceId]),
  ).size

  return {
    rows,
    relevantSourceCount: input.relevantSourceIds.length,
    generationParticipatingCount,
    verifiedParticipatingCount,
  }
}
