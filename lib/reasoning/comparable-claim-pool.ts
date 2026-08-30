import {
  assessClaimFidelity,
  type ClaimFidelityStatus,
  type ClaimMutationKind,
  type ClaimScope,
} from '@/lib/reasoning/claim-fidelity'
import {
  assessClaimQuality,
  hasSemanticInflation,
  isHypeClaim,
  isRhetoricalClaim,
  type ClaimFidelityRecord,
  type ClaimRejectionReason,
} from '@/lib/reasoning/claim-quality'
import {
  classifyEvidenceSupport,
  isReasoningEligible,
  mergeEvidenceStatus,
  type ClaimEvidenceStatus,
} from '@/lib/reasoning/claim-evidence'
import { isTopicLabelClaim } from '@/lib/survival/quality'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'
import type { ClaimRelevanceDiagnostic } from '@/lib/reasoning/claim-relevance'
import type { ReasoningClaim, ReasoningEvidence } from '@/lib/reasoning/types'

export type EvidenceStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE'
export type ComparisonEligibility = 'ELIGIBLE' | 'LIMITED' | 'EXCLUDED'
export type ClaimQualityClass = 'FACTUAL' | 'INTERPRETIVE' | 'PREDICTIVE' | 'HYPE' | 'META' | 'RHETORICAL'

export type ComparableClaimRecord = {
  claimId: string
  sourceId: string
  relevanceTier: string
  evidenceStrength: EvidenceStrength
  comparisonEligibility: ComparisonEligibility
  claimQualityClass: ClaimQualityClass
  fidelityStatus?: ClaimFidelityStatus
  fidelityMutations?: ClaimMutationKind[]
  poolDropReason?: string
}

export type ComparablePoolStats = {
  usableInput: number
  comparable: number
  generationEligible: number
  highConfidence: number
  excluded: number
  limited: number
  noEvidenceEligible: number
  hypeLimited: number
  recoveryRecovered: number
  duplicatesMerged: number
}

export type ComparablePoolWarning = {
  code: 'RELEVANCE_COLLAPSE_RECOVERY' | 'SOURCE_PARTICIPATION_COLLAPSE'
  message: string
}

function evidenceTextsForClaim(
  claim: ReasoningClaim,
  evidenceById: Map<string, ReasoningEvidence>,
): string[] {
  return claim.evidenceIds
    .map((id) => evidenceById.get(id)?.text)
    .filter((t): t is string => Boolean(t))
}

function hasDiscernibleProposition(statement: string): boolean {
  const trimmed = statement.trim()
  if (trimmed.length < 12) return false
  if (isTopicLabelClaim(trimmed)) return false
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length < 4) return false
  return (
    /\b(is|are|can|provides|enables|reduces|allows|helps|supports|makes|uses|offers|standardizes|integrat|connect|deploy|adopt|implement|works|simplif|protocol|tool|server|api|model)\b/i.test(
      trimmed,
    ) || words.length >= 6
  )
}

function inferClaimQualityClass(statement: string, claimType: ReasoningClaim['claimType']): ClaimQualityClass {
  if (isHypeClaim(statement)) return 'HYPE'
  if (isRhetoricalClaim(statement)) return 'RHETORICAL'
  if (claimType === 'predictive') return 'PREDICTIVE'
  if (claimType === 'interpretive') return 'INTERPRETIVE'
  if (claimType === 'normative') return 'META'
  return 'FACTUAL'
}

function resolveClaimEvidenceStatus(
  claim: ReasoningClaim,
  evidenceTexts: string[],
): ClaimEvidenceStatus {
  if (claim.evidenceStatus) return claim.evidenceStatus
  if (evidenceTexts.length === 0) return 'NO_EVIDENCE'
  return mergeEvidenceStatus(
    evidenceTexts.map((text) => classifyEvidenceSupport(claim.statement, text).status),
  )
}

