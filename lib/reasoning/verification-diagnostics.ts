import { pairKey } from '@/lib/reasoning/alignment'
import { discoverHeuristicCandidates } from '@/lib/reasoning/candidate-discovery'
import { isHypeClaim } from '@/lib/reasoning/claim-quality'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'
import { assessVerificationAlignment } from '@/lib/reasoning/verification-alignment'
import type {
  ReasoningClaim,
  ReasoningEvidence,
  ReasoningRelationship,
  ReasoningRelationshipType,
  RelationshipCandidate,
  RelationshipVerificationDiagnostic,
} from '@/lib/reasoning/types'

export type CandidateOrigin = 'direct' | 'semantic' | 'heuristic' | 'inference' | 'llm'

export type PredictedRelationshipClass =
  | 'agreement'
  | 'partial_agreement'
  | 'divide'
  | 'complementary'
  | 'unknown'

export type ClaimSpecificityClass =
  | 'SPECIFIC'
  | 'GENERAL'
  | 'HYPE'
  | 'META'
  | 'PROCEDURAL'
  | 'OBSERVATIONAL'

export type ClaimEvidenceStatus =
  | 'DIRECT_EVIDENCE'
  | 'PARAPHRASE_SUPPORTED'
  | 'CONTEXT_SUPPORTED'
  | 'NO_EVIDENCE'

export type CandidateAuditRecord = {
  candidateId: string
  sourceA: string
  sourceB: string
  voiceA: number
  voiceB: number
  claimA: string
  claimB: string
  claimAId: string
  claimBId: string
  claimAEvidenceStatus: ClaimEvidenceStatus
  claimBEvidenceStatus: ClaimEvidenceStatus
  claimAFidelity?: string
  claimBFidelity?: string
  origin: CandidateOrigin
  discoveryLevel: string
  proposedType: ReasoningRelationshipType
  predictedRelationship: PredictedRelationshipClass
  semanticSimilarity: number
  topicSimilarity: number
  subjectSimilarity: number
  predicateSimilarity: number
  polarityCompatibility: string
  candidateScore: number
  verificationResult: 'PASS' | 'REJECT'
  verificationRejectionReason?: string
  verificationStage?: string
  finalVerificationScore: number
  requiredThreshold: number
  verificationDetail?: string
}

export type TopCandidateDisplay = CandidateAuditRecord & { rank: number }

export type CrossSourcePairDiagnostics = {
  sourceA: string
  sourceB: string
  labelA: string
  labelB: string
  possiblePairs: number
  generatedCandidates: number
  verifiedRelationships: number
  topRejectionReason?: string
}

export type ClaimSpecificityDistribution = {
  sourceId: string
  voiceIndex: number
  specific: number
  general: number
  hype: number
  meta: number
  procedural: number
  observational: number
  total: number
}

export type ClaimEvidenceDistribution = {
  sourceId: string
  voiceIndex: number
  directEvidence: number
  paraphraseSupported: number
  contextSupported: number
  noEvidence: number
  total: number
  generationDirectOrParaphrase: number
  generationNoEvidence: number
}

export type VerificationDiagnosticsBundle = {
  candidateAudit: CandidateAuditRecord[]
  topCandidates: TopCandidateDisplay[]
  rejectionDistribution: Record<string, number>
  crossSourceMatrix: CrossSourcePairDiagnostics[]
  claimSpecificityBySource: ClaimSpecificityDistribution[]
  claimEvidenceBySource: ClaimEvidenceDistribution[]
  generationClaimEvidence: {
    withDirectOrParaphrase: number
    withoutEvidence: number
    total: number
  }
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeStatement(text)
      .split(/\W+/)
      .filter((w) => w.length >= 3),
  )
}

