import { ingestSourceUnderstanding, normalizeStatement } from '@/lib/reasoning/source-ingest'
import type { ReasoningClaim } from '@/lib/reasoning/types'
import type { SourceAnalysis } from '@/lib/types/source'
import { EXTRACTION_RECOVERY_MAX_ATTEMPTS } from '@/lib/reasoning/v2/engine-config'

export type ExtractionRecoveryDiagnostic = {
  code: 'EXTRACTION_RECOVERY_APPLIED' | 'EXTRACTION_RECOVERY_FAILED' | 'EXTRACTION_DEGRADED'
  message: string
  sourceId?: string
  claimsBefore: number
  claimsAfter: number
}

function hasAssertiveContent(source: SourceAnalysis): boolean {
  const text = [
    source.thesis,
    source.summary,
    ...source.claims.map((c) => c.statement),
    ...(source.videoKnowledge?.sections ?? []).map((s) => s.text ?? s.summary),
  ]
    .filter(Boolean)
    .join(' ')
  return text.trim().length >= 40 && /\b(is|are|has|have|shows?|reduces?|increases?|causes?|found|report)\b/i.test(text)
}

/** Re-ingest structured claims from SourceAnalysis when high-signal filter removed everything. */
export function recoverClaimsFromStructuredSources(
  sources: SourceAnalysis[],
  filteredClaims: ReasoningClaim[],
): {
  claims: ReasoningClaim[]
  diagnostics: ExtractionRecoveryDiagnostic[]
} {
  if (filteredClaims.length > 0) {
    return { claims: filteredClaims, diagnostics: [] }
  }

  const diagnostics: ExtractionRecoveryDiagnostic[] = []
  const structuredTotal = sources.reduce((n, s) => n + s.claims.length, 0)
  if (structuredTotal === 0) {
    for (const source of sources) {
      if (hasAssertiveContent(source)) {
        diagnostics.push({
          code: 'EXTRACTION_DEGRADED',
          message: `Source ${source.sourceId} has assertive content but no structured claims.`,
          sourceId: source.sourceId,
          claimsBefore: 0,
          claimsAfter: 0,
        })
      }
    }
    return { claims: filteredClaims, diagnostics }
  }

  const reinjected = ingestSourceUnderstanding(sources).claims.filter(
    (c) => c.statement.trim().length >= 12,
  )

  if (reinjected.length > 0) {
    diagnostics.push({
      code: 'EXTRACTION_RECOVERY_APPLIED',
      message: `Recovered ${reinjected.length} claims from structured SourceAnalysis after high-signal filter returned 0.`,
      claimsBefore: 0,
      claimsAfter: reinjected.length,
    })
    return { claims: reinjected, diagnostics }
  }

  diagnostics.push({
    code: 'EXTRACTION_RECOVERY_FAILED',
    message: `Structured sources had ${structuredTotal} claims but reinjection yielded 0.`,
    claimsBefore: 0,
    claimsAfter: 0,
  })
  return { claims: filteredClaims, diagnostics }
}

export function dedupeClaimsByStatement(claims: ReasoningClaim[]): ReasoningClaim[] {
  const seen = new Set<string>()
  const out: ReasoningClaim[] = []
  for (const claim of claims) {
    const key = normalizeStatement(claim.statement)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(claim)
  }
  return out
}

export function extractionRecoveryWithinLimit(attempt: number): boolean {
  return attempt < EXTRACTION_RECOVERY_MAX_ATTEMPTS
}
