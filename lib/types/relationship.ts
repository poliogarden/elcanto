export type RelationshipType =
  | 'agreement'
  | 'partial_agreement'
  | 'disagreement'
  | 'complementary'
  | 'structural_parallel'
  | 'shared_topic'
  | 'independent'

export type StructuredClaim = {
  id: string
  sourceId: string
  statement: string
  topic: string
  confidence: number
  /** Why the speaker believes this claim */
  reasoning?: string
  /** Transcript-based support summary */
  evidenceSummary?: string
  /** Section or segment id from transcript analysis */
  sourceSegmentId?: string
  evidenceSegmentIds?: string[]
  segmentStartTime?: number
  segmentEndTime?: number | null
}

export type Entity = {
  id: string
  name: string
  type: string
}

/** Claim-pair relationship — primary reasoning artifact */
export type ClaimRelationship = {
  id: string
  fromClaimId: string
  toClaimId: string
  fromSourceId: string
  toSourceId: string
  type: RelationshipType
  strength: number
  confidence: number
  explanation: string
}

/** @deprecated — legacy source-level relationship */
export type Relationship = {
  id: string
  sourceIds: string[]
  claimIds: string[]
  type: RelationshipType
  topic: string
  explanation: string
  strength: number
  confidence: number
}

export type SourceCluster = {
  id: string
  label: string
  topic: string
  sourceIds: string[]
  explanation: string
}

export type RelationshipGraph = {
  relationships: ClaimRelationship[]
  clusters: SourceCluster[]
  independentSourceIds: string[]
  stats: RelationshipStats
}

export type RelationshipStats = {
  tested: number
  strong: number
  moderate: number
  weak: number
  independent: number
}

export type SourceReasoning = {
  sourceId: string
  title: string
  coreClaims: Array<{
    id: string
    statement: string
    evidenceIds: string[]
  }>
}

export type CrossSourcePattern = {
  id: string
  label: string
  description: string
  relationshipIds: string[]
  sourceIds: string[]
  confidence: number
}

export type SynthesisType =
  | 'strong_consensus'
  | 'mixed'
  | 'divergent'
  | 'clustered'
  | 'mostly_independent'

export type SynthesisSectionType =
  | 'agreement'
  | 'disagreement'
  | 'shared_thread'
  | 'different_directions'
  | 'unique_view'
  | 'hidden_connection'

export type SynthesisPoint = {
  id: string
  section: SynthesisSectionType
  label: string
  statement: string
  sourceIds: string[]
  claimIds: string[]
  supportCount: number
  totalSources: number
  confidence: number
}

export type SynthesisFindingItem = {
  finding: string
  explanation: string
  supportingSourceIds: string[]
}

export type SynthesisTension = {
  issue: string
  explanation: string
}

export type SynthesisConclusion = {
  synthesisType: SynthesisType
  topic: string
  bottomLine: string
  bottomLineHeadline?: string[]
  overallConclusion: string
  emergentStatement: string
  sections: SynthesisPoint[]
  usedSourceIds: string[]
  sourceContributions: Array<{ sourceId: string; contribution: string }>
  noStrongRelationship: boolean
  /** Multi-paragraph reasoning chain (Stage 3) */
  integratedReasoning?: string
  keyFindings?: SynthesisFindingItem[]
  tensions?: SynthesisTension[]
  unresolvedQuestions?: string[]
  finalInsight?: string
}

export type InsightType = 'direct' | 'cross_source_inference' | 'interpretive'

export type Insight = {
  id: string
  statement: string
  type: InsightType
  sourceIds: string[]
  claimIds: string[]
  relationshipIds: string[]
  patternIds: string[]
  noveltyScore: number
  confidence: number
  derivation: string
  /** Depth chain: observation → reasoning → evidence → implication */
  observation?: string
  reasoning?: string
  evidenceSummary?: string
  implication?: string
}

export type SynthesisInput = {
  question?: string
  sources: import('@/lib/types/source').SourceAnalysis[]
  graph: RelationshipGraph
}
