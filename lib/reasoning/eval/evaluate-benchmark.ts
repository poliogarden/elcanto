import { auditComplementaryRelationships } from '@/lib/reasoning/complementary-alignment'
import { isDefensibleJudgmentProposition } from '@/lib/reasoning/judgment-lineage'
import { requiredGoldRelationships } from '@/lib/reasoning/eval/benchmark-gold'
import { auditMetricPopulation } from '@/lib/reasoning/eval/metric-population'
import { diagnosePipelineStageFailures } from '@/lib/reasoning/eval/pipeline-diagnosis'
import { auditRelationshipPrecision } from '@/lib/reasoning/proposition-alignment'
import {
  isCoalRetirementOpposition,
  isNullEffectOpposition,
  isOpposingDirectionPair,
} from '@/lib/reasoning/proposition-semantics'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'
import type {
  BenchmarkForbiddenRelationship,
  BenchmarkGoldExpectations,
  BenchmarkGoldRelationship,
  BenchmarkRelationshipType,
} from '@/lib/reasoning/eval/benchmark-gold'
import type { MultiSourceReasoning, ReasoningClaim, ReasoningRelationship } from '@/lib/reasoning/types'

export type BenchmarkMetrics = {
  totalClaims: number
  totalExtractedClaims: number
  evidenceSupportedClaims: number
  relevanceUsable: number
  generationEligible: number
  candidates: number
  verified: number
  agreement: number
  divide: number
  complementary: number
  falseAgreement: number
  falseDivide: number
  falseComplementary: number
  missedExpectedRelationships: number
  evidenceIntegrityPass: boolean
  aggregationInvariantFailures: string[]
  supportedPropositions: number
  unsupportedPropositions: number
  judgmentConfidence: string
  finalJudgment?: string
  judgmentLineageStatus: string
  reasoningQuality: string
  precision: number
  recall: number
  agreementPrecision: number
  dividePrecision: number
  complementaryPrecision: number
  falseRelationshipsInJudgment: number
  participatingSourceIds: string[]
  excludedSourceIds: Array<{ sourceId: string; reason?: string }>
}

export type BenchmarkEvalResult = {
  fixtureId: string
  label: string
  result: 'PASS' | 'FAIL'
  infrastructureResult: 'PASS' | 'FAIL'
  failureReasons: string[]
  blockers: string[]
  v2Backlog: string[]
  pipelineDiagnosis: string[]
  metrics: BenchmarkMetrics
  pipelineError?: string
}

export function normalizeBenchmarkRelationshipType(type: string): BenchmarkRelationshipType | 'OTHER' {
  const t = type.toUpperCase()
  if (t === 'AGREEMENT') return 'AGREEMENT'
  if (t === 'CONTRADICTION' || t === 'DIVIDE' || t === 'DISAGREEMENT') return 'DIVIDE'
  if (t === 'COMPLEMENTARY') return 'COMPLEMENTARY'
  return 'OTHER'
}

function normalizeType(type: string): BenchmarkRelationshipType | 'OTHER' {
  return normalizeBenchmarkRelationshipType(type)
}

function claimMatchesPattern(claim: ReasoningClaim | undefined, pattern: string): boolean {
  if (!claim) return false
  return normalizeStatement(claim.statement).includes(normalizeStatement(pattern))
}

export function relationshipMatchesGold(
  rel: ReasoningRelationship,
  gold: BenchmarkGoldRelationship,
  claims: ReasoningClaim[],
): boolean {
  const relType = normalizeType(rel.type)
  if (relType !== gold.type) return false

  const fromClaim = claims.find((c) => c.id === rel.fromClaimId)
  const toClaim = claims.find((c) => c.id === rel.toClaimId)
  if (!fromClaim || !toClaim) return false

  const relSources = [rel.fromSourceId, rel.toSourceId].sort()
  const goldSources = [...gold.sources].sort()
  if (relSources[0] !== goldSources[0] || relSources[1] !== goldSources[1]) return false

  const forward =
    claimMatchesPattern(fromClaim, gold.fromClaimPattern) &&
    claimMatchesPattern(toClaim, gold.toClaimPattern)
  const reverse =
    claimMatchesPattern(fromClaim, gold.toClaimPattern) &&
    claimMatchesPattern(toClaim, gold.fromClaimPattern)
  return forward || reverse
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeStatement(text)
      .split(/\W+/)
      .filter((w) => w.length > 3),
  )
}

