import { auditComplementaryRelationships } from '@/lib/reasoning/complementary-alignment'
import { isDefensibleJudgmentProposition } from '@/lib/reasoning/judgment-lineage'
import { auditRelationshipPrecision } from '@/lib/reasoning/proposition-alignment'
import type { E2eEvalResult } from '@/lib/reasoning/eval/types'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'

export type E2eQualityCriteria = {
  relevantSources: number
  candidatePairs: number
  verifiedRelationships: number
  relationshipClusters: number
  agreementDivideComplementary: number
  verificationCollapse: boolean
  unsupportedJudgmentPropositions: number
  unsupportedFinalJudgment: boolean
  missingFinalJudgment: boolean
  falseAuditedAgreement: number
  falseAuditedComplementary: number
  evidenceIntegrityViolation: boolean
}

export function collectE2eQualityCriteria(
  reasoning: MultiSourceReasoning | null,
): E2eQualityCriteria {
  const d = reasoning?.diagnostics
  const stats = d?.pipelineStats
  const warnings = d?.pipelineWarnings ?? []
  const participation = d?.sourceParticipation
  const relTypes = reasoning?.relationships ?? []
  const judgment = reasoning?.judgment
  const propositions = d?.judgmentPropositionLineage ?? []
  const unsupportedProps = propositions.filter((p) => p.supportStatus === 'UNSUPPORTED')

  const agreementDivideComplementary = relTypes.filter((r) => {
    const t = r.type.toLowerCase()
    return t === 'agreement' || t === 'divide' || t === 'complementary'
  }).length

  const verificationCollapse = warnings.some(
    (w) => w.code === 'CANDIDATE_VERIFICATION_COLLAPSE',
  )

  const relevantSources =
    participation?.relevantSourceCount ??
    stats?.relevantSources ??
    d?.sourceCountSummary?.relevantSourceCount ??
    0

  const agreementAudit = auditRelationshipPrecision(
    relTypes.map((rel) => ({
      id: rel.id,
      type: rel.type,
      fromClaimId: rel.fromClaimId,
      toClaimId: rel.toClaimId,
      explanation: rel.explanation,
    })),
    reasoning?.claims ?? [],
  )
  const complementaryAudit = auditComplementaryRelationships(
    relTypes.map((rel) => ({
      id: rel.id,
      type: rel.type,
      fromClaimId: rel.fromClaimId,
      toClaimId: rel.toClaimId,
      explanation: rel.explanation,
    })),
    reasoning?.claims ?? [],
  )

  const unsupportedFinalJudgment =
    judgment != null &&
    (propositions.length === 0 ||
      !isDefensibleJudgmentProposition(propositions[0]))

  const missingFinalJudgment =
    judgment == null && (stats?.verifiedRelationships ?? 0) > 0

  const evidenceIntegrityViolation = warnings.some(
    (w) => w.code === 'EVIDENCE_INTEGRITY_VIOLATION',
  )

  return {
    relevantSources,
    candidatePairs: stats?.candidatePairs ?? 0,
    verifiedRelationships: stats?.verifiedRelationships ?? 0,
    relationshipClusters: stats?.relationshipClusters ?? 0,
    agreementDivideComplementary,
    verificationCollapse,
    unsupportedJudgmentPropositions: unsupportedProps.length,
    unsupportedFinalJudgment,
    missingFinalJudgment,
    falseAuditedAgreement: agreementAudit.falseAgreement,
    falseAuditedComplementary: complementaryAudit.falseComplementary,
    evidenceIntegrityViolation,
  }
}

