import type { ReasoningEvalSnapshot } from '@/lib/reasoning/eval/types'
import type { MultiSourceReasoning, ReasoningClaim } from '@/lib/reasoning/types'

export type InvariantStatus = 'PASS' | 'FAIL' | 'WARN'

export type InvariantCheck = {
  name: string
  status: InvariantStatus
  detail?: string
}

function claimById(reasoning: MultiSourceReasoning): Map<string, ReasoningClaim> {
  return new Map(reasoning.claims.map((c) => [c.id, c]))
}

function evidenceLabel(claim: ReasoningClaim | undefined): string {
  if (!claim) return 'NO_EVIDENCE'
  const span = claim.evidenceSpans?.[0]
  if (span?.originalText) return span.originalText.slice(0, 200)
  if (claim.evidenceText) return claim.evidenceText.slice(0, 200)
  if (claim.evidenceIds.length === 0) return 'NO_EVIDENCE'
  return claim.evidenceIds.join(',')
}

function fmtTime(seconds: number | undefined | null): string {
  if (seconds == null || Number.isNaN(seconds)) return 'N/A'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function runInvariantChecks(snapshot: ReasoningEvalSnapshot): InvariantCheck[] {
  const reasoning = snapshot.reasoning
  if (!reasoning) {
    return [
      {
        name: 'Pipeline produced reasoning output',
        status: 'FAIL',
        detail: snapshot.meta.pipelineError ?? 'No reasoning result',
      },
    ]
  }

  const checks: InvariantCheck[] = []
  const d = reasoning.diagnostics
  const stats = d.pipelineStats
  const warnings = d.pipelineWarnings ?? []

  const generationNoEvidence = d.evidenceCoverage?.generationNoEvidence ?? 0
  checks.push({
    name: 'Evidence integrity (generationEligible without NO_EVIDENCE)',
    status: generationNoEvidence === 0 ? 'PASS' : 'FAIL',
    detail:
      generationNoEvidence === 0
        ? undefined
        : `${generationNoEvidence} generation claim(s) with NO_EVIDENCE`,
  })

  const sameSourceVerified = reasoning.relationships.filter(
    (r) => r.fromSourceId === r.toSourceId,
  )
  checks.push({
    name: 'Cross-source requirement (verified pairs are cross-source)',
    status: sameSourceVerified.length === 0 ? 'PASS' : 'FAIL',
    detail:
      sameSourceVerified.length > 0
        ? `${sameSourceVerified.length} same-source verified pair(s)`
        : undefined,
  })

  const claims = claimById(reasoning)
  const missingClaimLineage = reasoning.relationships.filter(
    (r) => !claims.get(r.fromClaimId) || !claims.get(r.toClaimId),
  )
  checks.push({
    name: 'Verified relationship claim lineage',
    status: missingClaimLineage.length === 0 ? 'PASS' : 'FAIL',
    detail:
      missingClaimLineage.length > 0
        ? `${missingClaimLineage.length} verified pair(s) missing claim refs`
        : undefined,
  })

  const missingSourceLineage = reasoning.relationships.filter((r) => {
    const a = claims.get(r.fromClaimId)
    const b = claims.get(r.toClaimId)
    return !a?.sourceId || !b?.sourceId || a.sourceId === b.sourceId
  })
  checks.push({
    name: 'Verified relationship source lineage',
    status:
      missingSourceLineage.length === 0 && reasoning.relationships.length > 0
        ? 'PASS'
        : reasoning.relationships.length === 0
          ? 'WARN'
          : 'FAIL',
    detail:
      reasoning.relationships.length === 0
        ? 'No verified relationships to check'
        : missingSourceLineage.length > 0
          ? `${missingSourceLineage.length} invalid source lineage`
          : undefined,
  })

  const propositions = d.judgmentPropositionLineage ?? []
  const unsupportedProps = propositions.filter(
    (p) => p.supportStatus === 'UNSUPPORTED' || p.relationshipIds.length === 0,
  )
  checks.push({
    name: 'Judgment proposition lineage',
    status:
      !reasoning.judgment
        ? 'WARN'
        : unsupportedProps.length === 0
          ? 'PASS'
          : 'WARN',
    detail:
      !reasoning.judgment
        ? 'No judgment generated'
        : unsupportedProps.length > 0
          ? `${unsupportedProps.length} weak/unsupported proposition(s)`
          : undefined,
  })

  const relevantRemoved = warnings.some(
    (w) =>
      w.code === 'SOURCE_PARTICIPATION_COLLAPSE' ||
      w.code === 'ABNORMAL_RELEVANCE_COLLAPSE',
  )
  checks.push({
    name: 'Source participation (relevant sources in generation)',
    status: relevantRemoved ? 'WARN' : 'PASS',
    detail: relevantRemoved ? 'Participation or relevance collapse warning' : undefined,
  })

  const candidateCollapse = warnings.some((w) => w.code === 'CROSS_SOURCE_CANDIDATE_COLLAPSE')
  checks.push({
    name: 'Candidate collapse',
    status: candidateCollapse ? 'WARN' : 'PASS',
    detail: candidateCollapse ? 'CROSS_SOURCE_CANDIDATE_COLLAPSE fired' : undefined,
  })

  const verificationCollapse = warnings.some((w) => w.code === 'CANDIDATE_VERIFICATION_COLLAPSE')
  checks.push({
    name: 'Verification collapse',
    status: verificationCollapse ? 'WARN' : 'PASS',
    detail: verificationCollapse ? 'CANDIDATE_VERIFICATION_COLLAPSE fired' : undefined,
  })

  const integrityViolation = warnings.some((w) => w.code === 'EVIDENCE_INTEGRITY_VIOLATION')
  checks.push({
    name: 'EVIDENCE_INTEGRITY_VIOLATION warnings',
    status: integrityViolation ? 'FAIL' : 'PASS',
  })

  if (stats?.verifiedRelationships === 0 && (stats?.candidatePairs ?? 0) >= 5) {
    checks.push({
      name: 'Verification yield (candidates vs verified)',
      status: 'WARN',
      detail: `${stats?.candidatePairs} candidates, 0 verified`,
    })
  }

  return checks
}

export function formatEvidenceForReport(
  claim: ReasoningClaim | undefined,
  evidenceById: Map<string, { text: string; timestampStart: number }>,
): { text: string; timestamp: string } {
  if (!claim) return { text: 'NO_EVIDENCE', timestamp: 'N/A' }
  const span = claim.evidenceSpans?.[0]
  if (span) {
    return {
      text: span.originalText,
      timestamp: fmtTime(span.startTime),
    }
  }
  const evId = claim.evidenceIds[0]
  const ev = evId ? evidenceById.get(evId) : undefined
  if (ev) {
    return { text: ev.text, timestamp: fmtTime(ev.timestampStart) }
  }
  if (claim.evidenceText) {
    return {
      text: claim.evidenceText,
      timestamp: fmtTime(claim.timestampStart),
    }
  }
  return { text: 'NO_EVIDENCE', timestamp: 'N/A' }
}