function isGenerationEvidenceEligible(claim: ReasoningClaim): boolean {
  const status = claim.evidenceStatus
  if (status === 'NO_EVIDENCE') return false
  if (claim.reasoningEligible === false) return false
  if (status && isReasoningEligible(status)) return true
  if (claim.reasoningEligible === true) return true
  return status == null && claim.reasoningEligible == null && claim.evidenceIds.length > 0
}

function assessEvidenceStrength(
  claim: ReasoningClaim,
  evidenceTexts: string[],
  _centralQuestion?: string,
): EvidenceStrength {
  if (claim.evidenceStatus === 'DIRECT_EVIDENCE') return 'STRONG'
  if (claim.evidenceStatus === 'PARAPHRASE_SUPPORTED') return 'MODERATE'
  if (claim.evidenceStatus === 'CONTEXT_SUPPORTED') return 'WEAK'
  if (claim.evidenceStatus === 'NO_EVIDENCE') return 'NONE'

  if (evidenceTexts.length === 0) return 'NONE'
  const statement = claim.statement
  let bestOverlap = 0
  for (const ev of evidenceTexts) {
    const ta = new Set(normalizeStatement(statement).split(/\W+/).filter((w) => w.length > 3))
    const tb = new Set(normalizeStatement(ev).split(/\W+/).filter((w) => w.length > 3))
    if (ta.size === 0 || tb.size === 0) continue
    let shared = 0
    for (const t of ta) if (tb.has(t)) shared++
    const overlap = shared / Math.min(ta.size, tb.size)
    if (overlap > bestOverlap) bestOverlap = overlap
  }
  if (bestOverlap >= 0.45) return 'STRONG'
  if (bestOverlap >= 0.22) return 'MODERATE'
  if (bestOverlap >= 0.08) return 'WEAK'
  return 'NONE'
}

function wordOverlap(a: string, b: string): number {
  const ta = new Set(
    normalizeStatement(a)
      .split(/\W+/)
      .filter((w) => w.length > 3),
  )
  const tb = new Set(
    normalizeStatement(b)
      .split(/\W+/)
      .filter((w) => w.length > 3),
  )
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / Math.min(ta.size, tb.size)
}

function mergeNearDuplicatesWithinSource(claims: ReasoningClaim[]): {
  accepted: ReasoningClaim[]
  merged: number
} {
  const bySource = new Map<string, ReasoningClaim[]>()
  for (const c of claims) {
    const list = bySource.get(c.sourceId) ?? []
    list.push(c)
    bySource.set(c.sourceId, list)
  }
  const accepted: ReasoningClaim[] = []
  let merged = 0
  for (const sourceClaims of bySource.values()) {
    const kept: ReasoningClaim[] = []
    for (const claim of sourceClaims) {
      const dup = kept.find(
        (k) =>
          k.normalizedStatement === claim.normalizedStatement ||
          wordOverlap(k.statement, claim.statement) > 0.65,
      )
      if (!dup) {
        kept.push(claim)
        continue
      }
      merged++
      const evidenceIds = [...new Set([...dup.evidenceIds, ...claim.evidenceIds])]
      const better = claim.confidence === 'strong' && dup.confidence !== 'strong' ? claim : dup
      const idx = kept.indexOf(dup)
      kept[idx] = { ...better, evidenceIds }
    }
    accepted.push(...kept)
  }
  return { accepted, merged }
}

function enrichClaim(
  claim: ReasoningClaim,
  evidenceById: Map<string, ReasoningEvidence>,
  meta: {
    evidenceStrength: EvidenceStrength
    comparisonEligibility: ComparisonEligibility
    claimQualityClass: ClaimQualityClass
    fidelityStatus?: ClaimFidelityStatus
    fidelityMutations?: ClaimMutationKind[]
    claimScope?: ClaimScope
    strength?: 'strong' | 'moderate' | 'weak'
    evidenceText?: string
  },
): ReasoningClaim {
  const texts = evidenceTextsForClaim(claim, evidenceById)
  const primary = claim.evidenceIds[0] ? evidenceById.get(claim.evidenceIds[0]) : undefined
  return {
    ...claim,
    originalText: claim.originalText ?? claim.statement,
    evidenceText: meta.evidenceText ?? texts[0] ?? claim.evidenceText,
    timestampStart: primary?.timestampStart,
    timestampEnd: primary?.timestampEnd ?? undefined,
    fidelityStatus: meta.fidelityStatus,
    fidelityMutations: meta.fidelityMutations,
    claimScope: meta.claimScope,
    strength: meta.strength,
    evidenceStrength: meta.evidenceStrength,
    comparisonEligibility: meta.comparisonEligibility,
    claimQualityClass: meta.claimQualityClass,
  }
}

