import type { SurvivalAnalysis, SurvivalClaim, SurvivalRelationship } from '@/lib/survival/types'

export type ClaimLinkItem = {
  relationship: SurvivalRelationship
  fromClaim: SurvivalClaim
  toClaim: SurvivalClaim
  fromVideoLabel: string
  toVideoLabel: string
  fromVideoTitle: string
  toVideoTitle: string
}

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'is',
  'are',
  'was',
  'were',
  'what',
  'how',
  'why',
  'when',
  'where',
  'who',
  'this',
  'that',
  'these',
  'those',
  'for',
  'with',
  'from',
  'about',
  'into',
  'should',
  'would',
  'could',
  'can',
  'will',
  'do',
  'does',
  'did',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'it',
  'its',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
])

function claimTags(claim: string, max = 3): string[] {
  const words = claim
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))

  const tags: string[] = []
  for (const word of words) {
    if (!tags.includes(word)) tags.push(word)
    if (tags.length >= max) break
  }
  return tags
}

export function extractMapTopics(survival: SurvivalAnalysis): string[] {
  const topics = new Set<string>()

  const question = survival.topicCoherence?.centralQuestion?.trim()
  if (question) topics.add(question)

  for (const item of survival.consensus) {
    if (item.title.trim()) topics.add(item.title.trim())
  }

  for (const card of [
    ...survival.landscape.agree.cards,
    ...survival.landscape.divide.cards,
    ...survival.landscape.unclear.cards,
  ]) {
    if (card.title.trim()) topics.add(card.title.trim())
  }

  for (const claim of survival.claims.slice(0, 12)) {
    for (const tag of claimTags(claim.claim, 2)) {
      topics.add(tag)
      if (topics.size >= 10) break
    }
  }

  return [...topics].slice(0, 8)
}

export function buildClaimLinkItems(survival: SurvivalAnalysis): ClaimLinkItem[] {
  const claimById = new Map(survival.claims.map((c) => [c.claimId, c]))
  const sourceById = new Map(survival.sources.map((s) => [s.sourceId, s]))

  return survival.verifiedRelationships
    .map((relationship) => {
      const fromClaim = claimById.get(relationship.fromClaimId)
      const toClaim = claimById.get(relationship.toClaimId)
      if (!fromClaim || !toClaim) return null

      const fromSource = sourceById.get(fromClaim.sourceId)
      const toSource = sourceById.get(toClaim.sourceId)

      return {
        relationship,
        fromClaim,
        toClaim,
        fromVideoLabel: String(fromClaim.voiceIndex).padStart(2, '0'),
        toVideoLabel: String(toClaim.voiceIndex).padStart(2, '0'),
        fromVideoTitle: fromSource?.title ?? '',
        toVideoTitle: toSource?.title ?? '',
      }
    })
    .filter((item): item is ClaimLinkItem => item !== null)
}

export function claimKeywordTags(claim: SurvivalClaim): string[] {
  return claimTags(claim.claim, 4)
}
