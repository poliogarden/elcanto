import type { MultiSourceReasoning } from '@/lib/reasoning/types'

export type MetricPopulationAudit = {
  totalExtractedClaims: number
  evidenceSupportedClaims: number
  relevanceUsable: number
  generationEligible: number
  candidates: number
  verified: number
  invariantViolations: string[]
}

export function auditMetricPopulation(reasoning: MultiSourceReasoning | null): MetricPopulationAudit {
  const empty: MetricPopulationAudit = {
    totalExtractedClaims: 0,
    evidenceSupportedClaims: 0,
    relevanceUsable: 0,
    generationEligible: 0,
    candidates: 0,
    verified: 0,
    invariantViolations: [],
  }
  if (!reasoning) return empty

  const claims = reasoning.claims ?? []
  const d = reasoning.diagnostics
  const stats = d?.pipelineStats
  const comparable = d?.comparableClaimFunnel

  const totalExtractedClaims = claims.length
  const evidenceSupportedClaims = claims.filter((c) => c.evidenceIds.length > 0).length
  const relevanceUsable = comparable?.usableInput ?? 0
  const generationEligible = stats?.generationEligible ?? comparable?.generationEligible ?? 0
  const candidates = stats?.candidatePairs ?? 0
  const verified = stats?.verifiedRelationships ?? reasoning.relationships?.length ?? 0

  const invariantViolations: string[] = []
  if (evidenceSupportedClaims > totalExtractedClaims) {
    invariantViolations.push('REPORT_AGGREGATION_INVARIANT_FAILURE: evidenceSupportedClaims > totalExtractedClaims')
  }
  if (generationEligible > totalExtractedClaims) {
    invariantViolations.push('REPORT_AGGREGATION_INVARIANT_FAILURE: generationEligible > totalExtractedClaims')
  }
  if (verified > candidates && candidates > 0) {
    invariantViolations.push('REPORT_AGGREGATION_INVARIANT_FAILURE: verified > candidates')
  }

  return {
    totalExtractedClaims,
    evidenceSupportedClaims,
    relevanceUsable,
    generationEligible,
    candidates,
    verified,
    invariantViolations,
  }
}
