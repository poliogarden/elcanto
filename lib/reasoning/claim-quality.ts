import { isTopicLabelClaim } from '@/lib/survival/quality'
import {
  assessClaimFidelity,
  type ClaimFidelityStatus,
  type ClaimMutationKind,
  type ClaimScope,
} from '@/lib/reasoning/claim-fidelity'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'
import type { ReasoningClaim, ReasoningEvidence } from '@/lib/reasoning/types'

export type ClaimRejectionReason =
  | 'RHETORICAL'
  | 'HYPE'
  | 'NO_EVIDENCE'
  | 'SEMANTIC_INFLATION'
  | 'LOW_VALUE'
  | 'NEAR_DUPLICATE'
  | 'OFF_TOPIC_SOURCE'
  | 'OVERSTATED'
  | 'UNSUPPORTED_FIDELITY'
  | 'CAUSE_INFERRED_WITHOUT_EVIDENCE'
  | 'SCOPE_MUTATION'
  | 'CERTAINTY_MUTATION'

export type ClaimQualityStats = {
  rejected: number
  duplicatesMerged: number
  inflationRejected: number
  rhetoricalRejected: number
  hypeRejected: number
  noEvidenceRejected: number
  lowValueRejected: number
  overstatedRejected: number
  unsupportedFidelityRejected: number
  causeInferredRejected: number
  partiallySupportedAccepted: number
}

export type ClaimFidelityRecord = {
  claimId: string
  status: ClaimFidelityStatus
  mutations: ClaimMutationKind[]
  scope: ClaimScope
  strength: string
  evidenceText?: string
}

const HYPE_PATTERNS = [
  /\bgame[- ]?changer\b/i,
  /\btransformative\b/i,
  /\brevolutionary\b/i,
  /\brevolutionize\b/i,
  /\bpivotal\b/i,
  /\bcritical technology\b/i,
  /\bmajor discussions\b/i,
  /\bindustry consensus\b/i,
  /\bwidespread adoption\b/i,
  /\bdominant\b/i,
  /\binevitable\b/i,
  /\bfundamental shift\b/i,
  /\btransforming the\b/i,
  /\btransforms the\b/i,
  /\bgenerated major\b/i,
  /\bend-?users alike\b/i,
]

const RHETORICAL_PATTERNS = [
  /\bno matter (your|what) age\b/i,
  /\banyone can\b/i,
  /\beveryone should\b/i,
  /\bthis is why\b/i,
  /\bthat's why\b/i,
  /\bstay motivated\b/i,
  /\byou need to watch\b/i,
  /\bmust watch\b/i,
  /\bclick subscribe\b/i,
  /\b#shorts\b/i,
]

const STRENGTH_MARKERS = [
  'transform',
  'transformative',
  'revolutionary',
  'revolution',
  'game changer',
  'game-changer',
  'dramatically',
  'fundamental',
  'pivotal',
  'critical',
  'inevitable',
  'dominant',
  'major shift',
  'industry-wide',
]

function strengthMarkersForQuestion(centralQuestion?: string): string[] {
  const markers = [...STRENGTH_MARKERS]
  const q = centralQuestion?.toLowerCase() ?? ''
  if (q.includes('ecosystem')) markers.push('ecosystem')
  return markers
}

const WEAK_EVIDENCE_MARKERS = [
  'may',
  'might',
  'could',
  'possibly',
  'perhaps',
  'some',
  'sometimes',
  'can make',
]

function tokenize(text: string): string[] {
  return normalizeStatement(text)
    .split(/\W+/)
    .filter((w) => w.length > 2)
}

function wordOverlap(a: string, b: string): number {
  const wa = new Set(tokenize(a).filter((w) => w.length > 3))
  const wb = new Set(tokenize(b).filter((w) => w.length > 3))
  if (wa.size === 0 || wb.size === 0) return 0
  let shared = 0
  for (const w of wa) if (wb.has(w)) shared++
  return shared / Math.max(wa.size, wb.size)
}

function evidenceTextsForClaim(
  claim: ReasoningClaim,
  evidenceById: Map<string, ReasoningEvidence>,
): string[] {
  return claim.evidenceIds
    .map((id) => evidenceById.get(id)?.text)
    .filter((t): t is string => Boolean(t))
}

function fidelityToRejectionReason(mutations: ClaimMutationKind[]): ClaimRejectionReason {
  if (mutations.includes('CORRELATION_TO_CAUSATION')) return 'CAUSE_INFERRED_WITHOUT_EVIDENCE'
  if (mutations.includes('POSSIBILITY_TO_CERTAINTY')) return 'CERTAINTY_MUTATION'
  if (mutations.includes('SCOPE_ESCALATION') || mutations.includes('PERSONAL_TO_UNIVERSAL')) {
    return 'SCOPE_MUTATION'
  }
  return 'OVERSTATED'
}

