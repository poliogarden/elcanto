import { getOpenAIClient } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import { buildOutputLanguageInstruction } from '@/lib/i18n/output-language-prompt'
import {
  isKeywordOnlyExplanation,
  pairKey,
} from '@/lib/reasoning/alignment'
import {
  discoverHeuristicCandidates,
  type DiscoveryStats,
} from '@/lib/reasoning/candidate-discovery'
import {
  buildCandidateFunnelSnapshot,
  type CandidateFunnel,
  type CandidateGenerationDiagnostic,
} from '@/lib/reasoning/candidate-funnel'
import { filterCandidatesByComparability } from '@/lib/reasoning/v2/candidate-quality-gate'
import {
  combineConfidence,
  computeConfidenceSignals,
  meetsEvidenceRequirement,
} from '@/lib/reasoning/confidence-model'
import {
  ClusteringSchema,
  CriticSchema,
  EmergentInsightsSchema,
  PatternDiscoverySchema,
  RelationshipCandidatesSchema,
  RelationshipVerificationSchema,
  SynthesisJudgmentSchema,
} from '@/lib/reasoning/schemas'
import type { JudgmentEvidenceProfile } from '@/lib/reasoning/judgment-evidence-profile'
import { formatJudgmentEvidenceProfileForPrompt } from '@/lib/reasoning/judgment-evidence-profile'
import type {
  DiscoveryLevel,
  ReasoningClaim,
  ReasoningCluster,
  ReasoningInsight,
  ReasoningJudgment,
  ReasoningKnowledgeGap,
  ReasoningLandscape,
  ReasoningPattern,
  ReasoningRelationship,
  ReasoningSynthesisBlock,
  RejectionReason,
  RelationshipCandidate,
  RelationshipCluster,
  RelationshipVerificationDiagnostic,
  SourceRelevance,
} from '@/lib/reasoning/types'
import {
  assessDimensionCompatibility,
  assessMinimumSharedProposition,
  assessRelationshipPropositionFidelity,
  classifyPropositionDimension,
} from '@/lib/reasoning/proposition-alignment'
import {
  assessComplementarySharedExplanation,
  COMPLEMENTARY_VERIFICATION_TYPES,
} from '@/lib/reasoning/complementary-alignment'
import {
  AGREEMENT_RELATIONSHIP_TYPES,
  passesVerificationPostGate,
  passesVerificationPreGate,
  type VerificationAlignmentScores,
} from '@/lib/reasoning/verification-alignment'
import {
  isNullEffectOpposition,
  isOpposingDirectionPair,
  isCoalRetirementOpposition,
} from '@/lib/reasoning/proposition-semantics'

function shouldTreatOpposingAlignmentAsDivide(
  from: ReasoningClaim,
  to: ReasoningClaim,
  scores: VerificationAlignmentScores,
): boolean {
  const dimA = classifyPropositionDimension(from.statement)
  const dimB = classifyPropositionDimension(to.statement)
  const dimensionCompatible =
    assessDimensionCompatibility(dimA, dimB, from.statement, to.statement) !== 'DIFFERENT'

  if (!dimensionCompatible) return false

  if (
    isNullEffectOpposition(from.statement, to.statement) ||
    isOpposingDirectionPair(from.statement, to.statement)
  ) {
    return true
  }

  if (scores.polarity !== 'OPPOSE') return false
  return true
}

function normalizeOpposingRelationshipType(
  from: ReasoningClaim,
  to: ReasoningClaim,
  type: ReasoningRelationship['type'],
  scores: VerificationAlignmentScores,
): ReasoningRelationship['type'] {
  if (type !== 'TRADE_OFF' && type !== 'TENSION') return type
  if (
    shouldTreatOpposingAlignmentAsDivide(from, to, scores) ||
    isCoalRetirementOpposition(from.statement, to.statement)
  ) {
    return 'CONTRADICTION'
  }
  return type
}

function rejectFalseAgreementCollapse(
  v: { fromClaimId: string; toClaimId: string; type: string; explanation: string; confidence: 'strong' | 'moderate' | 'weak'; discoveryLevel?: DiscoveryLevel; dimension?: string; reasoningBridge?: string },
  candidate: RelationshipCandidate | undefined,
  from: ReasoningClaim,
  to: ReasoningClaim,
  confidence: 'strong' | 'moderate' | 'weak',
  discoveryLevel: DiscoveryLevel,
  scores: VerificationAlignmentScores,
  verificationDiagnostics: RelationshipVerificationDiagnostic[],
  rejected: ReasoningRelationship[],
): void {
  verificationDiagnostics.push({
    fromClaimId: v.fromClaimId,
    toClaimId: v.toClaimId,
    fromSourceId: from.sourceId,
    toSourceId: to.sourceId,
    fromClaimText: from.statement.slice(0, 240),
    toClaimText: to.statement.slice(0, 240),
    proposedType: v.type,
    stage: 'POST_LLM',
    rejectionReason: 'ALIGNMENT_FAILED',
    rejectionDetail: 'Opposing polarity on the same proposition cannot be classified as agreement.',
    scores,
  })
  rejected.push(
    buildRejected(
      candidate ?? {
        fromClaimId: v.fromClaimId,
        toClaimId: v.toClaimId,
        type: v.type,
        rationale: v.explanation,
        confidence,
        discoveryLevel,
      },
      from,
      to,
      'ALIGNMENT_FAILED',
      'Opposing polarity on the same proposition cannot be classified as agreement.',
    ),
  )
}

function formatClaims(claims: ReasoningClaim[]): string {
  return claims
    .map(
      (c) =>
        `[${c.id}] source=${c.sourceId} video=${c.voiceIndex}\n  ${c.statement}\n  concepts=${c.conceptIds.join(',')}`,
    )
    .join('\n\n')
}

function formatRelationships(rels: ReasoningRelationship[]): string {
  return rels
    .map((r) => `[${r.id}] ${r.type}: ${r.fromClaimId} ↔ ${r.toClaimId}\n  ${r.explanation}`)
    .join('\n\n')
}

function withLang(instruction: string, outputLanguage?: 'ko' | 'en'): string {
  if (!outputLanguage) return instruction
  return `${instruction}\n\n${buildOutputLanguageInstruction(outputLanguage)}`
}

