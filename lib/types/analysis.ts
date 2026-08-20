import type {
  ClaimRelationship,
  CrossSourcePattern,
  Insight,
  RelationshipGraph,
  SourceReasoning,
  SynthesisConclusion,
} from '@/lib/types/relationship'
import type { KnowledgeExtension, SetAnalysis } from '@/lib/types/knowledge'
import type { FourthIdea, FourthIdeaCandidate, UnderstandingChange } from '@/lib/types/fourth-idea'
import type {
  CrossSourceTheme,
  EditorialComparison,
  SynthesisFinding,
  SynthesisReportMeta,
} from '@/lib/types/synthesis-report'
import type { InsightGraphData } from '@/lib/types/insight-graph'

/** Structured output from per-video analysis (Phase 2+) */

export type Claim = {
  id: string
  statement: string
  importance: number
  evidenceIds: string[]
}

export type Evidence = {
  id: string
  timestamp: number
  text: string
}

export type VideoAnalysis = {
  videoId: string
  summary: string
  thesis: string
  keyClaims: Claim[]
  evidence: Evidence[]
  topics: string[]
  stance?: string
}

export type SynthesisResult = {
  /** Claims used in synthesis per source */
  sources: SourceReasoning[]
  /** Claim-pair relationships discovered */
  relationships: ClaimRelationship[]
  /** Cross-source patterns derived from relationships */
  patterns: CrossSourcePattern[]
  /** Set analysis: intersection / difference / contradiction */
  setAnalysis: SetAnalysis
  /** Final synthesis conclusion */
  synthesis: SynthesisConclusion
  /** Insights with full lineage */
  insights: Insight[]
  /** Knowledge gaps and discovery recommendations */
  knowledge: KnowledgeExtension
  /** Selected emergent insight — visible only when sources are compared */
  fourthIdea?: FourthIdea | null
  /** Candidates considered for fourth idea selection */
  fourthIdeaCandidates?: FourthIdeaCandidate[]
  /** Before/after when understanding shifts on re-synthesis */
  understandingChange?: UnderstandingChange | null
  /** Full relationship graph including stats */
  relationshipGraph?: RelationshipGraph
  /** Cross-source themes (v2 report) */
  themes?: CrossSourceTheme[]
  /** Major findings derived from themes + relationships */
  findings?: SynthesisFinding[]
  /** Editorial agreement/disagreement cards */
  editorialAgreements?: EditorialComparison[]
  editorialDisagreements?: EditorialComparison[]
  /** Report metadata for hero section */
  reportMeta?: SynthesisReportMeta
  /** Insight graph for relationship visualization */
  insightGraph?: InsightGraphData
}

export type AskAnswer = {
  answer: string
  usedSourceIds: string[]
  evidence: Array<{ videoId: string; timestamp: number; text: string }>
}

/** Flat accessors for backward compatibility */
export function getSynthesisTopic(result: SynthesisResult): string {
  return result.synthesis.topic
}

export function getSynthesisUsedSourceIds(result: SynthesisResult): string[] {
  return result.synthesis.usedSourceIds
}
