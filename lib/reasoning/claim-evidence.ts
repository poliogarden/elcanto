import { isHypeClaim } from '@/lib/reasoning/claim-quality'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'

export type ClaimEvidenceStatus =
  | 'DIRECT_EVIDENCE'
  | 'PARAPHRASE_SUPPORTED'
  | 'CONTEXT_SUPPORTED'
  | 'NO_EVIDENCE'

export type ClaimEvidenceSpan = {
  segmentId: string
  startTime: number
  endTime: number | null
  originalText: string
  evidenceType: Exclude<ClaimEvidenceStatus, 'NO_EVIDENCE'>
  supportScore: number
}

const DISCUSSION_META =
  /\b(discussed everywhere|major discussions|hot topic|talking about|generated major|being talked about|rise of)\b/i

const EVALUATIVE_INFLATION =
  /\b(transformative|game[- ]?changer|revolutioniz|fundamental shift|dominant|inevitable|highly significant|transform the)\b/i

function tokenOverlapRatio(a: string, b: string): number {
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

export function isAbstractClaimInflation(claimText: string, evidenceText: string): boolean {
  const claim = claimText.trim()
  const evidence = evidenceText.trim()
  if (!claim || !evidence) return true

  if (isHypeClaim(claim) && !isHypeClaim(evidence) && !EVALUATIVE_INFLATION.test(evidence)) {
    return true
  }

  if (EVALUATIVE_INFLATION.test(claim) && !EVALUATIVE_INFLATION.test(evidence)) {
    return true
  }

  if (DISCUSSION_META.test(evidence) && EVALUATIVE_INFLATION.test(claim)) {
    return true
  }

  const claimNorm = normalizeStatement(claim)
  const evNorm = normalizeStatement(evidence)
  if (claimNorm.length > evNorm.length * 2.5 && tokenOverlapRatio(claim, evidence) < 0.2) {
    return true
  }

  return false
}

export function classifyEvidenceSupport(
  claimText: string,
  evidenceText: string,
): {
  status: ClaimEvidenceStatus
  evidenceType?: ClaimEvidenceSpan['evidenceType']
  supportScore: number
} {
  if (!evidenceText.trim()) {
    return { status: 'NO_EVIDENCE', supportScore: 0 }
  }

  if (isAbstractClaimInflation(claimText, evidenceText)) {
    return { status: 'NO_EVIDENCE', supportScore: 0 }
  }

  const overlap = tokenOverlapRatio(claimText, evidenceText)
  const claimNorm = normalizeStatement(claimText)
  const evNorm = normalizeStatement(evidenceText)
  const contained =
    evNorm.includes(claimNorm.slice(0, Math.min(claimNorm.length, 48))) ||
    claimNorm.includes(evNorm.slice(0, Math.min(evNorm.length, 48)))

  if (overlap >= 0.45 || contained) {
    return { status: 'DIRECT_EVIDENCE', evidenceType: 'DIRECT_EVIDENCE', supportScore: overlap }
  }
  if (overlap >= 0.22) {
    return {
      status: 'PARAPHRASE_SUPPORTED',
      evidenceType: 'PARAPHRASE_SUPPORTED',
      supportScore: overlap,
    }
  }
  if (overlap >= 0.08) {
    return {
      status: 'CONTEXT_SUPPORTED',
      evidenceType: 'CONTEXT_SUPPORTED',
      supportScore: overlap,
    }
  }

  return { status: 'NO_EVIDENCE', supportScore: overlap }
}

export function isReasoningEligible(status: ClaimEvidenceStatus): boolean {
  return status !== 'NO_EVIDENCE'
}

export function mergeEvidenceStatus(
  statuses: ClaimEvidenceStatus[],
): ClaimEvidenceStatus {
  if (statuses.length === 0) return 'NO_EVIDENCE'
  if (statuses.some((s) => s === 'DIRECT_EVIDENCE')) return 'DIRECT_EVIDENCE'
  if (statuses.some((s) => s === 'PARAPHRASE_SUPPORTED')) return 'PARAPHRASE_SUPPORTED'
  if (statuses.some((s) => s === 'CONTEXT_SUPPORTED')) return 'CONTEXT_SUPPORTED'
  return 'NO_EVIDENCE'
}

export function buildEvidenceSpan(input: {
  segmentId: string
  startTime: number
  endTime: number | null
  originalText: string
  claimText: string
}): ClaimEvidenceSpan | null {
  const classified = classifyEvidenceSupport(input.claimText, input.originalText)
  if (classified.status === 'NO_EVIDENCE' || !classified.evidenceType) return null
  return {
    segmentId: input.segmentId,
    startTime: input.startTime,
    endTime: input.endTime,
    originalText: input.originalText,
    evidenceType: classified.evidenceType,
    supportScore: classified.supportScore,
  }
}