export async function clusterSources(input: {
  sources: SourceAnalysis[]
  userQuestion?: string
  outputLanguage?: 'ko' | 'en'
}): Promise<{
  centralQuestion: string
  clusters: ReasoningCluster[]
  sourceRelevance: SourceRelevance[]
  excluded: Array<{ sourceId: string; reason: string }>
}> {
  const openai = getOpenAIClient()
  const payload = input.sources.map((s) => ({
    sourceId: s.sourceId,
    title: s.title,
    thesis: s.thesis,
    centralQuestion: s.centralQuestion,
    topics: s.topics.slice(0, 8),
    summary: s.summary?.slice(0, 400),
  }))

  const parsed = await callStructured({
    openai,
    role: 'analysis',
    operation: 'REASONING_CLUSTER',
    system: withLang(
      `You cluster video sources by the ACTUAL question they address.

Rules:
- Do NOT force all videos into one cluster.
- off_topic sources go to excluded with a clear reason.
- primary cluster = sources that directly answer the user's central question.
- secondary = related domain but different sub-question.
- Be strict: mentioning AI does not make a video on-topic for an MCP-specific question.`,
      input.outputLanguage,
    ),
    user: `User question: ${input.userQuestion ?? '(infer from sources)'}\n\nSources:\n${JSON.stringify(payload, null, 2)}`,
    schema: ClusteringSchema,
    schemaName: 'reasoning_clustering',
    maxOutputTokens: 4000,
  })

  return {
    centralQuestion: parsed.centralQuestion,
    clusters: parsed.clusters,
    sourceRelevance: parsed.sourceRelevance,
    excluded: parsed.excluded,
  }
}

export async function generateRelationshipCandidates(input: {
  claims: ReasoningClaim[]
  outputLanguage?: 'ko' | 'en'
  heuristicOnly?: boolean
  claimsAfterRelevance?: number
  claimAlignments?: import('@/lib/reasoning/v2/claim-question-alignment').ClaimAlignmentRecord[]
}): Promise<{
  candidates: RelationshipCandidate[]
  stats: DiscoveryStats
  funnel: CandidateFunnel
  generationDiagnostics: CandidateGenerationDiagnostic[]
  candidateQualityStats?: import('@/lib/reasoning/v2/candidate-quality-gate').CandidateQualityStats
}> {
  const claimById = new Map(input.claims.map((c) => [c.id, c]))
  const generationDiagnostics: CandidateGenerationDiagnostic[] = []

  if (input.claims.length < 2) {
    const emptyFunnel = buildCandidateFunnelSnapshot({
      claimsAfterRelevance: input.claimsAfterRelevance ?? input.claims.length,
      claimsForGeneration: input.claims,
      heuristic: {
        direct: [],
        semantic: [],
        inference: [],
        bridge: [],
        all: [],
      },
      finalCandidates: [],
      sameSourceDropped: 0,
      llmCandidatesAdded: 0,
    })
    return {
      candidates: [],
      stats: {
        directCandidates: 0,
        semanticCandidates: 0,
        inferenceCandidates: 0,
        bridgeCandidates: 0,
        candidatePairs: 0,
      },
      funnel: emptyFunnel,
      generationDiagnostics: [],
    }
  }

  const heuristic = discoverHeuristicCandidates(input.claims)
  let llmCandidatesAdded = 0
  let sameSourceDropped = 0

  const crossSourceOnly = (list: RelationshipCandidate[]): RelationshipCandidate[] => {
    const out: RelationshipCandidate[] = []
    for (const c of list) {
      const from = claimById.get(c.fromClaimId)
      const to = claimById.get(c.toClaimId)
      if (!from || !to) continue
      if (from.sourceId === to.sourceId) {
        sameSourceDropped++
        generationDiagnostics.push({
          fromClaimId: c.fromClaimId,
          toClaimId: c.toClaimId,
          fromSourceId: from.sourceId,
          toSourceId: to.sourceId,
          reason: 'SAME_SOURCE_PAIR',
          stage: 'SOURCE_FILTER',
        })
        continue
      }
      out.push(c)
    }
    return out
  }

  let mergedList = crossSourceOnly(heuristic.all)

  if (!input.heuristicOnly && mergedList.length < 8) {
    const openai = getOpenAIClient()
    const parsed = await callStructured({
      openai,
      role: 'synthesis',
      operation: 'REASONING_RELATIONSHIPS',
      system: withLang(
        `Find cross-video claim relationships for reasoning — NOT keyword similarity.

LEVEL 1 DIRECT MATCH: same semantic proposition (AGREEMENT, CONTRADICTION, PARTIAL_AGREEMENT)
LEVEL 2 SEMANTIC: PROBLEM_SOLUTION, MECHANISM_OUTCOME, TRADE_OFF, COMPLEMENTARY, CAUSE_EFFECT, DEPENDENCY
LEVEL 3 INFERENCE: ENABLER, ADOPTION_BARRIER (only when cross-source bridge is explicit)

Types: AGREEMENT, CONTRADICTION, TENSION, COMPLEMENTARY, CAUSE_EFFECT, DEPENDENCY,
SAME_TOPIC_DIFFERENT_PERSPECTIVE, PARTIAL_AGREEMENT, PROBLEM_SOLUTION, MECHANISM_OUTCOME,
TRADE_OFF, PREREQUISITE, CONSTRAINT, ADOPTION_BARRIER, ENABLER, INDEPENDENT

Only propose pairs from DIFFERENT sources (different source= values) with a defensible logical connection.
Never pair claims from the same video/source.
Topic similarity alone is NOT a relationship.
Return candidates broadly (max 25) — verification will filter strictly.
Include discoveryLevel: DIRECT_MATCH | SEMANTIC_RELATIONSHIP | CROSS_SOURCE_INFERENCE.`,
        input.outputLanguage,
      ),
      user: `Claims:\n\n${formatClaims(input.claims)}\n\nHeuristic candidates already found:\n${heuristic.all
        .slice(0, 10)
        .map((c) => `${c.fromClaimId}↔${c.toClaimId} ${c.type} (${c.discoveryLevel})`)
        .join('\n')}`,
      schema: RelationshipCandidatesSchema,
      schemaName: 'reasoning_relationship_candidates',
      maxOutputTokens: 6000,
    })

    const llmCandidates: RelationshipCandidate[] = parsed.candidates.map((c) => ({
      fromClaimId: c.fromClaimId,
      toClaimId: c.toClaimId,
      type: c.type,
      rationale: c.rationale,
      confidence: c.confidence,
      discoveryLevel: c.discoveryLevel ?? 'SEMANTIC_RELATIONSHIP',
      dimension: c.dimension,
    }))

    const merged = new Map<string, RelationshipCandidate>()
    for (const c of mergedList) {
      merged.set(pairKey(c.fromClaimId, c.toClaimId), c)
    }
    for (const c of crossSourceOnly(llmCandidates)) {
      const key = pairKey(c.fromClaimId, c.toClaimId)
      if (!merged.has(key)) {
        merged.set(key, c)
        llmCandidatesAdded++
      }
    }
    mergedList = [...merged.values()]
  }

  const preFilterCount = mergedList.length
  const qualityFiltered = filterCandidatesByComparability({
    candidates: mergedList,
    claimById,
    alignments: input.claimAlignments,
  })
  mergedList = qualityFiltered.candidates

  const candidates = mergedList.slice(0, 35)
  const stats: DiscoveryStats = {
    directCandidates: candidates.filter((c) => c.discoveryLevel === 'DIRECT_MATCH').length,
    semanticCandidates: candidates.filter((c) => c.discoveryLevel === 'SEMANTIC_RELATIONSHIP').length,
    inferenceCandidates: candidates.filter((c) => c.discoveryLevel === 'CROSS_SOURCE_INFERENCE').length,
    bridgeCandidates: heuristic.bridge.length,
    candidatePairs: candidates.length,
  }

  const funnel = buildCandidateFunnelSnapshot({
    claimsAfterRelevance: input.claimsAfterRelevance ?? input.claims.length,
    claimsForGeneration: input.claims,
    heuristic,
    finalCandidates: candidates,
    sameSourceDropped,
    llmCandidatesAdded,
  })

  return {
    candidates,
    stats,
    funnel,
    generationDiagnostics,
    candidateQualityStats: {
      ...qualityFiltered.stats,
      inputCandidates: preFilterCount,
      outputCandidates: candidates.length,
    },
  }
}

