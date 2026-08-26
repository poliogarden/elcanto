import type { JudgmentProvenanceItem } from '@/lib/visualization/relationship-explorer-model'

export type ReasoningNodeType =
  | 'question'
  | 'judgment'
  | 'agreement'
  | 'disagreement'
  | 'uncertainty'
  | 'pattern'
  | 'argument'
  | 'claim'
  | 'evidence'
  | 'source'
  | 'emergent'
  | 'excluded'

export type ReasoningEdgeKind =
  | 'supports'
  | 'contradicts'
  | 'complements'
  | 'depends_on'
  | 'trade_off'
  | 'derived_from'
  | 'evidence_for'
  | 'contains'

export type ReasoningNode = {
  id: string
  type: ReasoningNodeType
  title: string
  summary?: string
  confidence?: 'strong' | 'moderate' | 'weak'
  sourceIds: string[]
  claimIds: string[]
  relationshipType?: string
  evidenceCount: number
  parentIds: string[]
  childIds: string[]
  patternId?: string
  claimId?: string
  evidenceId?: string
  gapId?: string
  emergentId?: string
  relationshipId?: string
  videoId?: string
  voiceIndex?: number
  thumbnail?: string
  timestampStart?: number | null
  reasoningLevel?: 'SUPPORTED' | 'SYNTHESIZED' | 'INFERRED'
  /** Visible on first paint (levels 0–1) */
  defaultVisible: boolean
  branch?: 'agree' | 'divide' | 'gap' | 'emergent' | 'neutral'
}

export type ReasoningEdge = {
  id: string
  from: string
  to: string
  kind: ReasoningEdgeKind
  label?: string
}

export type ReasoningGraph = {
  version: string
  question: string
  judgmentStatement: string
  judgmentSummary?: string
  judgmentConfidence?: 'strong' | 'moderate' | 'weak'
  nodes: ReasoningNode[]
  edges: ReasoningEdge[]
  provenance: JudgmentProvenanceItem[]
  stats: {
    patternCount: number
    agreementCount: number
    divideCount: number
    gapCount: number
    emergentCount: number
    claimCount: number
  }
  hasVerifiedRelationships: boolean
  emptyMessage?: string
}

export type GraphFilter = 'all' | 'agree' | 'divide' | 'gap'

export type GraphFocusIntent =
  | { kind: 'node'; nodeId: string }
  | { kind: 'filter'; filter: GraphFilter }
  | { kind: 'ask'; question: string }
