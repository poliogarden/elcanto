import { assessClaimAlignment } from '@/lib/reasoning/alignment'
import {
  assessGenericness,
  claimsForRelationship,
  dynamicClusterLabel,
  inferDimension,
  normalizeRelationshipProposition,
  normalizedPropositionSimilarity,
  pickCanonicalText,
  propositionSimilarity,
  stanceFamily,
  visualKindForRelationship,
} from '@/lib/reasoning/relationship-semantics'
import { scoreClaimRelevance } from '@/lib/reasoning/relevance-scoring'
import type {
  ConfidenceLevel,
  ReasoningClaim,
  ReasoningEvidence,
  ReasoningRelationship,
  ReasoningRelationshipType,
  RelationshipCluster,
} from '@/lib/reasoning/types'

export type CompressionStats = {
  verifiedInput: number
  normalizedPropositions: number
  deduplicatedRelationships: number
  relationshipClusters: number
  significantRelationships: number
  genericRelationshipsSuppressed: number
  duplicateRelationshipsMerged: number
  weakRelationshipsSuppressed: number
  partialAgreementRejected: number
}

const RELATED_DIMENSIONS: Record<string, string[]> = {
  integration: ['integration', 'mechanism', 'outcome'],
  mechanism: ['integration', 'mechanism', 'outcome'],
  outcome: ['integration', 'mechanism', 'outcome'],
}

function dimensionsCompatible(a: string, b: string): boolean {
  if (a === b) return true
  if (a === 'general' || b === 'general') return true
  const familyA = RELATED_DIMENSIONS[a]
  if (familyA?.includes(b)) return true
  return false
}

function confidenceRank(c: ConfidenceLevel): number {
  if (c === 'strong') return 3
  if (c === 'moderate') return 2
  return 1
}

function strengthToConfidence(strength?: string): ConfidenceLevel {
  if (strength === 'strong') return 'strong'
  if (strength === 'moderate') return 'moderate'
  return 'weak'
}

function dominantConfidence(rels: ReasoningRelationship[]): ConfidenceLevel {
  const max = rels.reduce((best, r) => (confidenceRank(r.confidence) > confidenceRank(best) ? r.confidence : best), 'weak' as ConfidenceLevel)
  return max
}

function dominantType(rels: ReasoningRelationship[]): ReasoningRelationshipType {
  const counts = new Map<ReasoningRelationshipType, number>()
  for (const r of rels) {
    counts.set(r.type, (counts.get(r.type) ?? 0) + 1)
  }
  let best: ReasoningRelationshipType = rels[0]?.type ?? 'AGREEMENT'
  let bestN = 0
  for (const [t, n] of counts) {
    if (n > bestN) {
      best = t
      bestN = n
    }
  }
  return best
}

export function strictifyPartialAgreements(input: {
  verified: ReasoningRelationship[]
  rejected: ReasoningRelationship[]
  claims: ReasoningClaim[]
}): {
  verified: ReasoningRelationship[]
  rejected: ReasoningRelationship[]
  partialRejected: number
} {
  const claimById = new Map(input.claims.map((c) => [c.id, c]))
  const verified: ReasoningRelationship[] = []
  const rejected = [...input.rejected]
  let partialRejected = 0

  for (const rel of input.verified) {
    if (rel.type !== 'PARTIAL_AGREEMENT') {
      verified.push(rel)
      continue
    }
    const from = claimById.get(rel.fromClaimId)
    const to = claimById.get(rel.toClaimId)
    if (!from || !to) {
      rejected.push({
        ...rel,
        verificationStatus: 'REJECTED',
        rejectionReason: 'ALIGNMENT_FAILED',
        explanation: 'Missing claim for partial agreement validation.',
      })
      partialRejected++
      continue
    }
    const alignment = assessClaimAlignment(from, to)
    if (!alignment.comparable || !alignment.sameDimension || !alignment.sameSubject) {
      rejected.push({
        ...rel,
        verificationStatus: 'REJECTED',
        rejectionReason: 'DIFFERENT_DIMENSION',
        explanation: `Partial agreement rejected: ${alignment.reason}`,
      })
      partialRejected++
      continue
    }
    verified.push(rel)
  }

  return { verified, rejected, partialRejected }
}