export async function verifyRelationships(input: {
  claims: ReasoningClaim[]
  candidates: RelationshipCandidate[]
  outputLanguage?: 'ko' | 'en'
}): Promise<{
  verified: ReasoningRelationship[]
  rejected: ReasoningRelationship[]
  verificationDiagnostics: RelationshipVerificationDiagnostic[]
}> {
  const claimById = new Map(input.claims.map((c) => [c.id, c]))
  const verificationDiagnostics: RelationshipVerificationDiagnostic[] = []
  const alignedCandidates: RelationshipCandidate[] = []
  const rejectedEarly: ReasoningRelationship[] = []

  for (const c of input.candidates) {
    const from = claimById.get(c.fromClaimId)
    const to = claimById.get(c.toClaimId)
    if (!from || !to) {
      verificationDiagnostics.push({
        fromClaimId: c.fromClaimId,
        toClaimId: c.toClaimId,
        fromSourceId: from?.sourceId ?? '?',
        toSourceId: to?.sourceId ?? '?',
        fromClaimText: from?.statement ?? '(missing claim)',
        toClaimText: to?.statement ?? '(missing claim)',
        proposedType: c.type,
        stage: 'PRE_LLM',
        rejectionReason: 'LOGICAL_GAP',
        scores: {
          semanticSimilarity: 0,
          topicAlignment: 0,
          subjectEntityAlignment: 0,
          predicateAlignment: 0,
          polarity: 'UNKNOWN',
          scopeCompatibility: 0,
          evidenceCompatibility: 0,
          finalAlignment: 0,
          requiredThreshold: 1,
          failedConditions: ['missing_claim'],
          passed: false,
          reason: 'Claim lookup failed for candidate pair.',
        },
      })
      continue
    }

    if (from.sourceId === to.sourceId) {
      rejectedEarly.push(buildRejected(c, from, to, 'SAME_SOURCE_ONLY', 'Same source pair.'))
      const scores = passesVerificationPreGate(from, to, c.type)
      verificationDiagnostics.push({
        fromClaimId: c.fromClaimId,
        toClaimId: c.toClaimId,
        fromSourceId: from.sourceId,
        toSourceId: to.sourceId,
        fromClaimText: from.statement.slice(0, 240),
        toClaimText: to.statement.slice(0, 240),
        proposedType: c.type,
        stage: 'PRE_LLM',
        rejectionReason: 'SAME_SOURCE_ONLY',
        rejectionDetail: 'SAME_SOURCE_PAIR',
        scores,
      })
      continue
    }

    const scores = passesVerificationPreGate(from, to, c.type)
    verificationDiagnostics.push({
      fromClaimId: c.fromClaimId,
      toClaimId: c.toClaimId,
      fromSourceId: from.sourceId,
      toSourceId: to.sourceId,
      fromClaimText: from.statement.slice(0, 240),
      toClaimText: to.statement.slice(0, 240),
      proposedType: c.type,
      stage: 'PRE_LLM',
      rejectionReason: scores.passed ? undefined : 'ALIGNMENT_FAILED',
      rejectionDetail: scores.passed ? undefined : scores.reason,
      scores,
    })

    if (!scores.passed) {
      rejectedEarly.push(
        buildRejected(c, from, to, 'ALIGNMENT_FAILED', scores.reason),
      )
      continue
    }

    alignedCandidates.push(c)
  }

  if (alignedCandidates.length === 0) {
    return { verified: [], rejected: rejectedEarly, verificationDiagnostics }
  }

  const openai = getOpenAIClient()
  const candidateText = alignedCandidates
    .map(
      (c) =>
        `${c.fromClaimId} ↔ ${c.toClaimId} (${c.type}, ${c.discoveryLevel}): ${c.rationale}${c.dimension ? ` [dim:${c.dimension}]` : ''}`,
    )
    .join('\n')

  const parsed = await callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_VERIFY',
    system: withLang(
      `Verify proposed cross-video relationships. Discovery was broad; verification must be strict.

Reject if:
- Claims address different questions (false agreement/disagreement)
- Relationship is keyword/topic overlap only (reject with rejectionReason: TOPIC_ONLY)
- Type is wrong
- External facts assumed beyond claims (LOGICAL_GAP)
- Insufficient evidence (INSUFFICIENT_EVIDENCE)
- Cross-source inference unsupported (UNSUPPORTED_INFERENCE)

INDEPENDENT should be rejected.
For verified relationships, explain the EXACT logical connection in one sentence.
Include discoveryLevel and reasoningBridge when inference distance is high.`,
      input.outputLanguage,
    ),
    user: `Claims:\n${formatClaims(input.claims)}\n\nCandidates:\n${candidateText}`,
    schema: RelationshipVerificationSchema,
    schemaName: 'reasoning_relationship_verification',
    maxOutputTokens: 8000,
  })

  const verified: ReasoningRelationship[] = []
  const rejected: ReasoningRelationship[] = [...rejectedEarly]

  for (const [i, v] of parsed.verified.entries()) {
    const from = claimById.get(v.fromClaimId)
    const to = claimById.get(v.toClaimId)
    if (!from || !to) continue
    if (from.sourceId === to.sourceId) continue
    if (v.type === 'INDEPENDENT') continue
    if (isKeywordOnlyExplanation(v.explanation)) {
      rejected.push(
        buildRejected(
          {
            fromClaimId: v.fromClaimId,
            toClaimId: v.toClaimId,
            type: v.type,
            rationale: v.explanation,
            confidence: v.confidence,
            discoveryLevel: v.discoveryLevel ?? 'SEMANTIC_RELATIONSHIP',
          },
          from,
          to,
          'KEYWORD_ONLY',
          v.explanation,
        ),
      )
      continue
    }

    const candidate = alignedCandidates.find(
      (c) =>
        c.fromClaimId === v.fromClaimId && c.toClaimId === v.toClaimId,
    )
    const discoveryLevel: DiscoveryLevel =
      v.discoveryLevel ?? candidate?.discoveryLevel ?? 'SEMANTIC_RELATIONSHIP'

    const signals = computeConfidenceSignals(
      candidate ?? {
        fromClaimId: v.fromClaimId,
        toClaimId: v.toClaimId,
        type: v.type,
        rationale: v.explanation,
        confidence: v.confidence,
        discoveryLevel,
      },
      from,
      to,
    )

    if (!meetsEvidenceRequirement(discoveryLevel, signals)) {
      rejected.push(
        buildRejected(
          candidate ?? {
            fromClaimId: v.fromClaimId,
            toClaimId: v.toClaimId,
            type: v.type,
            rationale: v.explanation,
            confidence: v.confidence,
            discoveryLevel,
          },
          from,
          to,
          'INSUFFICIENT_EVIDENCE',
          'Evidence requirement not met for inference distance.',
        ),
      )
      continue
    }

    const computedConfidence = combineConfidence(signals)
    const confidence: 'strong' | 'moderate' | 'weak' =
      v.confidence === 'strong' || computedConfidence === 'strong'
        ? 'strong'
        : v.confidence === 'moderate' || computedConfidence === 'moderate'
          ? 'moderate'
          : 'weak'

    if (confidence === 'weak') {
      rejected.push(
        buildRejected(
          candidate ?? {
            fromClaimId: v.fromClaimId,
            toClaimId: v.toClaimId,
            type: v.type,
            rationale: v.explanation,
            confidence,
            discoveryLevel,
          },
          from,
          to,
          'WEAK_CONFIDENCE',
          v.explanation,
        ),
      )
      continue
    }

    const strictAlignment = passesVerificationPostGate(from, to, v.type)
    let propositionGatePass = false
    let verifiedType: ReasoningRelationship['type'] = v.type

    if (
      AGREEMENT_RELATIONSHIP_TYPES.has(v.type) &&
      shouldTreatOpposingAlignmentAsDivide(from, to, strictAlignment)
    ) {
      const divideAlignment = passesVerificationPostGate(from, to, 'CONTRADICTION')
      if (divideAlignment.passed) {
        verifiedType = 'CONTRADICTION'
        propositionGatePass = true
      } else {
        rejectFalseAgreementCollapse(
          v,
          candidate,
          from,
          to,
          confidence,
          discoveryLevel,
          divideAlignment,
          verificationDiagnostics,
          rejected,
        )
        continue
      }
    } else if (AGREEMENT_RELATIONSHIP_TYPES.has(v.type)) {
      const propositionGate = assessMinimumSharedProposition(from, to, v.explanation)
      if (propositionGate.passed) {
        propositionGatePass = true
        if (v.type !== 'AGREEMENT') {
          verifiedType = 'AGREEMENT'
        }
      } else if (v.type === 'AGREEMENT') {
        const rejectionReason: RejectionReason =
          propositionGate.rejectionReason === 'RELATIONSHIP_PROPOSITION_HALLUCINATION'
            ? 'RELATIONSHIP_PROPOSITION_HALLUCINATION'
            : propositionGate.rejectionReason === 'DIFFERENT_DIMENSION'
              ? 'DIFFERENT_DIMENSION'
              : 'ALIGNMENT_FAILED'
        verificationDiagnostics.push({
          fromClaimId: v.fromClaimId,
          toClaimId: v.toClaimId,
          fromSourceId: from.sourceId,
          toSourceId: to.sourceId,
          fromClaimText: from.statement.slice(0, 240),
          toClaimText: to.statement.slice(0, 240),
          proposedType: v.type,
          stage: 'POST_LLM',
          rejectionReason,
          rejectionDetail: propositionGate.rejectionDetail,
          scores: strictAlignment,
        })
        rejected.push(
          buildRejected(
            candidate ?? {
              fromClaimId: v.fromClaimId,
              toClaimId: v.toClaimId,
              type: v.type,
              rationale: v.explanation,
              confidence,
              discoveryLevel,
            },
            from,
            to,
            rejectionReason,
            propositionGate.rejectionDetail ?? 'Minimum shared proposition test failed.',
          ),
        )
        continue
      } else {
        const fidelity = assessRelationshipPropositionFidelity(from, to, v.explanation)
        if (!fidelity.pass) {
          verificationDiagnostics.push({
            fromClaimId: v.fromClaimId,
            toClaimId: v.toClaimId,
            fromSourceId: from.sourceId,
            toSourceId: to.sourceId,
            fromClaimText: from.statement.slice(0, 240),
            toClaimText: to.statement.slice(0, 240),
            proposedType: v.type,
            stage: 'POST_LLM',
            rejectionReason: 'RELATIONSHIP_PROPOSITION_HALLUCINATION',
            rejectionDetail: fidelity.reason,
            scores: strictAlignment,
          })
          rejected.push(
            buildRejected(
              candidate ?? {
                fromClaimId: v.fromClaimId,
                toClaimId: v.toClaimId,
                type: v.type,
                rationale: v.explanation,
                confidence,
                discoveryLevel,
              },
              from,
              to,
              'RELATIONSHIP_PROPOSITION_HALLUCINATION',
              fidelity.reason ?? 'Relationship proposition hallucination.',
            ),
          )
          continue
        }
      }
    }

    if (
      !propositionGatePass &&
      !strictAlignment.passed &&
      (AGREEMENT_RELATIONSHIP_TYPES.has(v.type) || v.discoveryLevel === 'DIRECT_MATCH')
    ) {
      verificationDiagnostics.push({
        fromClaimId: v.fromClaimId,
        toClaimId: v.toClaimId,
        fromSourceId: from.sourceId,
        toSourceId: to.sourceId,
        fromClaimText: from.statement.slice(0, 240),
        toClaimText: to.statement.slice(0, 240),
        proposedType: v.type,
        stage: 'POST_LLM',
        rejectionReason: 'DIFFERENT_DIMENSION',
        scores: strictAlignment,
      })
      rejected.push(
        buildRejected(
          candidate ?? {
            fromClaimId: v.fromClaimId,
            toClaimId: v.toClaimId,
            type: v.type,
            rationale: v.explanation,
            confidence,
            discoveryLevel,
          },
          from,
          to,
          'DIFFERENT_DIMENSION',
          strictAlignment.reason,
        ),
      )
      continue
    }

    if (COMPLEMENTARY_VERIFICATION_TYPES.has(verifiedType)) {
      const complementaryGate = assessComplementarySharedExplanation(from, to, v.explanation)
      if (!complementaryGate.passed) {
        const rejectionReason: RejectionReason =
          complementaryGate.rejectionReason === 'DIFFERENT_DIMENSION'
            ? 'DIFFERENT_DIMENSION'
            : 'ALIGNMENT_FAILED'
        verificationDiagnostics.push({
          fromClaimId: v.fromClaimId,
          toClaimId: v.toClaimId,
          fromSourceId: from.sourceId,
          toSourceId: to.sourceId,
          fromClaimText: from.statement.slice(0, 240),
          toClaimText: to.statement.slice(0, 240),
          proposedType: v.type,
          stage: 'POST_LLM',
          rejectionReason,
          rejectionDetail: complementaryGate.rejectionDetail,
          scores: strictAlignment,
        })
        rejected.push(
          buildRejected(
            candidate ?? {
              fromClaimId: v.fromClaimId,
              toClaimId: v.toClaimId,
              type: v.type,
              rationale: v.explanation,
              confidence,
              discoveryLevel,
            },
            from,
            to,
            rejectionReason,
            complementaryGate.rejectionDetail ?? 'Complementary shared explanation test failed.',
          ),
        )
        continue
      }
    }

    verifiedType = normalizeOpposingRelationshipType(from, to, verifiedType, strictAlignment)

    verified.push({
      id: `rel_${i + 1}`,
      type: verifiedType,
      fromClaimId: v.fromClaimId,
      toClaimId: v.toClaimId,
      fromSourceId: from.sourceId,
      toSourceId: to.sourceId,
      fromVideoId: from.videoId,
      toVideoId: to.videoId,
      explanation: v.explanation,
      confidence,
      verificationStatus: 'SUPPORTED',
      discoveryLevel,
      dimension: v.dimension ?? candidate?.dimension,
      reasoningBridge: v.reasoningBridge,
    })
  }

  const seenVerified = new Set<string>()
  const dedupedVerified = verified.filter((r) => {
    const key = pairKey(r.fromClaimId, r.toClaimId)
    if (seenVerified.has(key)) {
      rejected.push({
        ...r,
        id: `rej_dup_${rejected.length + 1}`,
        verificationStatus: 'REJECTED',
        rejectionReason: 'DUPLICATE',
        explanation: 'Duplicate pair.',
        confidence: 'weak',
      })
      return false
    }
    seenVerified.add(key)
    return true
  })

  for (const r of parsed.rejected) {
    const from = claimById.get(r.fromClaimId)
    const to = claimById.get(r.toClaimId)
    if (!from || !to) continue
    rejected.push({
      id: `rej_${rejected.length + 1}`,
      type: r.proposedType,
      fromClaimId: r.fromClaimId,
      toClaimId: r.toClaimId,
      fromSourceId: from.sourceId,
      toSourceId: to.sourceId,
      fromVideoId: from.videoId,
      toVideoId: to.videoId,
      explanation: r.reason,
      confidence: 'weak',
      verificationStatus: 'REJECTED',
      rejectionReason: (r.rejectionReason as RejectionReason) ?? 'LOGICAL_GAP',
    })
  }

  if (dedupedVerified.length === 0 && alignedCandidates.length > 0) {
    const seen = new Set<string>()
    for (const candidate of alignedCandidates) {
      const from = claimById.get(candidate.fromClaimId)
      const to = claimById.get(candidate.toClaimId)
      if (!from || !to) continue
      const key = pairKey(candidate.fromClaimId, candidate.toClaimId)
      if (seen.has(key)) continue

      const postScores = passesVerificationPostGate(from, to, candidate.type)

      if (
        AGREEMENT_RELATIONSHIP_TYPES.has(candidate.type) &&
        shouldTreatOpposingAlignmentAsDivide(from, to, postScores)
      ) {
        const divideScores = passesVerificationPostGate(from, to, 'CONTRADICTION')
        if (!divideScores.passed) {
          verificationDiagnostics.push({
            fromClaimId: candidate.fromClaimId,
            toClaimId: candidate.toClaimId,
            fromSourceId: from.sourceId,
            toSourceId: to.sourceId,
            fromClaimText: from.statement.slice(0, 240),
            toClaimText: to.statement.slice(0, 240),
            proposedType: candidate.type,
            stage: 'POST_HEURISTIC',
            rejectionReason: 'ALIGNMENT_FAILED',
            rejectionDetail: 'Opposing polarity on the same proposition cannot be classified as agreement.',
            scores: divideScores,
          })
          continue
        }
        const signals = computeConfidenceSignals(candidate, from, to)
        const confidence = combineConfidence(signals)
        if (confidence === 'weak' || !meetsEvidenceRequirement(candidate.discoveryLevel, signals)) {
          continue
        }
        seen.add(key)
        dedupedVerified.push({
          id: `rel_heur_${dedupedVerified.length + 1}`,
          type: 'CONTRADICTION',
          fromClaimId: candidate.fromClaimId,
          toClaimId: candidate.toClaimId,
          fromSourceId: from.sourceId,
          toSourceId: to.sourceId,
          fromVideoId: from.videoId,
          toVideoId: to.videoId,
          explanation: candidate.rationale,
          confidence,
          verificationStatus: 'SUPPORTED',
          discoveryLevel: candidate.discoveryLevel,
          dimension: candidate.dimension,
        })
        if (dedupedVerified.length >= 5) break
        continue
      }

      if (!postScores.passed) {
        verificationDiagnostics.push({
          fromClaimId: candidate.fromClaimId,
          toClaimId: candidate.toClaimId,
          fromSourceId: from.sourceId,
          toSourceId: to.sourceId,
          fromClaimText: from.statement.slice(0, 240),
          toClaimText: to.statement.slice(0, 240),
          proposedType: candidate.type,
          stage: 'POST_HEURISTIC',
          rejectionReason: 'ALIGNMENT_FAILED',
          scores: postScores,
        })
        continue
      }

      if (AGREEMENT_RELATIONSHIP_TYPES.has(candidate.type)) {
        const propositionGate = assessMinimumSharedProposition(
          from,
          to,
          candidate.rationale,
        )
        if (!propositionGate.passed) {
          verificationDiagnostics.push({
            fromClaimId: candidate.fromClaimId,
            toClaimId: candidate.toClaimId,
            fromSourceId: from.sourceId,
            toSourceId: to.sourceId,
            fromClaimText: from.statement.slice(0, 240),
            toClaimText: to.statement.slice(0, 240),
            proposedType: candidate.type,
            stage: 'POST_HEURISTIC',
            rejectionReason:
              propositionGate.rejectionReason === 'RELATIONSHIP_PROPOSITION_HALLUCINATION'
                ? 'RELATIONSHIP_PROPOSITION_HALLUCINATION'
                : propositionGate.rejectionReason === 'DIFFERENT_DIMENSION'
                  ? 'DIFFERENT_DIMENSION'
                  : 'ALIGNMENT_FAILED',
            rejectionDetail: propositionGate.rejectionDetail,
            scores: postScores,
          })
          continue
        }
      }

      if (COMPLEMENTARY_VERIFICATION_TYPES.has(candidate.type)) {
        const complementaryGate = assessComplementarySharedExplanation(
          from,
          to,
          candidate.rationale,
        )
        if (!complementaryGate.passed) {
          verificationDiagnostics.push({
            fromClaimId: candidate.fromClaimId,
            toClaimId: candidate.toClaimId,
            fromSourceId: from.sourceId,
            toSourceId: to.sourceId,
            fromClaimText: from.statement.slice(0, 240),
            toClaimText: to.statement.slice(0, 240),
            proposedType: candidate.type,
            stage: 'POST_HEURISTIC',
            rejectionReason:
              complementaryGate.rejectionReason === 'DIFFERENT_DIMENSION'
                ? 'DIFFERENT_DIMENSION'
                : 'ALIGNMENT_FAILED',
            rejectionDetail: complementaryGate.rejectionDetail,
            scores: postScores,
          })
          continue
        }
      }

      const signals = computeConfidenceSignals(candidate, from, to)
      const confidence = combineConfidence(signals)
      if (confidence === 'weak' || !meetsEvidenceRequirement(candidate.discoveryLevel, signals)) {
        continue
      }

      seen.add(key)
      dedupedVerified.push({
        id: `rel_heur_${dedupedVerified.length + 1}`,
        type: candidate.type,
        fromClaimId: candidate.fromClaimId,
        toClaimId: candidate.toClaimId,
        fromSourceId: from.sourceId,
        toSourceId: to.sourceId,
        fromVideoId: from.videoId,
        toVideoId: to.videoId,
        explanation: candidate.rationale,
        confidence,
        verificationStatus: 'SUPPORTED',
        discoveryLevel: candidate.discoveryLevel,
        dimension: candidate.dimension,
      })
      if (dedupedVerified.length >= 5) break
    }
  }

  return { verified: dedupedVerified, rejected, verificationDiagnostics }
}

