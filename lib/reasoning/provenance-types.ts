/** How strongly a statement is grounded in source evidence. */
export type ReasoningLevel = 'SUPPORTED' | 'SYNTHESIZED' | 'INFERRED'

export type TimestampAvailability = 'available' | 'unavailable'

export type EvidenceRef = {
  evidenceId: string
  claimId?: string
  sourceId: string
  videoId: string
  text: string
  timestampStart: number | null
  timestampEnd: number | null
  timestampAvailability: TimestampAvailability
}

export type ClaimProvenance = {
  sourceId: string
  videoId: string
  voiceIndex: number
  evidenceRefs: EvidenceRef[]
  relevanceTier?: string
  reasoningLevel: ReasoningLevel
}

export type RelationshipProvenance = {
  claimIds: string[]
  sourceIds: string[]
  evidenceRefs: EvidenceRef[]
  crossSource: boolean
  reasoningLevel: ReasoningLevel
}

export type JudgmentProvenance = {
  reasoningLevel: ReasoningLevel
  basedOnRelationshipIds: string[]
  basedOnPatternIds: string[]
  basedOnClaimIds: string[]
  sourceIds: string[]
}

export type EmergentProvenance = {
  derivedFromClaimIds: string[]
  derivedFromRelationshipIds: string[]
  sourceIds: string[]
  reasoningLevel: ReasoningLevel
  inferenceType?: string
}

export const ANALYSIS_SCHEMA_VERSION = 3