function mergeGroups(
  rels: ReasoningRelationship[],
  claimById: Map<string, ReasoningClaim>,
  normalized: Map<string, ReturnType<typeof normalizeRelationshipProposition>>,
): number[][] {
  const parent = rels.map((_, i) => i)

  function find(x: number): number {
    let root = x
    while (parent[root] !== root) root = parent[root]
    let cur = x
    while (parent[cur] !== root) {
      const next = parent[cur]
      parent[cur] = root
      cur = next
    }
    return root
  }

  function unite(a: number, b: number) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[rb] = ra
  }

  for (let i = 0; i < rels.length; i++) {
    const claimsI = claimsForRelationship(rels[i], claimById)
    const dimI = inferDimension(rels[i], claimsI[0], claimsI[1])
    const stanceI = stanceFamily(rels[i])

    for (let j = i + 1; j < rels.length; j++) {
      const stanceJ = stanceFamily(rels[j])
      if (stanceI !== stanceJ) continue

      const claimsJ = claimsForRelationship(rels[j], claimById)
      const dimJ = inferDimension(rels[j], claimsJ[0], claimsJ[1])
      if (dimI !== dimJ && !dimensionsCompatible(dimI, dimJ)) continue

      const sharesClaim =
        rels[i].fromClaimId === rels[j].fromClaimId ||
        rels[i].fromClaimId === rels[j].toClaimId ||
        rels[i].toClaimId === rels[j].fromClaimId ||
        rels[i].toClaimId === rels[j].toClaimId

      const sim = propositionSimilarity(rels[i], rels[j], claimsI, claimsJ)
      const normI = normalized.get(rels[i].id)
      const normJ = normalized.get(rels[j].id)
      const normSim =
        normI && normJ ? normalizedPropositionSimilarity(normI, normJ) : 0

      if (stanceI === 'agree' && normI?.generic && normJ?.generic && normI.subject === normJ.subject) {
        unite(i, j)
        continue
      }

      if (stanceI === 'agree' && dimensionsCompatible(dimI, dimJ) && dimI !== 'general' && dimJ !== 'general') {
        unite(i, j)
        continue
      }

      if (normSim >= 0.45 || sim >= 0.32 || (sharesClaim && dimensionsCompatible(dimI, dimJ))) unite(i, j)
    }
  }

  const groups = new Map<number, number[]>()
  for (let i = 0; i < rels.length; i++) {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(i)
  }
  return [...groups.values()]
}

function computeSignificance(
  clusterRels: ReasoningRelationship[],
  claimById: Map<string, ReasoningClaim>,
  centralQuestion: string,
  canonicalClaim: string,
  sourceIds: string[],
  evidenceCount: number,
  sourcePairCount: number,
): {
  significanceScore: number
  noveltyScore: number
  evidenceStrength: number
  genericnessScore: number
} {
  const generic = assessGenericness(canonicalClaim)
  const memberClaimTexts = [...new Set(clusterRels.flatMap((r) => [r.fromClaimId, r.toClaimId]))]
    .map((id) => claimById.get(id)?.statement ?? '')
    .filter(Boolean)
  const allMemberClaimsGeneric =
    memberClaimTexts.length > 0 &&
    memberClaimTexts.every((t) => assessGenericness(t).generic)
  if (allMemberClaimsGeneric) {
    generic.score = Math.max(generic.score, 0.75)
    generic.generic = true
  }
  const sourceDiversity = Math.min(1, (sourceIds.length - 1) / 2) * 0.28
  const pairDiversity = Math.min(1, sourcePairCount / 3) * 0.12
  const evidenceStrength = Math.min(1, evidenceCount / 8) * 0.18

  const relevanceScores = [...new Set(clusterRels.flatMap((r) => [r.fromClaimId, r.toClaimId]))]
    .map((id) => claimById.get(id))
    .filter((c): c is ReasoningClaim => Boolean(c))
    .map((c) => c.relevanceScore ?? scoreClaimRelevance(c, centralQuestion))
  const relevance =
    relevanceScores.length > 0
      ? (relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length) * 0.18
      : 0

  const specificity = (1 - generic.score) * 0.2
  const hasContrast = clusterRels.some(
    (r) => r.type === 'TRADE_OFF' || r.type === 'TENSION' || r.type === 'CONTRADICTION',
  )
  const explanatory = (hasContrast || generic.hasMechanism ? 0.1 : 0) + (clusterRels.length > 1 ? 0.04 : 0)

  let significanceScore =
    sourceDiversity + pairDiversity + evidenceStrength + relevance + specificity + explanatory

  if (generic.generic) significanceScore -= 0.28
  if (generic.score > 0.5 && !generic.hasMechanism) significanceScore -= 0.15

  significanceScore = Math.max(0, Math.min(1, significanceScore))
  const noveltyScore = Math.min(1, sourceIds.length / 3) * 0.7 + (hasContrast ? 0.2 : 0.1)

  return {
    significanceScore,
    noveltyScore,
    evidenceStrength,
    genericnessScore: generic.score,
  }
}