function applyFidelityGate(
  claim: ReasoningClaim,
  evidenceById: Map<string, ReasoningEvidence>,
): { claim: ReasoningClaim; record: ClaimFidelityRecord } | { reject: ClaimRejectionReason; record: ClaimFidelityRecord } {
  const evidenceTexts = evidenceTextsForClaim(claim, evidenceById)
  const primaryEvidence = evidenceTexts[0] ?? ''
  const fidelity = assessClaimFidelity(claim, primaryEvidence)

  const record: ClaimFidelityRecord = {
    claimId: claim.id,
    status: fidelity.status,
    mutations: fidelity.mutations,
    scope: fidelity.scope,
    strength: fidelity.strength,
    evidenceText: primaryEvidence.slice(0, 240),
  }

  const enriched: ReasoningClaim = {
    ...claim,
    fidelityStatus: fidelity.status,
    fidelityMutations: fidelity.mutations,
    claimScope: fidelity.scope,
    strength: fidelity.strength,
    evidenceText: primaryEvidence.slice(0, 240) ?? claim.evidenceText,
  }

  if (fidelity.status === 'OVERSTATED') {
    const canBound =
      fidelity.suggestedStatement &&
      fidelity.mutations.length > 0 &&
      fidelity.mutations.every(
        (m) => m === 'CORRELATION_TO_CAUSATION' || m === 'EASE_TO_ADOPTION',
      )
    if (canBound) {
      return {
        claim: {
          ...enriched,
          statement: fidelity.suggestedStatement!,
          normalizedStatement: normalizeStatement(fidelity.suggestedStatement!),
          fidelityStatus: 'PARTIALLY_SUPPORTED',
          confidence: 'moderate',
        },
        record: {
          ...record,
          status: 'PARTIALLY_SUPPORTED',
        },
      }
    }
    return { reject: fidelityToRejectionReason(fidelity.mutations), record }
  }
  if (fidelity.status === 'UNSUPPORTED') {
    return { reject: 'UNSUPPORTED_FIDELITY', record }
  }

  if (fidelity.status === 'PARTIALLY_SUPPORTED' && fidelity.suggestedStatement) {
    return {
      claim: {
        ...enriched,
        statement: fidelity.suggestedStatement,
        normalizedStatement: normalizeStatement(fidelity.suggestedStatement),
        confidence: 'moderate',
      },
      record,
    }
  }

  return { claim: enriched, record }
}

function enrichClaimProvenance(
  claim: ReasoningClaim,
  evidenceById: Map<string, ReasoningEvidence>,
): ReasoningClaim {
  const texts = evidenceTextsForClaim(claim, evidenceById)
  const primary = claim.evidenceIds[0] ? evidenceById.get(claim.evidenceIds[0]) : undefined
  return {
    ...claim,
    originalText: claim.originalText ?? claim.statement,
    evidenceText: texts[0] ?? claim.evidenceText,
    timestampStart: primary?.timestampStart,
    timestampEnd: primary?.timestampEnd ?? undefined,
  }
}

export function isHypeClaim(statement: string): boolean {
  return HYPE_PATTERNS.some((p) => p.test(statement))
}

export function isRhetoricalClaim(statement: string): boolean {
  return RHETORICAL_PATTERNS.some((p) => p.test(statement))
}

export function hasSemanticInflation(
  claimText: string,
  evidenceText: string,
  centralQuestion?: string,
): boolean {
  const claimNorm = normalizeStatement(claimText)
  const evidenceNorm = normalizeStatement(evidenceText)
  const markers = strengthMarkersForQuestion(centralQuestion)

  for (const marker of markers) {
    if (claimNorm.includes(marker) && !evidenceNorm.includes(marker)) {
      return true
    }
  }

  const claimHasStrength = markers.some((m) => claimNorm.includes(m))
  const evidenceHasWeak = WEAK_EVIDENCE_MARKERS.some((m) => evidenceNorm.includes(m))
  if (claimHasStrength && evidenceHasWeak) return true

  if (claimNorm.length > evidenceNorm.length * 2.2 && wordOverlap(claimText, evidenceText) < 0.35) {
    return true
  }

  return false
}

export function assessClaimQuality(
  claim: ReasoningClaim,
  evidenceById: Map<string, ReasoningEvidence>,
  options?: {
    centralQuestion?: string
    allowMissingEvidence?: boolean
  },
): ClaimRejectionReason | null {
  const statement = claim.statement.trim()
  if (isTopicLabelClaim(statement)) return 'LOW_VALUE'
  if (isHypeClaim(statement)) return 'HYPE'
  if (isRhetoricalClaim(statement)) return 'RHETORICAL'

  const evidenceTexts = evidenceTextsForClaim(claim, evidenceById)
  const hasEvidence = claim.evidenceIds.length > 0 && evidenceTexts.length > 0

  if (!hasEvidence && !options?.allowMissingEvidence) {
    return 'NO_EVIDENCE'
  }

  if (!hasEvidence) return null

  for (const evText of evidenceTexts) {
    if (hasSemanticInflation(statement, evText, options?.centralQuestion)) {
      return 'SEMANTIC_INFLATION'
    }
  }

  return null
}

