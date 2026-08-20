import type { Evidence } from '@/lib/types/analysis'

export type InsightGraphNodeType =
  | 'video'
  | 'concept'
  | 'claim'
  | 'shared'
  | 'different'
  | 'contradiction'
  | 'unique'
  | 'insight'

export type InsightGraphEdgeKind = 'supports' | 'connects' | 'derives' | 'contains'

export type VideoNodeData = {
  sourceId: string
  youtubeId: string
  title: string
  channel: string
  thumbnail?: string
  voiceIndex: number
  keyClaims: Array<{ id: string; statement: string; topic: string }>
  keyConcepts: Array<{ id: string; label: string }>
}

export type ClaimNodeData = {
  claimId: string
  sourceId: string
  statement: string
  topic: string
  evidence: Evidence[]
  voiceIndex: number
}

export type ConceptNodeData = {
  conceptId: string
  label: string
  description?: string
  sourceIds: string[]
  claimIds: string[]
}

export type RelationshipNodeData = {
  relationshipType: 'shared' | 'different' | 'contradiction' | 'unique'
  statement: string
  explanation: string
  sourceIds: string[]
  claimIds: string[]
  relationshipIds: string[]
  confidence: number
  claims: Array<{
    sourceId: string
    voiceIndex: number
    claimId: string
    statement: string
    evidence?: Evidence
  }>
}

export type InsightNodeData = {
  insightId: string
  title: string
  statement: string
  explanation: string
  noveltyReason: string
  sourceIds: string[]
  claimIds: string[]
  relationshipIds: string[]
  confidence: number
  isFourthIdea: boolean
}

export type InsightGraphNode = {
  id: string
  type: InsightGraphNodeType
  label: string
  summary?: string
  defaultVisible: boolean
  data:
    | VideoNodeData
    | ClaimNodeData
    | ConceptNodeData
    | RelationshipNodeData
    | InsightNodeData
}

export type InsightGraphEdge = {
  id: string
  from: string
  to: string
  kind: InsightGraphEdgeKind
  label?: string
}

export type InsightGraphSummary = {
  voiceCount: number
  connectionCount: number
  disagreementCount: number
  insightCount: number
}

export type InsightGraphData = {
  version: string
  summary: InsightGraphSummary
  nodes: InsightGraphNode[]
  edges: InsightGraphEdge[]
}

export type NormalizedConcept = {
  id: string
  label: string
  description?: string
  sourceIds: string[]
  claimIds: string[]
}

export type VideoAnalysisGraph = {
  videoId: string
  sourceId: string
  concepts: NormalizedConcept[]
  claims: Array<{
    id: string
    statement: string
    topic: string
    importance: number
    conceptIds: string[]
    evidence: Evidence[]
  }>
}