export function compressVerifiedRelationships(input: {
  verified: ReasoningRelationship[]
  claims: ReasoningClaim[]
  evidence: ReasoningEvidence[]
  centralQuestion: string
}): {
  clusters: RelationshipCluster[]
  significantClusters: RelationshipCluster[]
  stats: CompressionStats
} {
  const claimById = new Map(input.claims.map((c) => [c.id, c]))
  const evidenceByClaim = new Map<string, number>()
  for (const c of input.claims) {
    evidenceByClaim.set(c.id, c.evidenceIds.length)
  }

  const normalizedMap = new Map<string, ReturnType<typeof normalizeRelationshipProposition>>()
  const normalizedTexts = new Set<string>()
  for (const rel of input.verified) {
    const claims = claimsForRelationship(rel, claimById)
    const norm = normalizeRelationshipProposition(rel, claims[0], claims[1])
    normalizedMap.set(rel.id, norm)
    normalizedTexts.add(norm.text)
  }

  const groups = mergeGroups(input.verified, claimById, normalizedMap)
  const duplicateRelationshipsMerged = input.verified.length - groups.length

  const clusters: RelationshipCluster[] = groups.map((indices, idx) => {
    const memberRels = indices.map((i) => input.verified[i])
    const memberIds = memberRels.map((r) => r.id)
    const supportingClaimIds = [...new Set(memberRels.flatMap((r) => [r.fromClaimId, r.toClaimId]))]
    const supportingSourceIds = [...new Set(memberRels.flatMap((r) => [r.fromSourceId, r.toSourceId]))]
    const sourcePairs = new Set(memberRels.map((r) => `${r.fromSourceId}::${r.toSourceId}`))
    const evidenceCount = supportingClaimIds.reduce(
      (sum, cid) => sum + (evidenceByClaim.get(cid) ?? 0),
      0,
    )
    const dimension = inferDimension(
      memberRels[0],
      claimById.get(memberRels[0].fromClaimId),
      claimById.get(memberRels[0].toClaimId),
    )
    const memberNorms = memberRels
      .map((r) => normalizedMap.get(r.id))
      .filter((n): n is NonNullable<typeof n> => Boolean(n))
    const canonicalFromNorm = pickCanonicalText(
      memberNorms.length > 0
        ? memberNorms.map((n) => n.text)
        : memberRels.map((r) => r.explanation),
    )
    const canonicalClaim = pickCanonicalText(
      memberRels.map((r) => {
        const claims = claimsForRelationship(r, claimById)
        const stmt = `${claims.map((c) => c.statement).join(' · ')}`
        const generic = assessGenericness(stmt)
        return generic.generic ? r.explanation : stmt
      }),
    )
    const memberClaimTexts = supportingClaimIds
      .map((id) => claimById.get(id)?.statement ?? '')
      .filter(Boolean)
    const allMemberClaimsGeneric =
      memberClaimTexts.length > 0 &&
      memberClaimTexts.every((t) => assessGenericness(t).generic)
    const finalCanonical = allMemberClaimsGeneric
      ? pickCanonicalText(memberClaimTexts)
      : assessGenericness(canonicalClaim).generic && !assessGenericness(canonicalFromNorm).generic
        ? canonicalFromNorm
        : canonicalClaim
    const scores = computeSignificance(
      memberRels,
      claimById,
      input.centralQuestion,
      finalCanonical,
      supportingSourceIds,
      evidenceCount,
      sourcePairs.size,
    )
    const visualKind = visualKindForRelationship(memberRels[0])
    const claimStrengths = supportingClaimIds
      .map((id) => claimById.get(id))
      .filter((c): c is ReasoningClaim => Boolean(c))
      .map((c) => strengthToConfidence(c.strength ?? c.confidence))
    const minClaimConfidence =
      claimStrengths.length > 0
        ? claimStrengths.reduce((min, c) => (confidenceRank(c) < confidenceRank(min) ? c : min), claimStrengths[0])
        : 'moderate'
    const relConfidence = dominantConfidence(memberRels)
    const cappedConfidence =
      confidenceRank(minClaimConfidence) < confidenceRank(relConfidence)
        ? minClaimConfidence
        : relConfidence

    return {
      id: `cluster_${idx + 1}`,
      canonicalClaim: finalCanonical,
      label: dynamicClusterLabel(finalCanonical, dimension),
      type: dominantType(memberRels),
      dimension,
      memberRelationshipIds: memberIds,
      supportingClaimIds,
      supportingSourceIds,
      sourceCount: supportingSourceIds.length,
      sourcePairCount: sourcePairs.size,
      evidenceCount,
      confidence: cappedConfidence,
      significanceScore: scores.significanceScore,
      noveltyScore: scores.noveltyScore,
      evidenceStrength: scores.evidenceStrength,
      genericnessScore: scores.genericnessScore,
      visualKind,
      parentIds: [],
      childIds: memberIds,
    }
  })

  let genericRelationshipsSuppressed = 0
  let weakRelationshipsSuppressed = 0

  const significantClusters = clusters
    .filter((c) => {
      const generic = assessGenericness(c.canonicalClaim)
      if (generic.generic) {
        genericRelationshipsSuppressed++
        return false
      }
      if (c.genericnessScore >= 0.65) {
        genericRelationshipsSuppressed++
        return false
      }
      if (c.significanceScore < 0.32) {
        weakRelationshipsSuppressed++
        return false
      }
      if (c.sourceCount < 2) {
        weakRelationshipsSuppressed++
        return false
      }
      return true
    })
    .sort((a, b) => b.significanceScore - a.significanceScore)

  return {
    clusters,
    significantClusters,
    stats: {
      verifiedInput: input.verified.length,
      normalizedPropositions: normalizedTexts.size,
      deduplicatedRelationships: clusters.length,
      relationshipClusters: clusters.length,
      significantRelationships: significantClusters.length,
      genericRelationshipsSuppressed,
      duplicateRelationshipsMerged,
      weakRelationshipsSuppressed,
      partialAgreementRejected: 0,
    },
  }
}

