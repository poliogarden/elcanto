import type {
  InsightType,
  RelationshipType,
  SynthesisSectionType,
  SynthesisType,
} from '@/lib/types/relationship'
import type { InsightGraphData, InsightGraphSummary } from '@/lib/types/insight-graph'
import type { Voice } from '@/lib/types/voice'

export type SourceClaimView = {
  id: string
  statement: string
  evidenceIds: string[]
}

export type SourceReasoningView = {
  sourceId: string
  title: string
  voice: number
  coreClaims: SourceClaimView[]
}

export type RelationshipView = {
  id: string
  fromClaimId: string
  toClaimId: string
  fromSourceId: string
  toSourceId: string
  fromClaim: string
  toClaim: string
  fromTitle: string
  toTitle: string
  fromVoice: number
  toVoice: number
  type: RelationshipType
  typeLabel: string
  strength: number
  strengthLabel: string
  confidence: number
  explanation: string
  isMeaningful: boolean
}

export type PatternView = {
  id: string
  label: string
  description: string
  sourceIds: string[]
  relationshipIds: string[]
  voices: number[]
  confidence: number
}

export type SectionView = {
  id: string
  section: SynthesisSectionType
  label: string
  index: string
  supportCount: number
  total: number
  statement: string
  voices: number[]
  claimIds: string[]
}

export type InsightDerivationStep = {
  kind: 'claim' | 'relationship' | 'pattern' | 'insight'
  label: string
  detail: string
}

export type InsightView = {
  id: string
  type: InsightType
  typeLabel: string
  statement: string
  derivation: string
  derivationSteps: InsightDerivationStep[]
  voices: number[]
  claimIds: string[]
  relationshipIds: string[]
  patternIds: string[]
  noveltyScore: number
  confidence: number
}

export type EvidenceView = {
  id: string
  voice: number
  youtubeId: string
  title: string
  timestamp: string
  excerpt: string
  watchUrl: string
  claimId?: string
}

export type InspectStatsView = {
  sourceCount: number
  claimsExtracted: number
  relationshipsTested: number
  meaningfulRelationships: number
  strong: number
  moderate: number
  weak: number
  independent: number
  agreements: number
  contradictions: number
  structuralParallels: number
  patterns: number
  insights: number
  rejectedInsights: number
  knowledgeGaps: number
  clusters: number
}

export type ClusterView = {
  id: string
  label: string
  topic: string
  sourceIds: string[]
  voices: number[]
  explanation: string
}

export type IntersectionView = {
  id: string
  label: string
  description: string
  kind: string
  voices: number[]
  claimIds: string[]
}

export type DifferenceView = {
  id: string
  sourceTitle: string
  voice: number
  statements: string[]
  explanation: string
}

export type ContradictionView = {
  id: string
  description: string
  voices: number[]
  strength: number
}

export type TwoSourceSetView = {
  sourceA: { id: string; title: string; voice: number }
  sourceB: { id: string; title: string; voice: number }
  onlyA: DifferenceView[]
  onlyB: DifferenceView[]
  shared: IntersectionView[]
  contradictions: ContradictionView[]
}

export type KnowledgeGapView = {
  id: string
  question: string
  description: string
  voices: number[]
}

export type RecommendationView = {
  id: string
  type: string
  typeLabel: string
  searchQuery: string
  title: string
  reason: string
  voices: number[]
}

export type RejectedInsightView = {
  id: string
  statement: string
  reasons: string[]
}

export type UnderstandingChangeView = {
  before: string
  after: string
  changedAt: string
  trigger: string
}

export type FourthIdeaView = {
  id: string
  statement: string
  explanation: string
  voices: number[]
  derivationSteps: InsightDerivationStep[]
  noveltyScore: number
  specificityScore: number
  confidence: number
}

export type WhatNextView = {
  question: string
  description: string
  recommendationTitle?: string
  recommendationReason?: string
  searchQuery?: string
}

export type TheAnswerView = {
  paragraphs: string[]
  metadataLine: string
}

export type ThemeEvidenceView = {
  claimId: string
  statement: string
  voice: number
  sourceTitle: string
  thumbnail?: string
  timestamp?: string
  watchUrl?: string
}

export type ThemeView = {
  id: string
  index: string
  title: string
  description: string
  synthesisSentence: string
  voices: number[]
  sourceTitles: string[]
  thumbnails: string[]
  claimIds: string[]
  evidence: ThemeEvidenceView[]
  importance: number
}

export type EditorialSideView = {
  label: string
  voice: number
  sourceId: string
  title: string
  statement: string
  claimId: string
  thumbnail?: string
}

export type EditorialComparisonView = {
  id: string
  kind: 'agreement' | 'disagreement'
  title: string
  sideA: EditorialSideView
  sideB: EditorialSideView
  whyItMatters: string
  relationshipId: string
  claimIds: string[]
}

export type FindingView = {
  id: string
  title: string
  explanation: string
  kind: string
  voices: number[]
  claimIds: string[]
  confidence: number
}

export type WorkspaceMode = 'single' | 'pair' | 'small' | 'cluster'

export type SynthesisViewModel = {
  id: string
  number: string
  question: string
  synthesisType: SynthesisType
  synthesisTypeLabel: string
  workspaceMode: WorkspaceMode
  voiceCount: number
  readyVoiceCount: number
  totalDuration: string
  date: string

  bottomLineLabel: string
  bottomLineHeadline: string[]
  bottomLine: string[]
  emergentStatement: string
  noStrongIntersection: boolean
  noStrongRelationship: boolean

  sourceReasoning: SourceReasoningView[]
  relationships: RelationshipView[]
  meaningfulRelationships: RelationshipView[]
  independentRelationships: RelationshipView[]
  patterns: PatternView[]
  clusters: ClusterView[]

  twoSourceView: TwoSourceSetView | null
  intersections: IntersectionView[]
  differences: DifferenceView[]
  contradictions: ContradictionView[]

  sections: SectionView[]
  insights: InsightView[]
  knowledgeGaps: KnowledgeGapView[]
  recommendations: RecommendationView[]
  rejectedInsights: RejectedInsightView[]
  evidence: EvidenceView[]
  inspectStats: InspectStatsView

  fourthIdea: FourthIdeaView | null
  understandingChange: UnderstandingChangeView | null
  whatNext: WhatNextView | null

  theAnswer: TheAnswerView
  themes: ThemeView[]
  editorialAgreements: EditorialComparisonView[]
  editorialDisagreements: EditorialComparisonView[]
  findings: FindingView[]
  questionsWorthAsking: KnowledgeGapView[]
  allEvidence: EvidenceView[]

  voices: Voice[]
  suggestedQuestions: string[]

  insightGraph: InsightGraphData | null
  graphSummary: InsightGraphSummary
}
