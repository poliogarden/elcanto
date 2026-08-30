import { assessGenericness } from '@/lib/reasoning/relationship-semantics'
import type { ReasoningClaim } from '@/lib/reasoning/types'

export type ClaimShapeIssue =
  | 'MALFORMED'
  | 'CONTEXT_INCOMPLETE'
  | 'TRANSCRIPT_FRAGMENT'
  | 'GENERIC_CROSS_SOURCE_ANCHOR'
  | 'NONE'

const FRAGMENT_MARKERS =
  /\b(speaker observes|that we live in|we're not going to get|going to get a chance)\b/i
const INCOMPLETE_END = /\b(in|of|to|the|a|an|and|but|or|that|we|you)\s*\.?$/i
const VERY_SHORT = /^.{0,25}$/

const GENERIC_ANCHOR_PATTERNS = [
  /\b(this is a complicated world|complicated world)\b/i,
  /\bpeople experience failure\b/i,
  /\bmarketing is about values\b/i,
  /\bsuccess requires adaptation\b/i,
  /\bcompetition occurs\b/i,
  /\bfailure is\b/i,
  /\bresilience\b/i,
  /\badaptation\b/i,
  /\bdebate is one of the arenas\b/i,
  /\bfind the thing (they|you) are\b/i,
  /\byou're right about\b/i,
]

export function detectClaimShapeIssue(claim: ReasoningClaim): ClaimShapeIssue {
  const text = claim.statement.trim()
  if (!text || text.length < 12) return 'MALFORMED'
  if (VERY_SHORT.test(text) && !/\d/.test(text)) return 'MALFORMED'
  if (FRAGMENT_MARKERS.test(text)) return 'TRANSCRIPT_FRAGMENT'
  if (INCOMPLETE_END.test(text) && text.length < 80) return 'CONTEXT_INCOMPLETE'
  if (/^the speaker (observes|notes|says)?:?\s*$/i.test(text)) return 'TRANSCRIPT_FRAGMENT'

  const words = text.split(/\s+/)
  if (words.length < 4 && !/\d/.test(text)) return 'CONTEXT_INCOMPLETE'

  return 'NONE'
}

export function isGenericCrossSourceAnchor(
  claim: ReasoningClaim,
  questionAsksGeneric?: boolean,
): boolean {
  if (questionAsksGeneric) return false
  const text = claim.statement
  if (GENERIC_ANCHOR_PATTERNS.some((re) => re.test(text))) return true
  const generic = assessGenericness(text)
  return generic.generic && generic.score >= 0.55
}

export function isCrossSourceRelationshipEligibleClaim(
  claim: ReasoningClaim,
  questionAsksGeneric?: boolean,
): { eligible: boolean; issue?: ClaimShapeIssue } {
  const shape = detectClaimShapeIssue(claim)
  if (shape !== 'NONE') return { eligible: false, issue: shape }
  if (isGenericCrossSourceAnchor(claim, questionAsksGeneric)) {
    return { eligible: false, issue: 'GENERIC_CROSS_SOURCE_ANCHOR' }
  }
  return { eligible: true }
}