export function memberRelationshipsFromClusters(
  clusters: RelationshipCluster[],
  verified: ReasoningRelationship[],
): ReasoningRelationship[] {
  const relById = new Map(verified.map((r) => [r.id, r]))
  const ids = new Set(clusters.flatMap((c) => c.memberRelationshipIds))
  return verified.filter((r) => ids.has(r.id))
}

export function representativeRelationships(
  clusters: RelationshipCluster[],
  verified: ReasoningRelationship[],
): ReasoningRelationship[] {
  const relById = new Map(verified.map((r) => [r.id, r]))
  return clusters.map((c) => {
    const best = c.memberRelationshipIds
      .map((id) => relById.get(id))
      .filter((r): r is ReasoningRelationship => Boolean(r))
      .sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence))[0]
    if (!best) {
      return {
        id: c.id,
        type: c.type,
        fromClaimId: c.supportingClaimIds[0] ?? '',
        toClaimId: c.supportingClaimIds[1] ?? c.supportingClaimIds[0] ?? '',
        fromSourceId: c.supportingSourceIds[0] ?? '',
        toSourceId: c.supportingSourceIds[1] ?? c.supportingSourceIds[0] ?? '',
        fromVideoId: '',
        toVideoId: '',
        explanation: c.canonicalClaim,
        confidence: c.confidence,
        verificationStatus: 'SUPPORTED' as const,
        dimension: c.dimension,
      }
    }
    return {
      ...best,
      id: c.id,
      explanation: c.canonicalClaim,
      confidence: c.confidence,
    }
  })
}