function evaluateClaimForPool(
  claim: ReasoningClaim,
  evidenceById: Map<string, ReasoningEvidence>,
  tier: string,
  centralQuestion?: string,
  excludedSourceIds?: Set<string>,
): {
  record: ComparableClaimRecord
  claim?: ReasoningClaim
  highConfidence: boolean
  fidelityRecord?: ClaimFidelityRecord
} {
  const statement = claim.statement.trim()
  const evidenceTexts = evidenceTextsForClaim(claim, evidenceById)
  const resolvedEvidenceStatus = resolveClaimEvidenceStatus(claim, evidenceTexts)
  const resolvedReasoningEligible =
    claim.reasoningEligible ?? isReasoningEligible(resolvedEvidenceStatus)
  const claimForEval: ReasoningClaim = {
    ...claim,
    evidenceStatus: resolvedEvidenceStatus,
    reasoningEligible: resolvedReasoningEligible,
  }
  const evidenceStrength = assessEvidenceStrength(claimForEval, evidenceTexts, centralQuestion)
  const qualityClass = inferClaimQualityClass(statement, claim.claimType)

  if (excludedSourceIds?.has(claim.sourceId)) {
    return {
      record: {
        claimId: claim.id,
        sourceId: claim.sourceId,
        relevanceTier: tier,
        evidenceStrength,
        comparisonEligibility: 'EXCLUDED',
        claimQualityClass: qualityClass,
        poolDropReason: 'OFF_TOPIC',
      },
      highConfidence: false,
    }
  }

  if (!hasDiscernibleProposition(statement)) {
    return {
      record: {
        claimId: claim.id,
        sourceId: claim.sourceId,
        relevanceTier: tier,
        evidenceStrength,
        comparisonEligibility: 'EXCLUDED',
        claimQualityClass: qualityClass,
        poolDropReason: 'NO_PROPOSITION',
      },
      highConfidence: false,
    }
  }

  if (isRhetoricalClaim(statement)) {
    return {
      record: {
        claimId: claim.id,
        sourceId: claim.sourceId,
        relevanceTier: tier,
        evidenceStrength,
        comparisonEligibility: 'EXCLUDED',
        claimQualityClass: 'RHETORICAL',
        poolDropReason: 'RHETORICAL',
      },
      highConfidence: false,
    }
  }

  if (claimForEval.evidenceStatus === 'NO_EVIDENCE' || claimForEval.reasoningEligible === false) {
    return {
      record: {
        claimId: claim.id,
        sourceId: claim.sourceId,
        relevanceTier: tier,
        evidenceStrength: 'NONE',
        comparisonEligibility: 'EXCLUDED',
        claimQualityClass: qualityClass,
        poolDropReason: 'NO_EVIDENCE_REASONING_INELIGIBLE',
      },
      highConfidence: false,
    }
  }

  let comparisonEligibility: ComparisonEligibility = 'ELIGIBLE'
  let poolDropReason: string | undefined
  let fidelityStatus: ClaimFidelityStatus | undefined
  let fidelityMutations: ClaimMutationKind[] | undefined
  let claimScope: ClaimScope | undefined
  let strength: 'strong' | 'moderate' | 'weak' | undefined
  let fidelityRecord: ClaimFidelityRecord | undefined
  let suggestedStatement = statement

  const isHype = isHypeClaim(statement)
  if (isHype) {
    comparisonEligibility = 'LIMITED'
    poolDropReason = 'HYPE_LIMITED'
  }

  if (evidenceTexts.length > 0) {
    for (const evText of evidenceTexts) {
      if (hasSemanticInflation(statement, evText, centralQuestion)) {
        comparisonEligibility = 'LIMITED'
        poolDropReason = poolDropReason ?? 'WEAK_EVIDENCE'
      }
    }
    const fidelity = assessClaimFidelity(claim, evidenceTexts[0])
    fidelityStatus = fidelity.status
    fidelityMutations = fidelity.mutations
    claimScope = fidelity.scope
    strength = fidelity.strength
    fidelityRecord = {
      claimId: claim.id,
      status: fidelity.status,
      mutations: fidelity.mutations,
      scope: fidelity.scope,
      strength: fidelity.strength,
      evidenceText: evidenceTexts[0].slice(0, 240),
    }
    if (fidelity.status === 'OVERSTATED') {
      if (fidelity.suggestedStatement) {
        suggestedStatement = fidelity.suggestedStatement
        comparisonEligibility = 'LIMITED'
        poolDropReason = poolDropReason ?? 'OVERSTATED_BOUNDED'
        fidelityStatus = 'PARTIALLY_SUPPORTED'
      } else {
        return {
          record: {
            claimId: claim.id,
            sourceId: claim.sourceId,
            relevanceTier: tier,
            evidenceStrength,
            comparisonEligibility: 'EXCLUDED',
            claimQualityClass: qualityClass,
            fidelityStatus: fidelity.status,
            fidelityMutations: fidelity.mutations,
            poolDropReason: 'OVERSTATED',
          },
          highConfidence: false,
          fidelityRecord,
        }
      }
    } else if (fidelity.status === 'UNSUPPORTED') {
      comparisonEligibility = 'LIMITED'
      poolDropReason = poolDropReason ?? 'WEAK_EVIDENCE'
    }
    if (fidelity.status === 'PARTIALLY_SUPPORTED' && fidelity.suggestedStatement) {
      suggestedStatement = fidelity.suggestedStatement
      comparisonEligibility = 'LIMITED'
      poolDropReason = poolDropReason ?? 'PARTIALLY_SUPPORTED'
    }
  } else {
    if (comparisonEligibility === 'ELIGIBLE') {
      poolDropReason = poolDropReason ?? 'NO_EVIDENCE'
    }
    strength = 'weak'
    fidelityStatus = 'PARTIALLY_SUPPORTED'
  }

  const strictReason = assessClaimQuality(claim, evidenceById, {
    centralQuestion,
    allowMissingEvidence: true,
  })
  const highConfidence =
    !strictReason &&
    comparisonEligibility === 'ELIGIBLE' &&
    evidenceStrength !== 'NONE' &&
    fidelityStatus !== 'PARTIALLY_SUPPORTED' &&
    !isHype

  const enriched = enrichClaim(
    {
      ...claimForEval,
      statement: suggestedStatement,
      normalizedStatement: normalizeStatement(suggestedStatement),
      confidence: highConfidence ? claim.confidence : 'moderate',
    },
    evidenceById,
    {
      evidenceStrength,
      comparisonEligibility,
      claimQualityClass: qualityClass,
      fidelityStatus,
      fidelityMutations,
      claimScope,
      strength,
      evidenceText: evidenceTexts[0]?.slice(0, 240),
    },
  )

  return {
    record: {
      claimId: claim.id,
      sourceId: claim.sourceId,
      relevanceTier: tier,
      evidenceStrength,
      comparisonEligibility,
      claimQualityClass: qualityClass,
      fidelityStatus,
      fidelityMutations,
      poolDropReason: comparisonEligibility === 'EXCLUDED' ? poolDropReason : undefined,
    },
    claim: enriched,
    highConfidence,
    fidelityRecord,
  }
}