function isValidDivideRelationship(
  rel: ReasoningRelationship,
  claims: ReasoningClaim[],
): boolean {
  const a = claims.find((c) => c.id === rel.fromClaimId)
  const b = claims.find((c) => c.id === rel.toClaimId)
  if (!a || !b) return false

  if (isNullEffectOpposition(a.statement, b.statement)) return true
  if (isOpposingDirectionPair(a.statement, b.statement)) return true
  if (isCoalRetirementOpposition(a.statement, b.statement)) return true

  const ta = tokenSet(a.statement)
  const tb = tokenSet(b.statement)
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  if (shared < 3) return false

  const productivityOpposition =
    /\b(productivity|output|performance)\b/i.test(`${a.statement} ${b.statement}`) &&
    /\b(increases?|raises?|boosts?|improves?)\b/i.test(a.statement) &&
    /\b(decreases?|lowers?|diminishes?)\b/i.test(b.statement) ||
    (/\b(decreases?|lowers?|diminishes?)\b/i.test(a.statement) &&
      /\b(increases?|raises?|boosts?|improves?)\b/i.test(b.statement))
  if (productivityOpposition) return true

  const negA = /\b(not|does not|do not|doesn't|cannot|no longer)\b/i.test(a.statement)
  const negB = /\b(not|does not|do not|doesn't|cannot|no longer)\b/i.test(b.statement)
  return negA !== negB
}

function isRelationshipAuditedValid(
  rel: ReasoningRelationship,
  claims: ReasoningClaim[],
): boolean {
  const type = normalizeType(rel.type)
  if (type === 'AGREEMENT') {
    const audit = auditRelationshipPrecision(
      [
        {
          id: rel.id,
          type: rel.type,
          fromClaimId: rel.fromClaimId,
          toClaimId: rel.toClaimId,
          explanation: rel.explanation,
        },
      ],
      claims,
    )
    return audit.auditedValid >= 1 && audit.falseAgreement === 0
  }
  if (type === 'COMPLEMENTARY') {
    const audit = auditComplementaryRelationships(
      [
        {
          id: rel.id,
          type: rel.type,
          fromClaimId: rel.fromClaimId,
          toClaimId: rel.toClaimId,
          explanation: rel.explanation,
        },
      ],
      claims,
    )
    return audit.valid >= 1 && audit.falseComplementary === 0
  }
  if (type === 'DIVIDE') {
    return isValidDivideRelationship(rel, claims)
  }
  return false
}

function relationshipMatchesForbidden(
  rel: ReasoningRelationship,
  forbidden: BenchmarkForbiddenRelationship,
  claims: ReasoningClaim[],
): boolean {
  const relType = normalizeType(rel.type)
  if (relType !== forbidden.type) return false
  if (forbidden.sources) {
    const relSources = [rel.fromSourceId, rel.toSourceId].sort()
    const expected = [...forbidden.sources].sort()
    if (relSources[0] !== expected[0] || relSources[1] !== expected[1]) return false
  }
  if (forbidden.fromClaimPattern || forbidden.toClaimPattern) {
    return relationshipMatchesGold(
      rel,
      {
        type: forbidden.type,
        sources: forbidden.sources ?? [rel.fromSourceId, rel.toSourceId],
        fromClaimPattern: forbidden.fromClaimPattern ?? '',
        toClaimPattern: forbidden.toClaimPattern ?? '',
        normalizedProposition: '',
        required: false,
      },
      claims,
    )
  }
  return true
}

function scopedCount(verified: ReasoningRelationship[]): number {
  return verified.filter((r) => normalizeType(r.type) !== 'OTHER').length
}

function typePrecision(
  verified: ReasoningRelationship[],
  claims: ReasoningClaim[],
  type: BenchmarkRelationshipType,
): number {
  const scoped = verified.filter((r) => normalizeType(r.type) === type)
  if (scoped.length === 0) return 1
  const valid = scoped.filter((r) => isRelationshipAuditedValid(r, claims)).length
  return valid / scoped.length
}

export function computeGoldPrecisionRecall(
  verified: ReasoningRelationship[],
  claims: ReasoningClaim[],
  gold: BenchmarkGoldExpectations,
): { precision: number; recall: number; missedGold: number } {
  const scoped = verified.filter((r) => normalizeType(r.type) !== 'OTHER')
  const goldRels = requiredGoldRelationships(gold)

  let matchedGold = 0
  for (const g of goldRels) {
    const found = scoped.some((rel) => relationshipMatchesGold(rel, g, claims))
    if (found) matchedGold++
  }

  let validShown = 0
  for (const rel of scoped) {
    const matchesGold = goldRels.some((g) => relationshipMatchesGold(rel, g, claims))
    if (matchesGold || isRelationshipAuditedValid(rel, claims)) {
      validShown++
    }
  }

  const precision = scoped.length > 0 ? validShown / scoped.length : goldRels.length === 0 ? 1 : 0
  const recall = goldRels.length > 0 ? matchedGold / goldRels.length : 1

  return {
    precision,
    recall,
    missedGold: goldRels.length - matchedGold,
  }
}

export function collectBenchmarkMetrics(
  reasoning: MultiSourceReasoning | null,
): BenchmarkMetrics {
  const empty: BenchmarkMetrics = {
    totalClaims: 0,
    totalExtractedClaims: 0,
    evidenceSupportedClaims: 0,
    relevanceUsable: 0,
    generationEligible: 0,
    candidates: 0,
    verified: 0,
    agreement: 0,
    divide: 0,
    complementary: 0,
    falseAgreement: 0,
    falseDivide: 0,
    falseComplementary: 0,
    missedExpectedRelationships: 0,
    evidenceIntegrityPass: false,
    aggregationInvariantFailures: [],
    supportedPropositions: 0,
    unsupportedPropositions: 0,
    judgmentConfidence: 'N/A',
    judgmentLineageStatus: 'N/A',
    reasoningQuality: 'NOT_EVALUATED',
    precision: 0,
    recall: 0,
    agreementPrecision: 1,
    dividePrecision: 1,
    complementaryPrecision: 1,
    falseRelationshipsInJudgment: 0,
    participatingSourceIds: [],
    excludedSourceIds: [],
  }
  if (!reasoning) return empty

  const d = reasoning.diagnostics
  const stats = d?.pipelineStats
  const evidenceCov = d?.evidenceCoverage
  const rels = reasoning.relationships ?? []
  const claims = reasoning.claims ?? []

  const agreement = rels.filter((r) => normalizeType(r.type) === 'AGREEMENT').length
  const divide = rels.filter((r) => normalizeType(r.type) === 'DIVIDE').length
  const complementary = rels.filter((r) => normalizeType(r.type) === 'COMPLEMENTARY').length

  const agreementAudit = auditRelationshipPrecision(
    rels.map((rel) => ({
      id: rel.id,
      type: rel.type,
      fromClaimId: rel.fromClaimId,
      toClaimId: rel.toClaimId,
      explanation: rel.explanation,
    })),
    claims,
  )
  const complementaryAudit = auditComplementaryRelationships(
    rels.map((rel) => ({
      id: rel.id,
      type: rel.type,
      fromClaimId: rel.fromClaimId,
      toClaimId: rel.toClaimId,
      explanation: rel.explanation,
    })),
    claims,
  )

  const divideRels = rels.filter((r) => normalizeType(r.type) === 'DIVIDE')
  const falseDivide = divideRels.filter((r) => !isValidDivideRelationship(r, claims)).length

  const population = auditMetricPopulation(reasoning)

  const propositions = d?.judgmentPropositionLineage ?? []
  const participation = d?.sourceParticipation
  const participationRows = participation?.rows ?? []

  const excludedSourceIds = participationRows
    .filter((r) => r.extracted > 0 && r.generationClaims === 0)
    .map((r) => ({
      sourceId: r.sourceId,
      reason: r.candidateZeroReason ?? 'NOT_IN_GENERATION',
    }))

  const participatingSourceIds = participationRows
    .filter((r) => r.generationClaims > 0)
    .map((r) => r.sourceId)

  return {
    totalClaims: population.totalExtractedClaims,
    totalExtractedClaims: population.totalExtractedClaims,
    evidenceSupportedClaims: population.evidenceSupportedClaims,
    relevanceUsable: population.relevanceUsable,
    generationEligible: population.generationEligible,
    candidates: population.candidates,
    verified: population.verified,
    agreement,
    divide,
    complementary,
    falseAgreement: agreementAudit.falseAgreement,
    falseDivide,
    falseComplementary: complementaryAudit.falseComplementary,
    missedExpectedRelationships: 0,
    evidenceIntegrityPass: !(d?.pipelineWarnings ?? []).some(
      (w) => w.code === 'EVIDENCE_INTEGRITY_VIOLATION',
    ),
    aggregationInvariantFailures: population.invariantViolations,
    supportedPropositions: propositions.filter((p) => p.supportStatus === 'SUPPORTED').length,
    unsupportedPropositions: propositions.filter((p) => p.supportStatus === 'UNSUPPORTED').length,
    judgmentConfidence: reasoning.judgment?.confidence ?? 'N/A',
    finalJudgment: reasoning.judgment?.statement,
    judgmentLineageStatus:
      propositions.length === 0
        ? 'NONE'
        : propositions.every((p) => p.supportStatus === 'SUPPORTED')
          ? 'PASS'
          : propositions.some((p) => p.supportStatus === 'UNSUPPORTED')
            ? 'UNSUPPORTED_PRESENT'
            : 'PARTIAL',
    reasoningQuality: 'N/A',
    precision: 0,
    recall: 0,
    agreementPrecision: typePrecision(rels, claims, 'AGREEMENT'),
    dividePrecision: typePrecision(rels, claims, 'DIVIDE'),
    complementaryPrecision: typePrecision(rels, claims, 'COMPLEMENTARY'),
    falseRelationshipsInJudgment: 0,
    participatingSourceIds,
    excludedSourceIds,
  }
}

export function evaluateBenchmarkFixture(input: {
  fixtureId: string
  gold: BenchmarkGoldExpectations
  reasoning: MultiSourceReasoning | null
  infrastructurePassed: boolean
  pipelineError?: string
  reasoningQualityResult?: string
}): BenchmarkEvalResult {
  const { gold, reasoning, infrastructurePassed, pipelineError, reasoningQualityResult } = input
  const failureReasons: string[] = []
  const blockers: string[] = []
  const v2Backlog: string[] = []
  const metrics = collectBenchmarkMetrics(reasoning)
  metrics.reasoningQuality = reasoningQualityResult ?? 'NOT_EVALUATED'
  const pipelineDiagnosis =
    reasoning ? diagnosePipelineStageFailures(reasoning, gold) : ['No reasoning output for diagnosis.']

  if (!infrastructurePassed) {
    const reason = pipelineError ?? 'Pipeline infrastructure failure'
    return {
      fixtureId: gold.fixtureId,
      label: gold.label,
      result: 'FAIL',
      infrastructureResult: 'FAIL',
      failureReasons: [reason],
      blockers: [reason],
      v2Backlog: [],
      pipelineDiagnosis,
      metrics,
      pipelineError,
    }
  }

  if (!reasoning) {
    return {
      fixtureId: gold.fixtureId,
      label: gold.label,
      result: 'FAIL',
      infrastructureResult: 'PASS',
      failureReasons: ['NO_REASONING_OUTPUT'],
      blockers: ['NO_REASONING_OUTPUT'],
      v2Backlog: [],
      pipelineDiagnosis,
      metrics,
      pipelineError,
    }
  }

  const verified = reasoning.relationships ?? []
  const claims = reasoning.claims ?? []
  const { precision, recall, missedGold } = computeGoldPrecisionRecall(verified, claims, gold)
  metrics.precision = Math.round(precision * 1000) / 1000
  metrics.recall = Math.round(recall * 1000) / 1000
  metrics.missedExpectedRelationships = missedGold

  for (const forbidden of gold.forbiddenRelationships ?? []) {
    const hit = verified.some((rel) => relationshipMatchesForbidden(rel, forbidden, claims))
    if (hit) {
      failureReasons.push(`FORBIDDEN_RELATIONSHIP: ${forbidden.reason}`)
      blockers.push(`FORBIDDEN_RELATIONSHIP: ${forbidden.reason}`)
    }
  }

  if (gold.requireEvidenceIntegrity && !metrics.evidenceIntegrityPass) {
    failureReasons.push('EVIDENCE_INTEGRITY_VIOLATION')
    blockers.push('EVIDENCE_INTEGRITY_VIOLATION')
  }
  if (metrics.falseAgreement > 0) {
    failureReasons.push(`falseAgreement=${metrics.falseAgreement}`)
    blockers.push(`falseAgreement=${metrics.falseAgreement}`)
  }
  if (metrics.falseDivide > 0) {
    failureReasons.push(`falseDivide=${metrics.falseDivide}`)
    blockers.push(`falseDivide=${metrics.falseDivide}`)
  }
  if (metrics.falseComplementary > 0) {
    failureReasons.push(`falseComplementary=${metrics.falseComplementary}`)
    blockers.push(`falseComplementary=${metrics.falseComplementary}`)
  }
  if (missedGold > 0 && gold.criticalRecall !== undefined && recall < gold.criticalRecall) {
    failureReasons.push(`MISSED_GOLD_RELATIONSHIP (missed=${missedGold}, recall=${metrics.recall})`)
    blockers.push('MISSED_GOLD_RELATIONSHIP')
  }
  if (gold.minAgreement !== undefined && metrics.agreement < gold.minAgreement) {
    const msg = `agreement=${metrics.agreement} (need >= ${gold.minAgreement})`
    failureReasons.push(msg)
    if (!blockers.includes('MISSED_GOLD_RELATIONSHIP')) blockers.push(msg)
  }
  if (gold.maxAgreement !== undefined && metrics.agreement > gold.maxAgreement) {
    const msg = `agreement=${metrics.agreement} (need <= ${gold.maxAgreement})`
    failureReasons.push(msg)
    blockers.push(msg)
  }
  if (gold.minDivide !== undefined && metrics.divide < gold.minDivide) {
    const msg = `divide=${metrics.divide} (need >= ${gold.minDivide})`
    failureReasons.push(msg)
    if (!blockers.includes('MISSED_GOLD_RELATIONSHIP')) blockers.push(msg)
  }
  if (gold.maxDivide !== undefined && metrics.divide > gold.maxDivide) {
    const msg = `divide=${metrics.divide} (need <= ${gold.maxDivide})`
    failureReasons.push(msg)
    blockers.push(msg)
  }
  if (gold.maxComplementary !== undefined && metrics.complementary > gold.maxComplementary) {
    const msg = `complementary=${metrics.complementary} (need <= ${gold.maxComplementary})`
    failureReasons.push(msg)
    blockers.push(msg)
  }
  if (gold.minPrecision !== undefined && precision < gold.minPrecision && scopedCount(verified) > 0) {
    const msg = `precision=${metrics.precision} (need >= ${gold.minPrecision})`
    failureReasons.push(msg)
    blockers.push(msg)
  }

  for (const invariant of metrics.aggregationInvariantFailures) {
    failureReasons.push(invariant)
    blockers.push(invariant)
  }

  const verifiedCount = scopedCount(verified)
  const missedGoldBlocker = blockers.includes('MISSED_GOLD_RELATIONSHIP')
  const propositions = reasoning.diagnostics?.judgmentPropositionLineage ?? []
  const judgment = reasoning.judgment
  const defensible =
    judgment != null &&
    propositions.length > 0 &&
    isDefensibleJudgmentProposition(propositions[0])

  if (gold.requireDefensibleJudgment) {
    if (verifiedCount === 0 && missedGoldBlocker) {
      v2Backlog.push('MISSING_FINAL_JUDGMENT (secondary: recall failure left verified=0)')
    } else if (verifiedCount >= 1 && !judgment) {
      failureReasons.push('MISSING_FINAL_JUDGMENT')
      blockers.push('MISSING_FINAL_JUDGMENT')
    } else if (verifiedCount >= 1 && judgment && !defensible) {
      failureReasons.push('UNSUPPORTED_FINAL_JUDGMENT')
      blockers.push('UNSUPPORTED_FINAL_JUDGMENT')
    }
  } else if (!gold.allowMissingJudgment && !judgment) {
    failureReasons.push('MISSING_FINAL_JUDGMENT')
    blockers.push('MISSING_FINAL_JUDGMENT')
  } else if (gold.allowMissingJudgment && !judgment) {
    v2Backlog.push('MISSING_FINAL_JUDGMENT (allowed for this fixture)')
  }

  if (metrics.unsupportedPropositions > 0 && gold.requireDefensibleJudgment && verifiedCount >= 1) {
    failureReasons.push(`unsupportedPropositions=${metrics.unsupportedPropositions}`)
    if (!blockers.includes('UNSUPPORTED_FINAL_JUDGMENT')) {
      blockers.push('UNSUPPORTED_FINAL_JUDGMENT')
    }
  }

  for (const expected of gold.expectedSourceParticipation ?? []) {
    const participating = metrics.participatingSourceIds.includes(expected.sourceId)
    if (expected.participateInGeneration && !participating) {
      const msg = `expectedParticipatingSource missing from generation: ${expected.sourceId}`
      failureReasons.push(msg)
      blockers.push(msg)
    }
    if (!expected.participateInGeneration && participating) {
      const msg = `expectedExcludedSource still participating: ${expected.sourceId}`
      failureReasons.push(msg)
      blockers.push(msg)
    }
  }

  if (pipelineDiagnosis.length > 0 && missedGoldBlocker) {
    for (const line of pipelineDiagnosis) {
      v2Backlog.push(line)
    }
  }

  return {
    fixtureId: gold.fixtureId,
    label: gold.label,
    result: blockers.length === 0 ? 'PASS' : 'FAIL',
    infrastructureResult: 'PASS',
    failureReasons,
    blockers,
    v2Backlog,
    pipelineDiagnosis,
    metrics,
    pipelineError,
  }
}

export function evaluateMcpRegressionGuard(reasoning: MultiSourceReasoning | null): {
  result: 'PASS' | 'FAIL'
  failureReasons: string[]
} {
  if (!reasoning) {
    return { result: 'FAIL', failureReasons: ['NO_REASONING_OUTPUT'] }
  }
  const metrics = collectBenchmarkMetrics(reasoning)
  const failureReasons: string[] = []
  if (!metrics.evidenceIntegrityPass) failureReasons.push('EVIDENCE_INTEGRITY_VIOLATION')
  if (metrics.falseAgreement > 0) failureReasons.push(`falseAgreement=${metrics.falseAgreement}`)
  if (metrics.falseComplementary > 0) {
    failureReasons.push(`falseComplementary=${metrics.falseComplementary}`)
  }
  const verifiedCount = metrics.verified
  const propositions = reasoning.diagnostics?.judgmentPropositionLineage ?? []
  const judgment = reasoning.judgment
  const defensible =
    judgment != null &&
    propositions.length > 0 &&
    isDefensibleJudgmentProposition(propositions[0])
  if (verifiedCount >= 1 && !defensible) {
    failureReasons.push('UNSUPPORTED_OR_MISSING_FINAL_JUDGMENT')
  }
  if (verifiedCount >= 1 && metrics.unsupportedPropositions > 0) {
    failureReasons.push(`unsupportedPropositions=${metrics.unsupportedPropositions}`)
  }
  return { result: failureReasons.length === 0 ? 'PASS' : 'FAIL', failureReasons }
}
