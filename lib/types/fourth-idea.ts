import type { Insight } from '@/lib/types/relationship'
import type { RejectedInsight } from '@/lib/types/knowledge'

export type FourthIdeaDerivation = {
  sourceId: string
  claimId?: string
  claimStatement: string
}

/** Emergent insight visible only when sources are compared together. */
export type FourthIdea = {
  id: string
  statement: string
  explanation: string
  sourceIds: string[]
  claimIds: string[]
  relationshipIds: string[]
  patternIds: string[]
  noveltyScore: number
  specificityScore: number
  confidence: number
  derivationSummary: string
  /** True when insight depends on 2+ sources */
  multiSourceDependency?: boolean
  derivedFrom?: FourthIdeaDerivation[]
  whyNovel?: string
  counterArgument?: string
  questionsToExplore?: string[]
}

export type FourthIdeaCandidate = FourthIdea & {
  selected: boolean
  rejectReasons?: string[]
}

export type UnderstandingChange = {
  before: string
  after: string
  changedAt: string
  trigger: 'new_source' | 're_synthesis' | 'instruction'
}

export type FourthIdeaSelection = {
  fourthIdea: FourthIdea | null
  candidates: FourthIdeaCandidate[]
  rejected: RejectedInsight[]
  noStrongRelationship: boolean
}