export function selectComparableForGeneration(input: {
  comparableClaims: ReasoningClaim[]
  synthesisSourceIds: Set<string>
  relevanceTierByClaimId: Map<string, string>
  maxTotal?: number
  maxPrimaryPerSource?: number
  maxSupportingPerSource?: number
}): ReasoningClaim[] {
  const maxTotal = input.maxTotal ?? 28
  const maxPrimary = input.maxPrimaryPerSource ?? 8
  const maxSupporting = input.maxSupportingPerSource ?? 6

  const bySource = new Map<string, ReasoningClaim[]>()
  for (const c of input.comparableClaims) {
    const list = bySource.get(c.sourceId) ?? []
    list.push(c)
    bySource.set(c.sourceId, list)
  }

  for (const list of bySource.values()) {
    list.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
  }

  const selected: ReasoningClaim[] = []
  const selectedIds = new Set<string>()

  for (const sourceId of input.synthesisSourceIds) {
    const list = bySource.get(sourceId) ?? []
    let primaryTaken = 0
    let supportingTaken = 0
    for (const c of list) {
      const tier = input.relevanceTierByClaimId.get(c.id) ?? 'SUPPORTING'
      if (tier === 'PRIMARY' && primaryTaken >= maxPrimary) continue
      if (tier === 'SUPPORTING' && supportingTaken >= maxSupporting) continue
      if (tier === 'PERIPHERAL') continue
      if (selectedIds.has(c.id)) continue
      selected.push(c)
      selectedIds.add(c.id)
      if (tier === 'PRIMARY') primaryTaken++
      else supportingTaken++
    }
  }

  // Floor: at least 1 per synthesis source with comparable claims
  for (const sourceId of input.synthesisSourceIds) {
    if (selected.some((c) => c.sourceId === sourceId)) continue
    const best = bySource.get(sourceId)?.[0]
    if (best && !selectedIds.has(best.id)) {
      selected.push(best)
      selectedIds.add(best.id)
    }
  }

  const remainder = [...input.comparableClaims]
    .filter((c) => !selectedIds.has(c.id))
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))

  for (const c of remainder) {
    if (selected.length >= maxTotal) break
    selected.push(c)
    selectedIds.add(c.id)
  }

  return selected
}

