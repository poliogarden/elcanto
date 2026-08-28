import type { ClaimEvidenceStatus } from '@/lib/reasoning/claim-evidence'
import type { ReasoningClaim } from '@/lib/reasoning/types'

export type EvidenceCoverageStats = {
  extracted: number
  direct: number
  paraphrase: number
  context: number
  noEvidence: number
  reasoningEligible: number
  reasoningExcluded: number
  generationTotal: number
  generationWithEvidence: number
  generationNoEvidence: number
  bySource: Array<{
    sourceId: string
    voiceIndex: number
    direct: number
    paraphrase: number
    context: number
    noEvidence: number
    reasoningEligible: number
    generationWithEvidence: number
    generationNoEvidence: number
  }>
}

export function buildEvidenceCoverageDiagnostics(input: {
  allClaims: ReasoningClaim[]
  generationClaims: ReasoningClaim[]
}): EvidenceCoverageStats {
  const counts = {
    direct: 0,
    paraphrase: 0,
    context: 0,
    noEvidence: 0,
    reasoningEligible: 0,
    reasoningExcluded: 0,
  }

  for (const claim of input.allClaims) {
    const status = claim.evidenceStatus ?? 'NO_EVIDENCE'
    if (status === 'DIRECT_EVIDENCE') counts.direct++
    else if (status === 'PARAPHRASE_SUPPORTED') counts.paraphrase++
    else if (status === 'CONTEXT_SUPPORTED') counts.context++
    else counts.noEvidence++

    if (claim.reasoningEligible) counts.reasoningEligible++
    else if (claim.reasoningEligible === false || claim.evidenceStatus === 'NO_EVIDENCE') {
      counts.reasoningExcluded++
    } else if (claim.evidenceIds.length > 0) counts.reasoningEligible++
    else counts.reasoningExcluded++
  }

  const generationIds = new Set(input.generationClaims.map((c) => c.id))
  let generationWithEvidence = 0
  let generationNoEvidence = 0
  for (const c of input.generationClaims) {
    if (c.evidenceStatus === 'NO_EVIDENCE' || c.reasoningEligible === false) generationNoEvidence++
    else generationWithEvidence++
  }

  const sourceIds = [...new Set(input.allClaims.map((c) => c.sourceId))].sort()
  const bySource = sourceIds.map((sourceId) => {
    const sourceClaims = input.allClaims.filter((c) => c.sourceId === sourceId)
    const gen = sourceClaims.filter((c) => generationIds.has(c.id))
    const row = {
      sourceId,
      voiceIndex: sourceClaims[0]?.voiceIndex ?? 0,
      direct: 0,
      paraphrase: 0,
      context: 0,
      noEvidence: 0,
      reasoningEligible: 0,
      generationWithEvidence: 0,
      generationNoEvidence: 0,
    }
    for (const c of sourceClaims) {
      const status = c.evidenceStatus ?? 'NO_EVIDENCE'
      if (status === 'DIRECT_EVIDENCE') row.direct++
      else if (status === 'PARAPHRASE_SUPPORTED') row.paraphrase++
      else if (status === 'CONTEXT_SUPPORTED') row.context++
      else row.noEvidence++
      if (c.reasoningEligible) row.reasoningEligible++
    }
    for (const c of gen) {
      if (c.evidenceStatus === 'NO_EVIDENCE' || !c.reasoningEligible) row.generationNoEvidence++
      else row.generationWithEvidence++
    }
    return row
  })

  return {
    extracted: input.allClaims.length,
    direct: counts.direct,
    paraphrase: counts.paraphrase,
    context: counts.context,
    noEvidence: counts.noEvidence,
    reasoningEligible: counts.reasoningEligible,
    reasoningExcluded: counts.reasoningExcluded,
    generationTotal: input.generationClaims.length,
    generationWithEvidence,
    generationNoEvidence,
    bySource,
  }
}

export function findEvidenceIntegrityViolations(
  generationClaims: ReasoningClaim[],
): Array<{ claimId: string; sourceId: string; evidenceStatus: ClaimEvidenceStatus }> {
  return generationClaims
    .filter(
      (c) => c.evidenceStatus === 'NO_EVIDENCE' || c.reasoningEligible === false,
    )
    .map((c) => ({
      claimId: c.id,
      sourceId: c.sourceId,
      evidenceStatus: c.evidenceStatus ?? 'NO_EVIDENCE',
    }))
}