function buildRejected(
  candidate: RelationshipCandidate,
  from: ReasoningClaim,
  to: ReasoningClaim,
  reason: RejectionReason,
  explanation: string,
): ReasoningRelationship {
  return {
    id: `rej_${candidate.fromClaimId}_${candidate.toClaimId}`,
    type: candidate.type,
    fromClaimId: candidate.fromClaimId,
    toClaimId: candidate.toClaimId,
    fromSourceId: from.sourceId,
    toSourceId: to.sourceId,
    fromVideoId: from.videoId,
    toVideoId: to.videoId,
    explanation,
    confidence: 'weak',
    verificationStatus: 'REJECTED',
    rejectionReason: reason,
    discoveryLevel: candidate.discoveryLevel,
    dimension: candidate.dimension,
  }
}

export async function discoverPatterns(input: {
  claims: ReasoningClaim[]
  relationships: ReasoningRelationship[]
  centralQuestion: string
  outputLanguage?: 'ko' | 'en'
}): Promise<ReasoningPattern[]> {
  if (input.relationships.length < 1) return []

  const openai = getOpenAIClient()
  const parsed = await callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_PATTERNS',
    system: withLang(
      `Discover cross-source PATTERNS from verified relationships — not simple consensus restatement.

Pattern types: recurring_driver, shared_causal_mechanism, trade_off, polarization, dependency, adoption_barrier, missing_variable, temporal_shift, different_definition, different_evaluation_criterion

Rules:
- Max 3 patterns.
- Each must cite relationshipIds and claimIds that support it.
- If no defensible pattern exists, set noPatterns=true.
- Do NOT restate a single claim as a pattern.`,
      input.outputLanguage,
    ),
    user: `Central question: ${input.centralQuestion}

Claims:
${formatClaims(input.claims)}

Verified relationships:
${formatRelationships(input.relationships)}`,
    schema: PatternDiscoverySchema,
    schemaName: 'reasoning_patterns',
    maxOutputTokens: 5000,
  })

  if (parsed.noPatterns || parsed.patterns.length === 0) return []

  return parsed.patterns.map((p) => ({
    ...p,
    sourceIds: [
      ...new Set(
        p.claimIds
          .map((id) => input.claims.find((c) => c.id === id)?.sourceId)
          .filter((id): id is string => Boolean(id)),
      ),
    ],
    verificationStatus: 'SUPPORTED' as const,
  }))
}