export function buildComparableClaimPool(input: {
  usableClaims: ReasoningClaim[]
  evidence: ReasoningEvidence[]
  relevanceDiagnostics: ClaimRelevanceDiagnostic[]
  excludedSourceIds?: Set<string>
  centralQuestion?: string
  synthesisSourceIds: Set<string>
  /** V2: union of synthesis + claim-level eligible sources for generation floor. */
  participatingSourceIds?: Set<string>
}): {
  comparableClaims: ReasoningClaim[]
  generationClaims: ReasoningClaim[]
  highConfidenceClaims: ReasoningClaim[]
  records: ComparableClaimRecord[]
  rejected: Array<{ claim: ReasoningClaim; reason: string }>
  stats: ComparablePoolStats
  fidelityRecords: ClaimFidelityRecord[]
  warnings: ComparablePoolWarning[]
} {
  const evidenceById = new Map(input.evidence.map((e) => [e.id, e]))
  const tierById = new Map(input.relevanceDiagnostics.map((d) => [d.claimId, d.tier]))
  const records: ComparableClaimRecord[] = []
  const rejected: Array<{ claim: ReasoningClaim; reason: string }> = []
  const fidelityRecords: ClaimFidelityRecord[] = []
  const poolClaims: ReasoningClaim[] = []
  const highConfidence: ReasoningClaim[] = []
  const warnings: ComparablePoolWarning[] = []

  for (const claim of input.usableClaims) {
    const tier = tierById.get(claim.id) ?? 'SUPPORTING'
    const result = evaluateClaimForPool(
      claim,
      evidenceById,
      tier,
      input.centralQuestion,
      input.excludedSourceIds,
    )
    records.push(result.record)
    if (result.fidelityRecord) fidelityRecords.push(result.fidelityRecord)
    if (!result.claim || result.record.comparisonEligibility === 'EXCLUDED') {
      rejected.push({
        claim,
        reason: result.record.poolDropReason ?? 'EXCLUDED',
      })
      continue
    }
    poolClaims.push(result.claim)
    if (result.highConfidence) highConfidence.push(result.claim)
  }

  let { accepted: deduped, merged } = mergeNearDuplicatesWithinSource(poolClaims)

  let recoveryRecovered = 0
  const comparableRatio = input.usableClaims.length > 0 ? deduped.length / input.usableClaims.length : 0
  const participatingBefore = new Set(deduped.map((c) => c.sourceId)).size

  if (
    (input.usableClaims.length >= 10 && comparableRatio < 0.2) ||
    (input.synthesisSourceIds.size >= 2 && participatingBefore < 2)
  ) {
    const recovered: ReasoningClaim[] = []
    for (const row of rejected) {
      const reason = row.reason
      if (
        reason === 'OFF_TOPIC' ||
        reason === 'NO_PROPOSITION' ||
        reason === 'RHETORICAL' ||
        reason === 'OVERSTATED'
      ) {
        continue
      }
      if (
        reason === 'HYPE_LIMITED' ||
        reason === 'WEAK_EVIDENCE' ||
        reason === 'PARTIALLY_SUPPORTED' ||
        reason === 'OVERSTATED_BOUNDED'
      ) {
        const tier = tierById.get(row.claim.id) ?? 'SUPPORTING'
        const re = evaluateClaimForPool(
          row.claim,
          evidenceById,
          tier,
          input.centralQuestion,
          undefined,
        )
        if (re.claim && re.record.comparisonEligibility !== 'EXCLUDED') {
          recovered.push(re.claim)
          records.push({ ...re.record, poolDropReason: 'RECOVERY' })
          recoveryRecovered++
        }
      }
    }
    if (recovered.length > 0) {
      deduped = mergeNearDuplicatesWithinSource([...deduped, ...recovered]).accepted
      warnings.push({
        code: 'RELEVANCE_COLLAPSE_RECOVERY',
        message: `Comparable pool recovery: restored ${recoveryRecovered} claims (usable ${input.usableClaims.length} → comparable ${deduped.length}).`,
      })
    }
  }

  const tierMap = tierById
  const poolSourceIds = input.participatingSourceIds ?? input.synthesisSourceIds
  const rawGenerationClaims = selectComparableForGeneration({
    comparableClaims: deduped,
    synthesisSourceIds: poolSourceIds,
    relevanceTierByClaimId: tierMap,
    maxTotal: 28,
    maxPrimaryPerSource: 8,
    maxSupportingPerSource: 6,
  })
  const generationClaims = rawGenerationClaims.filter(isGenerationEvidenceEligible)

  const participatingAfter = new Set(generationClaims.map((c) => c.sourceId)).size
  if (poolSourceIds.size >= 2 && participatingAfter < 2) {
    warnings.push({
      code: 'SOURCE_PARTICIPATION_COLLAPSE',
      message: `Only ${participatingAfter}/${poolSourceIds.size} participating sources in generation pool.`,
    })
  }

  const stats: ComparablePoolStats = {
    usableInput: input.usableClaims.length,
    comparable: deduped.length,
    generationEligible: generationClaims.length,
    highConfidence: highConfidence.length,
    excluded: rejected.length,
    limited: records.filter((r) => r.comparisonEligibility === 'LIMITED').length,
    noEvidenceEligible: records.filter((r) => r.evidenceStrength === 'NONE' && r.comparisonEligibility !== 'EXCLUDED').length,
    hypeLimited: records.filter((r) => r.claimQualityClass === 'HYPE' && r.comparisonEligibility !== 'EXCLUDED').length,
    recoveryRecovered,
    duplicatesMerged: merged,
  }

  return {
    comparableClaims: deduped,
    generationClaims,
    highConfidenceClaims: highConfidence.filter((c) =>
      generationClaims.some((g) => g.id === c.id),
    ),
    records,
    rejected,
    stats,
    fidelityRecords,
    warnings,
  }
}
