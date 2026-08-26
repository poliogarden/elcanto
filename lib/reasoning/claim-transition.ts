import type { ClaimRejectionReason } from '@/lib/reasoning/claim-quality'
import {
  assessClaimFidelity,
  fidelityBlocksGeneration,
  type ClaimFidelityStatus,
  type ClaimMutationKind,
  type ClaimScope,
} from '@/lib/reasoning/claim-fidelity'
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
  qualityAccepted: boolean
  qualityRejectionReason?: ClaimRejectionReason | string
  fidelityStatus?: ClaimFidelityStatus
  fidelityMutation?: ClaimMutationKind[]
  claimScope?: ClaimScope
  strength?: string
  evidenceText?: string
  generationEligible: boolean
  inGenerationSet: boolean
}

export function buildClaimTransitionDiagnostics(input: {
  allClaims: ReasoningClaim[]
  usableClaimIds: Set<string>
  relevanceDiagnostics: ClaimRelevanceDiagnostic[]
  qualityAcceptedIds: Set<string>
  qualityRejected: Array<{ claim: ReasoningClaim; reason: ClaimRejectionReason }>
  generationClaimIds: Set<string>
  fidelityByClaimId?: Map<
    string,
    {
      status: ClaimFidelityStatus
      mutations: ClaimMutationKind[]
      scope: ClaimScope
      strength: string
      evidenceText?: string
    }
  >
}): ClaimTransitionRow[] {
  const relevanceById = new Map(input.relevanceDiagnostics.map((d) => [d.claimId, d]))
  const rejectedById = new Map(input.qualityRejected.map((r) => [r.claim.id, r.reason]))

  const rows: ClaimTransitionRow[] = []

  for (const claim of input.allClaims) {
    const rel = relevanceById.get(claim.id)
    const usable = input.usableClaimIds.has(claim.id)
    const accepted = input.qualityAcceptedIds.has(claim.id)
    const fidelity = input.fidelityByClaimId?.get(claim.id)
    const inGeneration = input.generationClaimIds.has(claim.id)

    let generationEligible = false
    if (accepted && fidelity) {
      generationEligible = !fidelityBlocksGeneration(fidelity.status)
    } else if (accepted && !input.fidelityByClaimId) {
      generationEligible = true
    }

    rows.push({
      claimId: claim.id,
      sourceId: claim.sourceId,
      claimText: claim.statement.slice(0, 200),
      relevanceScore: rel?.relevanceScore ?? claim.relevanceScore ?? 0,
      tier: rel?.tier ?? 'UNKNOWN',
      relevanceDecision: rel?.decision ?? (usable ? 'KEEP' : 'DROP'),
      usable,
      qualityAccepted: accepted,
      qualityRejectionReason: accepted ? undefined : rejectedById.get(claim.id),
      fidelityStatus: fidelity?.status,
      fidelityMutation: fidelity?.mutations,
      claimScope: fidelity?.scope,
      strength: fidelity?.strength,
      evidenceText: fidelity?.evidenceText?.slice(0, 160),
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

  const eligible = input.acceptedClaims.filter((c) => c.fidelityStatus !== 'OVERSTATED' && c.fidelityStatus !== 'UNSUPPORTED')

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

  // Stage A: source floor for relevant synthesis sources with eligible claims
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

  // Stage B: global high-value fill
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