export async function buildSynthesisAndJudgment(input: {
  centralQuestion: string
  claims: ReasoningClaim[]
  relationships: ReasoningRelationship[]
  patterns: ReasoningPattern[]
  excludedCount: number
  outputLanguage?: 'ko' | 'en'
  evidenceProfile?: JudgmentEvidenceProfile
  significantClusters?: RelationshipCluster[]
  knowledgeGaps?: ReasoningKnowledgeGap[]
}): Promise<{
  synthesis: ReasoningSynthesisBlock | null
  judgment: ReasoningJudgment | null
  landscape: ReasoningLandscape
  knowledgeGaps: ReasoningKnowledgeGap[]
}> {
  const emptyLandscape: ReasoningLandscape = {
    agree: { countLabel: '0', cards: [] },
    divide: { countLabel: '0', cards: [] },
    unclear: { countLabel: '0', cards: [] },
  }

  if (input.relationships.length === 0 && input.patterns.length === 0) {
    return {
      synthesis: null,
      judgment: {
        statement:
          input.excludedCount > 0
            ? 'These videos do not support a single coherent cross-source judgment — too many off-topic or independent sources.'
            : 'No meaningful cross-source relationships were found among these videos.',
        whatIsSupported: 'Individual source claims remain valid on their own terms.',
        whatIsUncertain: 'Whether these sources address the same question with comparable claims.',
        keyReason: 'Verified relationships and patterns are absent.',
        confidence: 'low',
        missingEvidence: ['Cross-source evidence linking claims on the same dimension.'],
        verificationStatus: 'SUPPORTED',
      },
      landscape: emptyLandscape,
      knowledgeGaps: [],
    }
  }

  const openai = getOpenAIClient()

  const evidenceBlock = input.evidenceProfile
    ? `\n\nJUDGMENT EVIDENCE PROFILE (binding — do not exceed):\n${formatJudgmentEvidenceProfileForPrompt(input.evidenceProfile)}`
    : ''

  const gapsBlock =
    input.knowledgeGaps && input.knowledgeGaps.length > 0
      ? `\n\nKNOWLEDGE GAPS:\n${input.knowledgeGaps
          .map((g) => `- ${g.question}: ${g.whyItMatters}`)
          .join('\n')}`
      : ''

  const contradicting = input.relationships.filter(
    (r) => r.type === 'CONTRADICTION' || r.type === 'TENSION' || r.type === 'TRADE_OFF',
  )

  const parsed = await callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_SYNTHESIS',
    system: withLang(
      `Synthesize verified relationships and patterns into meaning — NOT summary merge.

JUDGMENT must be an executive CONCLUSION calibrated to supplied evidence:
- BAD: "MCP's Rapid Rise Redefines AI Landscape"
- BAD: "MCP is fundamentally transforming AI" (when evidence is weak or partial-source)
- GOOD: "Two of the three analyzed sources converge on MCP's value for tool integration, but evidence is insufficient to establish broader impact."
- GOOD: "Sources characterize MCP as important for integration, without establishing market-scale effects."

Rules:
- You must NOT make a claim stronger than the supplied evidence profile and confidence ceiling.
- Do NOT generalize support from participating sources to all analyzed sources.
- Preserve attribution for interpretive, predictive, or promotional source claims ("sources describe…", "sources characterize…").
- If evidence is weak or partial, explicitly communicate uncertainty.
- Use verified propositions as the factual backbone; do not invent stronger claims.
- synthesis.statement = what relationships collectively MEAN (abstraction above individual claims)
- judgment must state what to believe, what is uncertain, and why
- knowledgeGaps must link to what would CHANGE the judgment
- landscape cards must name specific tensions/agreements from claims
- If insufficient evidence, set noSynthesis=true
- Empty sections are better than fabricated insight`,
      input.outputLanguage,
    ),
    user: `Central question: ${input.centralQuestion}
Excluded off-topic sources: ${input.excludedCount}
${evidenceBlock}
${gapsBlock}

VERIFIED PROPOSITIONS (from clusters):
${input.evidenceProfile?.verifiedPropositions.map((p) => p.text).join('\n') || '(see profile)'}

SUPPORTING SOURCES: ${input.evidenceProfile?.supportingSourceIds.join(', ') || '(unknown)'}
SOURCE COVERAGE: ${input.evidenceProfile?.sourceCoverage ?? 'unknown'}
EVIDENCE STRENGTH: ${input.evidenceProfile?.evidenceStrength ?? 'unknown'}
CONFIDENCE CEILING: ${input.evidenceProfile?.confidenceCeiling ?? 'WEAK'}

CONTRADICTING RELATIONSHIPS (${contradicting.length}):
${formatRelationships(contradicting)}

Patterns: ${JSON.stringify(input.patterns, null, 2)}

Relationships:
${formatRelationships(input.relationships)}

Claims:
${formatClaims(input.claims)}`,
    schema: SynthesisJudgmentSchema,
    schemaName: 'reasoning_synthesis_judgment',
    maxOutputTokens: 8000,
  })

  if (parsed.noSynthesis) {
    return {
      synthesis: null,
      judgment: {
        statement: 'Insufficient cross-source evidence for a defensible judgment.',
        whatIsSupported: 'Verified relationships exist but do not support a unified conclusion.',
        whatIsUncertain: parsed.judgment.whatIsUncertain,
        keyReason: parsed.judgment.keyReason,
        confidence: 'low',
        missingEvidence: parsed.judgment.missingEvidence,
        verificationStatus: 'WEAK',
      },
      landscape: parsed.landscape,
      knowledgeGaps: parsed.knowledgeGaps,
    }
  }

  return {
    synthesis: {
      statement: parsed.synthesis.statement,
      explanation: parsed.synthesis.explanation,
      patternIds: parsed.synthesis.patternIds,
      confidence: parsed.synthesis.confidence,
      verificationStatus: 'SUPPORTED',
    },
    judgment: {
      statement: parsed.judgment.statement,
      whatIsSupported: parsed.judgment.whatIsSupported,
      whatIsUncertain: parsed.judgment.whatIsUncertain,
      keyReason: parsed.judgment.keyReason,
      confidence: parsed.judgment.confidence,
      missingEvidence: parsed.judgment.missingEvidence,
      verificationStatus: 'SUPPORTED',
    },
    landscape: parsed.landscape,
    knowledgeGaps: parsed.knowledgeGaps,
  }
}