function mergeNearDuplicatesWithinSource(
  claims: ReasoningClaim[],
  evidenceById: Map<string, ReasoningEvidence>,
): { accepted: ReasoningClaim[]; merged: number } {
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
        kept.push(enrichClaimProvenance(claim, evidenceById))
        continue
      }
      merged++
      const evidenceIds = [...new Set([...dup.evidenceIds, ...claim.evidenceIds])]
      const better =
        claim.confidence === 'strong' && dup.confidence !== 'strong' ? claim : dup
      const idx = kept.indexOf(dup)
      kept[idx] = enrichClaimProvenance(
        {
          ...better,
          evidenceIds,
          confidence:
            better.confidence === 'strong' || claim.confidence === 'strong'
              ? 'strong'
              : better.confidence,
        },
        evidenceById,
      )
    }
    accepted.push(...kept)
  }

  return { accepted, merged }
}

export function applyClaimQualityGate(input: {
  claims: ReasoningClaim[]
  evidence: ReasoningEvidence[]
  excludedSourceIds?: Set<string>
  centralQuestion?: string
  allowMissingEvidence?: boolean
}): {
  accepted: ReasoningClaim[]
  rejected: Array<{ claim: ReasoningClaim; reason: ClaimRejectionReason }>
  stats: ClaimQualityStats
  fidelityRecords: ClaimFidelityRecord[]
} {
  const evidenceById = new Map(input.evidence.map((e) => [e.id, e]))
  const rejected: Array<{ claim: ReasoningClaim; reason: ClaimRejectionReason }> = []
  const fidelityRecords: ClaimFidelityRecord[] = []
  const stats: ClaimQualityStats = {
    rejected: 0,
    duplicatesMerged: 0,
    inflationRejected: 0,
    rhetoricalRejected: 0,
    hypeRejected: 0,
    noEvidenceRejected: 0,
    lowValueRejected: 0,
    overstatedRejected: 0,
    unsupportedFidelityRejected: 0,
    causeInferredRejected: 0,
    partiallySupportedAccepted: 0,
  }

  const preFiltered: ReasoningClaim[] = []
  for (const claim of input.claims) {
    if (input.excludedSourceIds?.has(claim.sourceId)) {
      rejected.push({ claim, reason: 'OFF_TOPIC_SOURCE' })
      stats.rejected++
      continue
    }
    const reason = assessClaimQuality(claim, evidenceById, {
      centralQuestion: input.centralQuestion,
      allowMissingEvidence: input.allowMissingEvidence,
    })
    if (reason) {
      rejected.push({ claim, reason })
      stats.rejected++
      if (reason === 'SEMANTIC_INFLATION') stats.inflationRejected++
      if (reason === 'RHETORICAL') stats.rhetoricalRejected++
      if (reason === 'HYPE') stats.hypeRejected++
      if (reason === 'NO_EVIDENCE') stats.noEvidenceRejected++
      if (reason === 'LOW_VALUE') stats.lowValueRejected++
      continue
    }

    const fidelityResult = applyFidelityGate(claim, evidenceById)
    fidelityRecords.push(fidelityResult.record)
    if ('reject' in fidelityResult) {
      rejected.push({ claim, reason: fidelityResult.reject })
      stats.rejected++
      if (fidelityResult.reject === 'OVERSTATED') stats.overstatedRejected++
      if (fidelityResult.reject === 'UNSUPPORTED_FIDELITY') stats.unsupportedFidelityRejected++
      if (fidelityResult.reject === 'CAUSE_INFERRED_WITHOUT_EVIDENCE') stats.causeInferredRejected++
      if (fidelityResult.reject === 'SCOPE_MUTATION') stats.overstatedRejected++
      if (fidelityResult.reject === 'CERTAINTY_MUTATION') stats.overstatedRejected++
      continue
    }
    if (fidelityResult.record.status === 'PARTIALLY_SUPPORTED') {
      stats.partiallySupportedAccepted++
    }
    preFiltered.push(enrichClaimProvenance(fidelityResult.claim, evidenceById))
  }

  const { accepted, merged } = mergeNearDuplicatesWithinSource(preFiltered, evidenceById)
  stats.duplicatesMerged = merged

  return { accepted, rejected, stats, fidelityRecords }
}

export function buildLockedOffTopicSourceIds(input: {
  sourceRelevance: Array<{ sourceId: string; classification: string }>
  offTopicClusters: Array<{ sourceIds: string[] }>
  legacyExcluded: Array<{ sourceId: string }>
}): Set<string> {
  const locked = new Set<string>()
  for (const r of input.sourceRelevance) {
    if (r.classification === 'off_topic') locked.add(r.sourceId)
  }
  for (const cluster of input.offTopicClusters) {
    for (const sid of cluster.sourceIds) locked.add(sid)
  }
  for (const ex of input.legacyExcluded) locked.add(ex.sourceId)
  return locked
}