function overlapRatio(a: string, b: string): number {
  const ta = tokenSet(a)
  const tb = tokenSet(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / Math.min(ta.size, tb.size)
}

function classifyPredictedRelationship(type: ReasoningRelationshipType): PredictedRelationshipClass {
  if (type === 'AGREEMENT') return 'agreement'
  if (type === 'PARTIAL_AGREEMENT' || type === 'SAME_TOPIC_DIFFERENT_PERSPECTIVE') {
    return 'partial_agreement'
  }
  if (
    type === 'CONTRADICTION' ||
    type === 'TENSION' ||
    type === 'TRADE_OFF' ||
    type === 'CONSTRAINT'
  ) {
    return 'divide'
  }
  if (
    type === 'COMPLEMENTARY' ||
    type === 'MECHANISM_OUTCOME' ||
    type === 'PROBLEM_SOLUTION' ||
    type === 'CAUSE_EFFECT' ||
    type === 'DEPENDENCY' ||
    type === 'ENABLER' ||
    type === 'PREREQUISITE' ||
    type === 'EXAMPLE_OF' ||
    type === 'GENERALIZATION' ||
    type === 'SPECIALIZATION' ||
    type === 'TEMPORAL_PROGRESSION'
  ) {
    return 'complementary'
  }
  return 'unknown'
}

function classifyClaimSpecificity(claim: ReasoningClaim): ClaimSpecificityClass {
  const s = claim.statement
  if (isHypeClaim(s)) return 'HYPE'
  if (/\b(install|setup|configure|prerequisite|environment variable|click|subscribe)\b/i.test(s)) {
    return 'PROCEDURAL'
  }
  if (
    /\b(hot topic|major discussions|viewed as|rise of|has become|generated major|talking about)\b/i.test(
      s,
    )
  ) {
    return 'META'
  }
  if (/\b(observed|seeing|noticed|trend|growing interest|increasingly)\b/i.test(s)) {
    return 'OBSERVATIONAL'
  }
  if (
    /\b(provides|enables|reduces|standardizes|integrat|protocol|deploy|connect|api|server|tool)\b/i.test(
      s,
    ) &&
    !/\b(important|significant|transform|game[- ]?changer|ecosystem)\b/i.test(s)
  ) {
    return 'SPECIFIC'
  }
  if (
    /\b(important|significant|valuable|useful|impact|ecosystem|landscape|force)\b/i.test(s)
  ) {
    return 'GENERAL'
  }
  return 'SPECIFIC'
}

function classifyClaimEvidenceStatus(
  claim: ReasoningClaim,
  evidenceById: Map<string, ReasoningEvidence>,
): ClaimEvidenceStatus {
  if (claim.evidenceIds.length === 0) return 'NO_EVIDENCE'
  const texts = claim.evidenceIds
    .map((id) => evidenceById.get(id)?.text)
    .filter((t): t is string => Boolean(t))
  if (texts.length === 0) return 'NO_EVIDENCE'

  if (claim.evidenceStrength === 'STRONG') return 'DIRECT_EVIDENCE'
  if (claim.evidenceStrength === 'MODERATE') return 'PARAPHRASE_SUPPORTED'
  if (claim.evidenceStrength === 'WEAK') return 'CONTEXT_SUPPORTED'

  const overlap = texts.reduce((best, ev) => Math.max(best, overlapRatio(claim.statement, ev)), 0)
  if (overlap >= 0.35) return 'DIRECT_EVIDENCE'
  if (overlap >= 0.15) return 'PARAPHRASE_SUPPORTED'
  if (overlap >= 0.05) return 'CONTEXT_SUPPORTED'
  return 'NO_EVIDENCE'
}

function computeCandidateScore(
  from: ReasoningClaim,
  to: ReasoningClaim,
  candidate: RelationshipCandidate,
  alignment: ReturnType<typeof assessVerificationAlignment>,
): number {
  const confidenceBonus =
    candidate.confidence === 'strong' ? 0.12 : candidate.confidence === 'moderate' ? 0.06 : 0
  const discoveryBonus =
    candidate.discoveryLevel === 'DIRECT_MATCH'
      ? 0.08
      : candidate.discoveryLevel === 'SEMANTIC_RELATIONSHIP'
        ? 0.04
        : 0.02
  return (
    alignment.semanticSimilarity * 0.38 +
    alignment.topicAlignment * 0.2 +
    alignment.subjectEntityAlignment * 0.16 +
    alignment.predicateAlignment * 0.14 +
    confidenceBonus +
    discoveryBonus
  )
}

function resolveCandidateOrigin(
  candidate: RelationshipCandidate,
  heuristicKeys: {
    direct: Set<string>
    semantic: Set<string>
    inference: Set<string>
    bridge: Set<string>
  },
  llmOnlyKeys: Set<string>,
): CandidateOrigin {
  const key = pairKey(candidate.fromClaimId, candidate.toClaimId)
  if (heuristicKeys.direct.has(key)) return 'direct'
  if (heuristicKeys.bridge.has(key)) return 'heuristic'
  if (heuristicKeys.semantic.has(key)) return 'semantic'
  if (heuristicKeys.inference.has(key)) return 'inference'
  if (llmOnlyKeys.has(key)) return 'llm'
  if (candidate.discoveryLevel === 'DIRECT_MATCH') return 'direct'
  if (candidate.discoveryLevel === 'CROSS_SOURCE_INFERENCE') return 'inference'
  if (candidate.discoveryLevel === 'SEMANTIC_RELATIONSHIP' && candidate.bridgeConcept) {
    return 'heuristic'
  }
  if (candidate.discoveryLevel === 'SEMANTIC_RELATIONSHIP') return 'semantic'
  return 'heuristic'
}

function sourceLabel(sourceId: string, voiceIndex?: number): string {
  const n = voiceIndex ?? Number(sourceId.replace(/\D/g, '')) ?? 0
  return `V${n}`
}

export function buildVerificationDiagnosticsBundle(input: {
  candidates: RelationshipCandidate[]
  verified: ReasoningRelationship[]
  rejected: ReasoningRelationship[]
  verificationDiagnostics: RelationshipVerificationDiagnostic[]
  generationClaims: ReasoningClaim[]
  allClaims: ReasoningClaim[]
  evidence: ReasoningEvidence[]
  relevantSourceIds: string[]
}): VerificationDiagnosticsBundle {
  const claimById = new Map(input.allClaims.map((c) => [c.id, c]))
  const generationIds = new Set(input.generationClaims.map((c) => c.id))
  const evidenceById = new Map(input.evidence.map((e) => [e.id, e]))

  const heuristic = discoverHeuristicCandidates(input.generationClaims)
  const heuristicKeys = {
    direct: new Set(heuristic.direct.map((c) => pairKey(c.fromClaimId, c.toClaimId))),
    semantic: new Set(heuristic.semantic.map((c) => pairKey(c.fromClaimId, c.toClaimId))),
    inference: new Set(heuristic.inference.map((c) => pairKey(c.fromClaimId, c.toClaimId))),
    bridge: new Set(heuristic.bridge.map((c) => pairKey(c.fromClaimId, c.toClaimId))),
  }
  const allHeuristicKeys = new Set([
    ...heuristicKeys.direct,
    ...heuristicKeys.semantic,
    ...heuristicKeys.inference,
    ...heuristicKeys.bridge,
  ])
  const llmOnlyKeys = new Set(
    input.candidates
      .map((c) => pairKey(c.fromClaimId, c.toClaimId))
      .filter((k) => !allHeuristicKeys.has(k)),
  )

  const verifiedKeys = new Set(
    input.verified.map((r) => pairKey(r.fromClaimId, r.toClaimId)),
  )

  const diagnosticsByPair = new Map<string, RelationshipVerificationDiagnostic[]>()
  for (const d of input.verificationDiagnostics) {
    const key = pairKey(d.fromClaimId, d.toClaimId)
    const list = diagnosticsByPair.get(key) ?? []
    list.push(d)
    diagnosticsByPair.set(key, list)
  }

  const rejectionDistribution: Record<string, number> = {}

  const candidateAudit: CandidateAuditRecord[] = input.candidates.map((candidate, idx) => {
    const from = claimById.get(candidate.fromClaimId)
    const to = claimById.get(candidate.toClaimId)
    const key = pairKey(candidate.fromClaimId, candidate.toClaimId)
    const pairDiagnostics = diagnosticsByPair.get(key) ?? []

    const preLlm = pairDiagnostics.find((d) => d.stage === 'PRE_LLM')
    const postLlm = pairDiagnostics.find((d) => d.stage === 'POST_LLM')
    const finalDiag = postLlm ?? preLlm ?? pairDiagnostics[pairDiagnostics.length - 1]

    const isVerified = verifiedKeys.has(key)
    let verificationResult: 'PASS' | 'REJECT' = isVerified ? 'PASS' : 'REJECT'
    let rejectionReason: string | undefined

    if (!isVerified) {
      const rejectedRel = input.rejected.find(
        (r) => pairKey(r.fromClaimId, r.toClaimId) === key,
      )
      rejectionReason =
        finalDiag?.rejectionReason ??
        (rejectedRel?.rejectionReason as string | undefined) ??
        'UNKNOWN'
      rejectionDistribution[rejectionReason] = (rejectionDistribution[rejectionReason] ?? 0) + 1
    }

    const alignment =
      from && to
        ? assessVerificationAlignment(from, to, candidate.type)
        : {
            semanticSimilarity: 0,
            topicAlignment: 0,
            subjectEntityAlignment: 0,
            predicateAlignment: 0,
            polarity: 'UNKNOWN' as const,
            scopeCompatibility: 0,
            evidenceCompatibility: 0,
            finalAlignment: 0,
            requiredThreshold: 1,
            failedConditions: ['missing_claim'],
            passed: false,
            reason: 'Missing claim for candidate pair.',
          }

    const candidateScore =
      from && to ? computeCandidateScore(from, to, candidate, alignment) : 0

    return {
      candidateId: `cand_${idx + 1}`,
      sourceA: from?.sourceId ?? '?',
      sourceB: to?.sourceId ?? '?',
      voiceA: from?.voiceIndex ?? 0,
      voiceB: to?.voiceIndex ?? 0,
      claimA: from?.statement ?? '(missing)',
      claimB: to?.statement ?? '(missing)',
      claimAId: candidate.fromClaimId,
      claimBId: candidate.toClaimId,
      claimAEvidenceStatus: from
        ? classifyClaimEvidenceStatus(from, evidenceById)
        : 'NO_EVIDENCE',
      claimBEvidenceStatus: to
        ? classifyClaimEvidenceStatus(to, evidenceById)
        : 'NO_EVIDENCE',
      claimAFidelity: from?.fidelityStatus,
      claimBFidelity: to?.fidelityStatus,
      origin: resolveCandidateOrigin(candidate, heuristicKeys, llmOnlyKeys),
      discoveryLevel: candidate.discoveryLevel,
      proposedType: candidate.type,
      predictedRelationship: classifyPredictedRelationship(candidate.type),
      semanticSimilarity: alignment.semanticSimilarity,
      topicSimilarity: alignment.topicAlignment,
      subjectSimilarity: alignment.subjectEntityAlignment,
      predicateSimilarity: alignment.predicateAlignment,
      polarityCompatibility: alignment.polarity,
      candidateScore,
      verificationResult,
      verificationRejectionReason: rejectionReason,
      verificationStage: finalDiag?.stage,
      finalVerificationScore: finalDiag?.scores.finalAlignment ?? alignment.finalAlignment,
      requiredThreshold: finalDiag?.scores.requiredThreshold ?? alignment.requiredThreshold,
      verificationDetail: finalDiag?.scores.reason ?? alignment.reason,
    }
  })

  const topCandidates: TopCandidateDisplay[] = [...candidateAudit]
    .sort((a, b) => b.candidateScore - a.candidateScore)
    .slice(0, 20)
    .map((row, i) => ({ ...row, rank: i + 1 }))

  const sourceIds = [...input.relevantSourceIds].sort()
  const claimsBySource = new Map<string, ReasoningClaim[]>()
  for (const c of input.allClaims) {
    const list = claimsBySource.get(c.sourceId) ?? []
    list.push(c)
    claimsBySource.set(c.sourceId, list)
  }

  const claimSpecificityBySource: ClaimSpecificityDistribution[] = sourceIds.map((sourceId) => {
    const claims = claimsBySource.get(sourceId) ?? []
    const dist: ClaimSpecificityDistribution = {
      sourceId,
      voiceIndex: claims[0]?.voiceIndex ?? 0,
      specific: 0,
      general: 0,
      hype: 0,
      meta: 0,
      procedural: 0,
      observational: 0,
      total: claims.length,
    }
    for (const c of claims) {
      const cls = classifyClaimSpecificity(c)
      if (cls === 'SPECIFIC') dist.specific++
      else if (cls === 'GENERAL') dist.general++
      else if (cls === 'HYPE') dist.hype++
      else if (cls === 'META') dist.meta++
      else if (cls === 'PROCEDURAL') dist.procedural++
      else dist.observational++
    }
    return dist
  })

  const claimEvidenceBySource: ClaimEvidenceDistribution[] = sourceIds.map((sourceId) => {
    const claims = claimsBySource.get(sourceId) ?? []
    const genClaims = claims.filter((c) => generationIds.has(c.id))
    const dist: ClaimEvidenceDistribution = {
      sourceId,
      voiceIndex: claims[0]?.voiceIndex ?? 0,
      directEvidence: 0,
      paraphraseSupported: 0,
      contextSupported: 0,
      noEvidence: 0,
      total: claims.length,
      generationDirectOrParaphrase: 0,
      generationNoEvidence: 0,
    }
    for (const c of claims) {
      const status = classifyClaimEvidenceStatus(c, evidenceById)
      if (status === 'DIRECT_EVIDENCE') dist.directEvidence++
      else if (status === 'PARAPHRASE_SUPPORTED') dist.paraphraseSupported++
      else if (status === 'CONTEXT_SUPPORTED') dist.contextSupported++
      else dist.noEvidence++
    }
    for (const c of genClaims) {
      const status = classifyClaimEvidenceStatus(c, evidenceById)
      if (status === 'DIRECT_EVIDENCE' || status === 'PARAPHRASE_SUPPORTED') {
        dist.generationDirectOrParaphrase++
      } else if (status === 'NO_EVIDENCE') {
        dist.generationNoEvidence++
      }
    }
    return dist
  })

  const generationClaimEvidence = {
    total: input.generationClaims.length,
    withDirectOrParaphrase: input.generationClaims.filter((c) => {
      const s = classifyClaimEvidenceStatus(c, evidenceById)
      return s === 'DIRECT_EVIDENCE' || s === 'PARAPHRASE_SUPPORTED'
    }).length,
    withoutEvidence: input.generationClaims.filter(
      (c) => classifyClaimEvidenceStatus(c, evidenceById) === 'NO_EVIDENCE',
    ).length,
  }

  const crossSourceMatrix: CrossSourcePairDiagnostics[] = []
  for (let i = 0; i < sourceIds.length; i++) {
    for (let j = i + 1; j < sourceIds.length; j++) {
      const a = sourceIds[i]
      const b = sourceIds[j]
      const genA = input.generationClaims.filter((c) => c.sourceId === a)
      const genB = input.generationClaims.filter((c) => c.sourceId === b)
      let possible = 0
      for (const ca of genA) {
        for (const cb of genB) {
          possible++
        }
      }
      const pairCandidates = candidateAudit.filter(
        (c) =>
          (c.sourceA === a && c.sourceB === b) || (c.sourceA === b && c.sourceB === a),
      )
      const verifiedCount = input.verified.filter(
        (r) =>
          (r.fromSourceId === a && r.toSourceId === b) ||
          (r.fromSourceId === b && r.toSourceId === a),
      ).length

      const reasonCounts: Record<string, number> = {}
      for (const c of pairCandidates) {
        if (c.verificationResult === 'REJECT' && c.verificationRejectionReason) {
          reasonCounts[c.verificationRejectionReason] =
            (reasonCounts[c.verificationRejectionReason] ?? 0) + 1
        }
      }
      const topRejectionReason =
        Object.entries(reasonCounts).sort((x, y) => y[1] - x[1])[0]?.[0]

      crossSourceMatrix.push({
        sourceA: a,
        sourceB: b,
        labelA: sourceLabel(a, genA[0]?.voiceIndex),
        labelB: sourceLabel(b, genB[0]?.voiceIndex),
        possiblePairs: possible,
        generatedCandidates: pairCandidates.length,
        verifiedRelationships: verifiedCount,
        topRejectionReason,
      })
    }
  }

  return {
    candidateAudit,
    topCandidates,
    rejectionDistribution,
    crossSourceMatrix,
    claimSpecificityBySource,
    claimEvidenceBySource,
    generationClaimEvidence,
  }
}

export function evaluateCandidateVerificationCollapseWarning(input: {
  candidateCount: number
  verifiedCount: number
}): {
  code: 'CANDIDATE_VERIFICATION_COLLAPSE'
  message: string
  candidateCount: number
  verifiedCount: number
} | null {
  if (input.candidateCount >= 5 && input.verifiedCount === 0) {
    return {
      code: 'CANDIDATE_VERIFICATION_COLLAPSE',
      message: `${input.candidateCount} candidates generated but 0 relationships verified. Possible causes: candidate pairs are semantically related but propositionally different; claims are too generic; evidence fidelity is insufficient; verification is overly strict. Do not assume which cause applies without reviewing the candidate audit.`,
      candidateCount: input.candidateCount,
      verifiedCount: input.verifiedCount,
    }
  }
  return null
}