export function evaluateE2eReasoningQuality(input: {
  fixtureId: string
  reasoning: MultiSourceReasoning | null
  infrastructurePassed: boolean
}): E2eEvalResult {
  const { fixtureId, reasoning, infrastructurePassed } = input

  if (!infrastructurePassed) {
    return {
      fixtureId,
      result: 'FAIL',
      infrastructureResult: 'FAIL',
      reasoningQualityResult: 'NOT_EVALUATED',
      reason: 'Pipeline execution failed',
    }
  }

  if (!reasoning) {
    return {
      fixtureId,
      result: 'FAIL',
      infrastructureResult: 'PASS',
      reasoningQualityResult: 'FAIL',
      reason: 'Pipeline completed without reasoning output',
      failureReasons: ['NO_REASONING_OUTPUT'],
    }
  }

  const criteria = collectE2eQualityCriteria(reasoning)
  const failureReasons: string[] = []

  if (criteria.verificationCollapse) {
    failureReasons.push('CANDIDATE_VERIFICATION_COLLAPSE')
  }
  if (criteria.relevantSources < 2) {
    failureReasons.push(`relevantSources=${criteria.relevantSources} (need >= 2)`)
  }
  if (criteria.candidatePairs <= 0) {
    failureReasons.push(`candidatePairs=${criteria.candidatePairs} (need > 0)`)
  }
  if (criteria.verifiedRelationships <= 0) {
    failureReasons.push(`verifiedRelationships=${criteria.verifiedRelationships} (need > 0)`)
  }
  if (criteria.relationshipClusters <= 0) {
    failureReasons.push(`relationshipClusters=${criteria.relationshipClusters} (need > 0)`)
  }
  if (criteria.agreementDivideComplementary <= 0) {
    failureReasons.push(
      `agreement+divide+complementary=${criteria.agreementDivideComplementary} (need > 0)`,
    )
  }
  if (criteria.unsupportedFinalJudgment) {
    failureReasons.push('UNSUPPORTED_FINAL_JUDGMENT')
  }
  if (criteria.missingFinalJudgment) {
    failureReasons.push('MISSING_FINAL_JUDGMENT')
  }
  if (criteria.unsupportedJudgmentPropositions > 0) {
    failureReasons.push(
      `unsupportedJudgmentPropositions=${criteria.unsupportedJudgmentPropositions} (need 0 for PASS)`,
    )
  }
  if (criteria.falseAuditedAgreement > 0) {
    failureReasons.push(`falseAuditedAgreement=${criteria.falseAuditedAgreement}`)
  }
  if (criteria.falseAuditedComplementary > 0) {
    failureReasons.push(`falseAuditedComplementary=${criteria.falseAuditedComplementary}`)
  }
  if (criteria.evidenceIntegrityViolation) {
    failureReasons.push('EVIDENCE_INTEGRITY_VIOLATION')
  }

  const coreCriteriaMet =
    criteria.relevantSources >= 2 &&
    criteria.candidatePairs > 0 &&
    criteria.verifiedRelationships > 0 &&
    criteria.relationshipClusters > 0 &&
    criteria.agreementDivideComplementary > 0 &&
    !criteria.verificationCollapse

  const qualityPassed =
    coreCriteriaMet &&
    failureReasons.length === 0 &&
    criteria.unsupportedJudgmentPropositions === 0 &&
    !criteria.unsupportedFinalJudgment &&
    !criteria.missingFinalJudgment &&
    criteria.falseAuditedAgreement === 0 &&
    criteria.falseAuditedComplementary === 0 &&
    !criteria.evidenceIntegrityViolation

  if (qualityPassed) {
    return {
      fixtureId,
      result: 'PASS',
      infrastructureResult: 'PASS',
      reasoningQualityResult: 'PASS',
      qualityCriteria: criteria,
    }
  }

  const hardFail =
    criteria.verificationCollapse ||
    criteria.unsupportedFinalJudgment ||
    criteria.missingFinalJudgment ||
    criteria.falseAuditedAgreement > 0 ||
    criteria.falseAuditedComplementary > 0 ||
    criteria.evidenceIntegrityViolation

  const reasoningQualityResult = hardFail ? 'FAIL' : 'DEGRADED'

  return {
    fixtureId,
    result: reasoningQualityResult,
    infrastructureResult: 'PASS',
    reasoningQualityResult,
    reason: failureReasons.join('; '),
    failureReasons,
    qualityCriteria: criteria,
  }
}