export async function generateEmergentInsights(input: {
  claims: ReasoningClaim[]
  relationships: ReasoningRelationship[]
  patterns: ReasoningPattern[]
  judgment: ReasoningJudgment | null
  outputLanguage?: 'ko' | 'en'
}): Promise<ReasoningInsight[]> {
  if (input.patterns.length < 1 && input.relationships.length < 1) return []

  const openai = getOpenAIClient()
  const parsed = await callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_EMERGENT',
    system: withLang(
      `Generate emergent insights ONLY when defensible from cross-source inference.

An insight is emergent ONLY if:
- NOT restatable from a single source alone
- Requires 2+ independent source videos
- Has explicit reasoningBridge: A establishes X, B establishes Y, therefore Z
- Adds new explanatory value beyond listing claims
- Has explicit evidencePath: claim → relationship → pattern → inference

Generate candidates broadly (max 3); verification filters strictly.
If none qualify, set noInsights=true.`,
      input.outputLanguage,
    ),
    user: `Judgment: ${input.judgment?.statement ?? '(none)'}

Patterns: ${JSON.stringify(input.patterns, null, 2)}
Relationships: ${formatRelationships(input.relationships)}
Claims: ${formatClaims(input.claims)}`,
    schema: EmergentInsightsSchema,
    schemaName: 'reasoning_emergent',
    maxOutputTokens: 4000,
  })

  if (parsed.noInsights || parsed.insights.length === 0) return []

  const claimById = new Map(input.claims.map((c) => [c.id, c]))
  const relById = new Map(input.relationships.map((r) => [r.id, r]))
  const patternById = new Map(input.patterns.map((p) => [p.id, p]))

  return parsed.insights
    .filter((insight) => {
      if (insight.evidencePath.length < 3) return false
      const videoIds = new Set<string>()
      for (const step of insight.evidencePath) {
        if (step.step === 'claim') {
          const c = claimById.get(step.refId)
          if (!c) return false
          videoIds.add(c.videoId)
        } else if (step.step === 'relationship') {
          const r = relById.get(step.refId)
          if (!r) return false
          videoIds.add(r.fromVideoId)
          videoIds.add(r.toVideoId)
        } else if (step.step === 'pattern') {
          if (!patternById.has(step.refId)) return false
        }
      }
      return videoIds.size >= 2
    })
    .map((insight) => ({
      ...insight,
      sourceIds: [
        ...new Set(
          insight.evidencePath
            .filter((s) => s.step === 'claim')
            .map((s) => claimById.get(s.refId)?.sourceId)
            .filter((id): id is string => Boolean(id)),
        ),
      ],
      claimIds: insight.evidencePath.filter((s) => s.step === 'claim').map((s) => s.refId),
      relationshipIds: insight.evidencePath
        .filter((s) => s.step === 'relationship')
        .map((s) => s.refId),
      patternIds: insight.evidencePath.filter((s) => s.step === 'pattern').map((s) => s.refId),
      verificationStatus: 'SUPPORTED' as const,
      reasoningBridge: insight.reasoningBridge,
      inferenceType: insight.inferenceType,
    }))
}

