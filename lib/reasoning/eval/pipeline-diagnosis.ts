import type { BenchmarkGoldExpectations } from '@/lib/reasoning/eval/benchmark-gold'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'

export function diagnosePipelineStageFailures(
  reasoning: MultiSourceReasoning | null,
  gold: BenchmarkGoldExpectations,
): string[] {
  if (!reasoning) return ['Pipeline produced no reasoning output.']

  const notes: string[] = []
  const stats = reasoning.diagnostics?.pipelineStats
  const bundle = reasoning.diagnostics?.verificationDiagnosticsBundle
  const rejected = reasoning.rejectedRelationships ?? []

  if (stats?.candidatePairs === 0) {
    notes.push(
      'BLOCKER: No candidate pairs generated — failure likely in relevance funnel, comparable claim pool, or candidate discovery.',
    )
    return notes
  }

  if ((stats?.verifiedRelationships ?? 0) === 0 && (stats?.candidatePairs ?? 0) > 0) {
    const audit = bundle?.candidateAudit ?? []
    const goldPairAudits = audit.filter((row) => {
      const sources = [row.sourceA, row.sourceB].sort().join('|')
      for (const g of gold.expectedRelationships) {
        const expected = [...g.sources].sort().join('|')
        if (sources === expected) return true
      }
      return false
    })

    if (goldPairAudits.length > 0) {
      for (const row of goldPairAudits) {
        notes.push(
          `Gold pair ${row.sourceA}↔${row.sourceB}: candidate reached ${row.verificationStage ?? 'verification'} → ${row.verificationResult} (${row.verificationRejectionReason ?? 'no reason'}). ${row.verificationDetail ?? ''}`.trim(),
        )
      }
    } else {
      const topReject = rejected[0]
      if (topReject) {
        notes.push(
          `No verified relationships; sample rejection: ${topReject.type} ${topReject.fromSourceId}↔${topReject.toSourceId} → ${topReject.rejectionReason ?? topReject.verificationStatus}.`,
        )
      } else if (audit.length > 0) {
        const row = audit[0]
        notes.push(
          `No verified relationships; sample candidate ${row.sourceA}↔${row.sourceB} rejected at ${row.verificationStage} (${row.verificationRejectionReason}).`,
        )
      } else {
        notes.push('Candidates existed but none verified; verification diagnostics unavailable.')
      }
    }
  }

  const warnings = reasoning.diagnostics?.pipelineWarnings ?? []
  for (const w of warnings) {
    if (w.code === 'CANDIDATE_VERIFICATION_COLLAPSE') {
      notes.push('Verification collapse warning emitted during pipeline.')
    }
    if (w.code === 'EVIDENCE_INTEGRITY_VIOLATION') {
      notes.push('Evidence integrity violation warning emitted during pipeline.')
    }
  }

  return notes
}
