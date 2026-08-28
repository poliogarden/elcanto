import type { ClaimRejectionReason } from '@/lib/reasoning/claim-quality'
import type { ComparableClaimRecord } from '@/lib/reasoning/comparable-claim-pool'
import type { ClaimRelevanceDiagnostic } from '@/lib/reasoning/claim-relevance'
import type { ReasoningClaim } from '@/lib/reasoning/types'

export type ClaimTransitionRow = {
  claimId: string
  sourceId: string
  claimText: string
  relevanceScore: number
  tier: string
  relevanceDecision: string
  usable: boolean
  comparable: boolean
  comparisonEligibility?: string
  evidenceStrength?: string
  claimQualityClass?: string
  qualityAccepted: boolean
  qualityRejectionReason?: ClaimRejectionReason | string
  poolDropReason?: string
  fidelityStatus?: string
  fidelityMutation?: string[]
  claimScope?: string
  strength?: string
  evidenceText?: string
  generationEligible: boolean
  inGenerationSet: boolean
}

export function buildClaimTransitionDiagnostics(input: {
  allClaims: ReasoningClaim[]
  usableClaimIds: Set<string>
  relevanceDiagnostics: ClaimRelevanceDiagnostic[]
  comparableIds: Set<string>
  generationEligibleIds: Set<string>
  generationClaimIds: Set<string>
  qualityAcceptedIds: Set<string>
  qualityRejected: Array<{ claim: ReasoningClaim; reason: ClaimRejectionReason }>
  comparableRecords?: ComparableClaimRecord[]
}): ClaimTransitionRow[] {
  const relevanceById = new Map(input.relevanceDiagnostics.map((d) => [d.claimId, d]))
  const rejectedById = new Map(input.qualityRejected.map((r) => [r.claim.id, r.reason]))
  const comparableById = new Map(
    (input.comparableRecords ?? []).map((r) => [r.claimId, r]),
  )

  const rows: ClaimTransitionRow[] = []

  for (const claim of input.allClaims) {
    const rel = relevanceById.get(claim.id)
    const usable = input.usableClaimIds.has(claim.id)
    const comparable = input.comparableIds.has(claim.id)
    const accepted = input.qualityAcceptedIds.has(claim.id)
    const comparableMeta = comparableById.get(claim.id)
    const inGeneration = input.generationClaimIds.has(claim.id)
    const generationEligible = input.generationEligibleIds.has(claim.id)

    rows.push({
      claimId: claim.id,
      sourceId: claim.sourceId,
      claimText: claim.statement.slice(0, 200),
      relevanceScore: rel?.relevanceScore ?? claim.relevanceScore ?? 0,
      tier: rel?.tier ?? 'UNKNOWN',
      relevanceDecision: rel?.decision ?? (usable ? 'KEEP' : 'DROP'),
      usable,
      comparable,
      comparisonEligibility: comparableMeta?.comparisonEligibility ?? claim.comparisonEligibility,
      evidenceStrength: comparableMeta?.evidenceStrength ?? claim.evidenceStrength,
      claimQualityClass: comparableMeta?.claimQualityClass ?? claim.claimQualityClass,
      qualityAccepted: accepted,
      qualityRejectionReason: accepted ? undefined : rejectedById.get(claim.id),
      poolDropReason: comparableMeta?.poolDropReason,
      fidelityStatus: comparableMeta?.fidelityStatus ?? claim.fidelityStatus,
      fidelityMutation: comparableMeta?.fidelityMutations ?? claim.fidelityMutations,
      claimScope: claim.claimScope,
      strength: claim.strength,
      evidenceText: claim.evidenceText?.slice(0, 160),
      generationEligible,
      inGenerationSet: inGeneration,
    })
  }

  return rows.sort((a, b) => {
    if (a.sourceId !== b.sourceId) return a.sourceId.localeCompare(b.sourceId)
    return b.relevanceScore - a.relevanceScore
  })
}

export function selectClaimsForGenerationWithSourceFloor(input: {
  acceptedClaims: ReasoningClaim[]
  synthesisSourceIds: Set<string>
  maxTotal?: number
  minPerSourceFloor?: number
}): ReasoningClaim[] {
  const maxTotal = input.maxTotal ?? 24
  const minFloor = input.minPerSourceFloor ?? 1

  const eligible = input.acceptedClaims.filter(
    (c) =>
      c.comparisonEligibility !== 'EXCLUDED' &&
      c.fidelityStatus !== 'OVERSTATED',
  )

  if (eligible.length <= maxTotal) return eligible

  const bySource = new Map<string, ReasoningClaim[]>()
  for (const c of eligible) {
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
    if (list.length === 0) continue
    for (const c of list.slice(0, minFloor)) {
      if (!selectedIds.has(c.id)) {
        selected.push(c)
        selectedIds.add(c.id)
      }
    }
  }

  const remainder = [...eligible]
    .filter((c) => !selectedIds.has(c.id))
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))

  for (const c of remainder) {
    if (selected.length >= maxTotal) break
    selected.push(c)
    selectedIds.add(c.id)
  }

  return selected
}