export async function runCriticPass(input: {
  claims: ReasoningClaim[]
  relationships: ReasoningRelationship[]
  synthesis: ReasoningSynthesisBlock | null
  judgment: ReasoningJudgment | null
  insights: ReasoningInsight[]
  outputLanguage?: 'ko' | 'en'
}): Promise<{
  synthesis: ReasoningSynthesisBlock | null
  judgment: ReasoningJudgment | null
  insights: ReasoningInsight[]
  notes: string[]
}> {
  const openai = getOpenAIClient()
  const parsed = await callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_CRITIC',
    system: withLang(
      `You are a skeptical critic verifying synthesis outputs.

For each artifact ask:
- Is it supported by source evidence?
- Is it a restatement of one source?
- Is there an unsupported causal leap?
- Is it generic?

Verdict: SUPPORTED, WEAK, or REJECTED.
REJECTED items must not reach the user as main results.`,
      input.outputLanguage,
    ),
    user: JSON.stringify(
      {
        synthesis: input.synthesis,
        judgment: input.judgment,
        insights: input.insights,
        relationshipCount: input.relationships.length,
        claimCount: input.claims.length,
      },
      null,
      2,
    ),
    schema: CriticSchema,
    schemaName: 'reasoning_critic',
    maxOutputTokens: 3000,
  })

  let synthesis = input.synthesis
  let judgment = input.judgment
  let insights = [...input.insights]

  if (synthesis && parsed.synthesisVerdict === 'REJECTED') synthesis = null
  if (synthesis && parsed.synthesisVerdict === 'WEAK') {
    synthesis = { ...synthesis, verificationStatus: 'WEAK' }
  }

  if (judgment && parsed.judgmentVerdict === 'REJECTED') judgment = null
  if (judgment && parsed.judgmentVerdict === 'WEAK') {
    judgment = { ...judgment, verificationStatus: 'WEAK', confidence: 'low' }
  }

  const rejectedInsightIds = new Set(
    parsed.insightVerdicts.filter((v) => v.verdict === 'REJECTED').map((v) => v.insightId),
  )
  insights = insights
    .filter((i) => !rejectedInsightIds.has(i.id))
    .map((i) => {
      const verdict = parsed.insightVerdicts.find((v) => v.insightId === i.id)
      if (verdict?.verdict === 'WEAK') return { ...i, verificationStatus: 'WEAK' as const }
      return i
    })

  return { synthesis, judgment, insights, notes: parsed.notes }
}
