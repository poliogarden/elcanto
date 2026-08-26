import type { ReasoningClaim } from '@/lib/reasoning/types'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'

const ABSTRACTION_MARKERS = {
  high: /\b(ecosystem|landscape|industry|society|future|world|overall|in general)\b/i,
  low: /\b(this tool|this api|this feature|in this video|specifically)\b/i,
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeStatement(text)
      .split(/\W+/)
      .filter((w) => w.length > 3),
  )
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const t of a) if (b.has(t)) shared++
  return shared / Math.min(a.size, b.size)
}

function abstractionLevel(statement: string): 'high' | 'mid' | 'low' {
  if (ABSTRACTION_MARKERS.high.test(statement)) return 'high'
  if (ABSTRACTION_MARKERS.low.test(statement)) return 'low'
  return 'mid'
}

export type AlignmentResult = {
  comparable: boolean
  sameSubject: boolean
  sameDimension: boolean
  sameAbstractionLevel: boolean
  reason: string
}

export function isDiscoveryCandidate(from: ReasoningClaim, to: ReasoningClaim): AlignmentResult {
  if (from.sourceId === to.sourceId) {
    return {
      comparable: false,
      sameSubject: false,
      sameDimension: false,
      sameAbstractionLevel: false,
      reason: 'Same source — cross-source comparison not applicable.',
    }
  }

  const fromTokens = tokenSet(from.statement)
  const toTokens = tokenSet(to.statement)
  const overlap = overlapRatio(fromTokens, toTokens)
  const sharedConcepts = from.conceptIds.filter((id) => to.conceptIds.includes(id))

  const sameSubject = sharedConcepts.length > 0 || overlap >= 0.08

  const fromAbs = abstractionLevel(from.statement)
  const toAbs = abstractionLevel(to.statement)
  const sameAbstractionLevel =
    fromAbs === toAbs || fromAbs === 'mid' || toAbs === 'mid' || overlap >= 0.15

  const problemSolution =
    /\b(struggle|difficult|problem|fragmented|friction)\b/i.test(from.statement) &&
    /\b(provides|enables|simplifies|reduces|protocol|standard)\b/i.test(to.statement)
  const mechanismOutcome =
    /\b(standardizes|protocol|mechanism)\b/i.test(from.statement) &&
    /\b(less|easier|fewer|integrate)\b/i.test(to.statement)

  const sameDimension =
    sameSubject ||
    problemSolution ||
    mechanismOutcome ||
    from.claimType === to.claimType

  const comparable =
    sameSubject &&
    (sameDimension || problemSolution || mechanismOutcome) &&
    (sameAbstractionLevel || overlap >= 0.1)

  let reason = 'Claims address different questions or abstraction levels.'
  if (!sameSubject) reason = 'No shared subject or concept overlap.'
  else if (!sameAbstractionLevel && overlap < 0.1)
    reason = 'Abstraction levels differ (general vs specific).'
  else if (!sameDimension) reason = 'Same topic but different evaluative dimensions.'
  else if (!comparable) reason = 'Insufficient connection for discovery candidate.'

  return { comparable, sameSubject, sameDimension, sameAbstractionLevel, reason }
}

export function assessClaimAlignment(from: ReasoningClaim, to: ReasoningClaim): AlignmentResult {
  if (from.sourceId === to.sourceId) {
    return {
      comparable: false,
      sameSubject: false,
      sameDimension: false,
      sameAbstractionLevel: false,
      reason: 'Same source — cross-source comparison not applicable.',
    }
  }

  const fromTokens = tokenSet(from.statement)
  const toTokens = tokenSet(to.statement)
  const overlap = overlapRatio(fromTokens, toTokens)

  const sharedConcepts = from.conceptIds.filter((id) => to.conceptIds.includes(id))
  const sameSubject = sharedConcepts.length > 0 || overlap >= 0.2

  const fromAbs = abstractionLevel(from.statement)
  const toAbs = abstractionLevel(to.statement)
  const sameAbstractionLevel = fromAbs === toAbs || (fromAbs === 'mid' || toAbs === 'mid')

  const sameDimension =
    sameSubject &&
    (from.claimType === to.claimType ||
      (from.claimType !== 'descriptive' && to.claimType !== 'descriptive') ||
      overlap >= 0.35)

  const comparable = sameSubject && sameDimension && sameAbstractionLevel && overlap >= 0.08

  let reason = 'Claims address different questions or abstraction levels.'
  if (!sameSubject) reason = 'No shared subject or concept overlap.'
  else if (!sameAbstractionLevel) reason = 'Abstraction levels differ (general vs specific).'
  else if (!sameDimension) reason = 'Same topic but different evaluative dimensions.'
  else if (overlap < 0.08) reason = 'Insufficient semantic overlap for meaningful comparison.'

  return { comparable, sameSubject, sameDimension, sameAbstractionLevel, reason }
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('::')
}

export function isKeywordOnlyExplanation(explanation: string): boolean {
  const e = explanation.toLowerCase()
  return (
    /both (mention|use|discuss|share|talk about|reference)/i.test(e) &&
    !/because|however|whereas|contradict|disagree|unlike|while|although|trade|tension/i.test(
      e,
    )
  )
}
