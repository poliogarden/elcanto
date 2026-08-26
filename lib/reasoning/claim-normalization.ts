import { isHypeClaim, isRhetoricalClaim } from '@/lib/reasoning/claim-quality'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'
import type { ClaimRole, ReasoningClaim } from '@/lib/reasoning/types'

const PROCEDURAL =
  /\b(click|select|open|navigate|press|type|enter|scroll|tap|drag|copy|paste|paste your|go to|step \d|first you|then you|users should|you should|you need to|in the middle of the screen|api key is displayed)\b/i

const ANECDOTAL =
  /\b(i remember|in my experience|my team|we tried|personally|story|anecdote|one time)\b/i

const EXAMPLE = /\b(for example|for instance|such as|e\.g\.|like when|one example)\b/i

const PREDICTION = /\b(will|likely|expect|predict|forecast|going to|within \d+ years?)\b/i

const OPINION = /\b(i think|i believe|in my view|seems like|probably|might be)\b/i

const CONTEXT = /\b(background|historically|originally|overview|introduction to|what is)\b/i

export function classifyClaimRole(statement: string): ClaimRole {
  const s = statement.trim()
  if (isHypeClaim(s)) return 'OPINION'
  if (isRhetoricalClaim(s)) return 'ANECDOTAL'
  if (PROCEDURAL.test(s)) return 'PROCEDURAL'
  if (ANECDOTAL.test(s)) return 'ANECDOTAL'
  if (EXAMPLE.test(s) && s.split(/\s+/).length < 20) return 'EXAMPLE'
  if (PREDICTION.test(s)) return 'PREDICTION'
  if (OPINION.test(s)) return 'OPINION'
  if (CONTEXT.test(s) && s.split(/\s+/).length < 15) return 'CONTEXT'
  if (/\b(because|therefore|implies|suggests|argues that|demonstrates that)\b/i.test(s)) {
    return 'CORE_ARGUMENT'
  }
  if (/\b(standardizes|reduces|simplifies|enables|provides|creates)\b/i.test(s)) {
    return 'CORE_ARGUMENT'
  }
  if (/\b(supports|backs|reinforces|also|additionally|further)\b/i.test(s)) {
    return 'SUPPORTING_ARGUMENT'
  }
  if (/\b(is|are|was|were|has|have|contains|includes)\b/i.test(s)) return 'FACT'
  return 'SUPPORTING_ARGUMENT'
}

const REASONING_ROLES: ReadonlySet<ClaimRole> = new Set([
  'CORE_ARGUMENT',
  'SUPPORTING_ARGUMENT',
  'FACT',
])

export function normalizeClaimRoles(claims: ReasoningClaim[]): ReasoningClaim[] {
  return claims.map((claim) => ({
    ...claim,
    role: claim.role ?? classifyClaimRole(claim.statement),
  }))
}

export function isReasoningCandidate(
  claim: ReasoningClaim,
  centralQuestion?: string,
): boolean {
  const role = claim.role ?? classifyClaimRole(claim.statement)
  if (REASONING_ROLES.has(role)) return true
  if (role === 'PROCEDURAL' && centralQuestion) {
    const q = normalizeStatement(centralQuestion)
    const tokens = q.split(/\W+/).filter((w) => w.length > 3)
    const statement = normalizeStatement(claim.statement)
    return tokens.some((t) => statement.includes(t))
  }
  return false
}

export function filterReasoningClaims(
  claims: ReasoningClaim[],
  centralQuestion?: string,
): ReasoningClaim[] {
  const normalized = normalizeClaimRoles(claims)
  return normalized.filter((c) => isReasoningCandidate(c, centralQuestion))
}
