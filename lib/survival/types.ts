export type ConfidenceLevel = 'strong' | 'moderate' | 'weak'

export type SurvivalRelationshipType =
  | 'AGREEMENT'
  | 'PARTIAL_AGREEMENT'
  | 'COMPLEMENTARY'
  | 'DISAGREEMENT'
  | 'CONTRADICTION'
  | 'INDEPENDENT'

export type SurvivalClaim = {
  claimId: string
  videoId: string
  sourceId: string
  voiceIndex: number
  claim: string
  evidence: string
  timestamp: number | null
  confidence: ConfidenceLevel
}

export type SurvivalRelationship = {
  id: string
  fromClaimId: string
  toClaimId: string
  fromVideoId: string
  toVideoId: string
  type: SurvivalRelationshipType
  explanation: string
  confidence: ConfidenceLevel
}

export type RejectedRelationship = {
  fromClaimId: string
  toClaimId: string
  proposedType: SurvivalRelationshipType
  reason: string
}

export type SourcePosition = {
  videoId: string
  sourceId: string
  voiceIndex: number
  title: string
  channel: string
  thumbnail?: string
  position: string
  includedInSynthesis?: boolean
  relevance?: 'on_topic' | 'off_topic' | 'partial'
}

export type ConsensusItem = {
  id: string
  title: string
  oneLineSummary: string
  supportingVideoIds: string[]
  confidence: ConfidenceLevel
}

export type DisagreementSide = {
  label: string
  videoIds: string[]
  claimText?: string
  claimId?: string
  sourceIds?: string[]
}

export type DisagreementItem = {
  id: string
  title: string
  oneLineSummary: string
  sideA: DisagreementSide
  sideB: DisagreementSide
  confidence: ConfidenceLevel
}

export type UncertainClaim = {
  claimId: string
  videoId: string
  claim: string
  signal: 'needs_evidence' | 'weakly_supported' | 'contested' | 'strongly_supported'
  reason: string
}

export type SurvivalSynthesis = {
  headline: string
  explanation: string
  confidence: ConfidenceLevel
  judgmentBasis?: string
}

export type EmergentInsight = {
  id: string
  statement: string
  reasoningPath: Array<{
    step: 'claim' | 'relationship'
    refId: string
    label: string
  }>
  confidence: ConfidenceLevel
}

export type KnowledgeGap = {
  id: string
  question: string
}

export type LandscapeCard = {
  id: string
  title: string
  summary: string
  claimIds?: string[]
  relationshipIds?: string[]
}

export type SurvivalLandscape = {
  agree: { countLabel: string; cards: LandscapeCard[] }
  divide: { countLabel: string; cards: LandscapeCard[] }
  unclear: { countLabel: string; cards: LandscapeCard[] }
}

export type SourceCoherenceAssessment = {
  sourceId: string
  videoId?: string
  voiceIndex?: number
  relevance: 'on_topic' | 'partial' | 'off_topic'
  reason: string
}

export type TopicCoherence = {
  centralQuestion: string
  coherenceLevel: 'high' | 'moderate' | 'low'
  assessments: SourceCoherenceAssessment[]
}

export type ExcludedSource = {
  sourceId: string
  videoId: string
  voiceIndex: number
  title: string
  thumbnail?: string
  reason: string
}

export type SurvivalAnalysis = {
  version: string
  topicCoherence?: TopicCoherence
  excludedSources?: ExcludedSource[]
  submittedVideoCount?: number
  analyzedVideoCount?: number
  excludedVideoCount?: number
  sources: SourcePosition[]
  claims: SurvivalClaim[]
  verifiedRelationships: SurvivalRelationship[]
  rejectedRelationships: RejectedRelationship[]
  consensus: ConsensusItem[]
  disagreements: DisagreementItem[]
  uncertainClaims: UncertainClaim[]
  synthesis: SurvivalSynthesis
  emergentInsights: EmergentInsight[]
  emergentInsightMissing: boolean
  knowledgeGaps: KnowledgeGap[]
  landscape: SurvivalLandscape
  createdAt: string
}

export type SurvivalAskAnswer = {
  answer: string
  supportedByVideoIds: string[]
  why: string[]
  evidenceRefs: Array<{ claimId: string; videoId: string; excerpt: string }>
}
