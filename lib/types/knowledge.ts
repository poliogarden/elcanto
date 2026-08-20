import type { ClaimRelationship, RelationshipType, StructuredClaim } from '@/lib/types/relationship'
import type { SourceAnalysis } from '@/lib/types/source'
import { normalizeSourceAnalysis } from '@/lib/types/source'

export type Topic = { id: string; label: string }
export type Concept = { id: string; label: string; description?: string }
export type Implication = { id: string; statement: string }

/** Source as a set of knowledge units */
export type SourceKnowledge = {
  sourceId: string
  title: string
  topics: Topic[]
  concepts: Concept[]
  claims: StructuredClaim[]
  evidence: Array<{ id: string; timestamp: number; text: string }>
  implications: Implication[]
}

export function toSourceKnowledge(source: SourceAnalysis): SourceKnowledge {
  const n = normalizeSourceAnalysis(source)
  return {
    sourceId: n.sourceId,
    title: n.title,
    topics: n.topics.map((label, i) => ({ id: `${n.sourceId}_topic_${i}`, label })),
    concepts: (n.entities ?? []).map((e) => ({
      id: e.id,
      label: e.name,
      description: e.type,
    })),
    claims: n.claims,
    evidence: n.evidence,
    implications: n.implications.map((statement, i) => ({
      id: `${n.sourceId}_impl_${i}`,
      statement,
    })),
  }
}

export function toSourceKnowledgeSet(sources: SourceAnalysis[]): SourceKnowledge[] {
  return sources.map(toSourceKnowledge)
}

const INTERSECTION_TYPES: RelationshipType[] = [
  'agreement',
  'partial_agreement',
  'structural_parallel',
  'complementary',
]

const CONTRADICTION_TYPES: RelationshipType[] = ['disagreement']

export type IntersectionKind =
  | 'agreement'
  | 'partial_agreement'
  | 'structural_parallel'
  | 'complementary'
  | 'shared_topic'

export type IntersectionFinding = {
  id: string
  label: string
  description: string
  kind: IntersectionKind
  sourceIds: string[]
  claimIds: string[]
  relationshipIds: string[]
  confidence: number
}

export type DifferenceKind =
  | 'unique_claim'
  | 'unique_perspective'
  | 'unique_evidence'
  | 'omission'

export type DifferenceFinding = {
  id: string
  sourceId: string
  otherSourceId: string
  kind: DifferenceKind
  claimIds: string[]
  statements: string[]
  explanation: string
}

export type ContradictionFinding = {
  id: string
  sourceIds: string[]
  claimIds: string[]
  relationshipId: string
  description: string
  strength: number
  confidence: number
}

export type SetAnalysis = {
  intersections: IntersectionFinding[]
  differences: DifferenceFinding[]
  contradictions: ContradictionFinding[]
  noStrongIntersection: boolean
}

export type KnowledgeGap = {
  id: string
  question: string
  description: string
  knownClaimIds: string[]
  relatedSourceIds: string[]
  confidence: number
}

export type RecommendationType = 'deepen' | 'counter' | 'bridge' | 'evidence' | 'missing_piece'

export type KnowledgeRecommendation = {
  id: string
  type: RecommendationType
  searchQuery: string
  title: string
  reason: string
  gapId?: string
  relatedSourceIds: string[]
  relatedClaimIds: string[]
}

export type RejectReason =
  | 'LOW_NOVELTY'
  | 'LOW_SPECIFICITY'
  | 'NO_TRACEABILITY'
  | 'NO_ADDED_VALUE'
  | 'GENERIC'

export type RejectedInsight = {
  id: string
  statement: string
  reasons: RejectReason[]
}

export type KnowledgeExtension = {
  gaps: KnowledgeGap[]
  recommendations: KnowledgeRecommendation[]
  rejectedInsights: RejectedInsight[]
}

export function computeSetAnalysis(
  knowledge: SourceKnowledge[],
  relationships: ClaimRelationship[],
): SetAnalysis {
  const meaningful = relationships.filter((r) => r.type !== 'independent' && r.strength >= 0.3)

  const intersections: IntersectionFinding[] = meaningful
    .filter((r) => INTERSECTION_TYPES.includes(r.type) || r.type === 'shared_topic')
    .map((r) => ({
      id: `int_${r.id}`,
      label: intersectionLabel(r.type),
      description: r.explanation,
      kind: (r.type === 'shared_topic' ? 'shared_topic' : r.type) as IntersectionKind,
      sourceIds: [r.fromSourceId, r.toSourceId],
      claimIds: [r.fromClaimId, r.toClaimId],
      relationshipIds: [r.id],
      confidence: r.confidence,
    }))

  const contradictions: ContradictionFinding[] = meaningful
    .filter((r) => CONTRADICTION_TYPES.includes(r.type))
    .map((r) => ({
      id: `con_${r.id}`,
      sourceIds: [r.fromSourceId, r.toSourceId],
      claimIds: [r.fromClaimId, r.toClaimId],
      relationshipId: r.id,
      description: r.explanation,
      strength: r.strength,
      confidence: r.confidence,
    }))

  const differences = computeDifferences(knowledge, meaningful)

  const strongIntersections = intersections.filter(
    (i) => i.kind !== 'shared_topic' && i.confidence >= 0.55,
  )

  return {
    intersections,
    differences,
    contradictions,
    noStrongIntersection: strongIntersections.length === 0,
  }
}

function intersectionLabel(type: RelationshipType): string {
  const labels: Record<string, string> = {
    agreement: 'Shared claim',
    partial_agreement: 'Partial overlap',
    structural_parallel: 'Structural parallel',
    complementary: 'Complementary view',
    shared_topic: 'Shared topic only',
  }
  return labels[type] ?? type
}

function computeDifferences(
  knowledge: SourceKnowledge[],
  relationships: ClaimRelationship[],
): DifferenceFinding[] {
  const findings: DifferenceFinding[] = []
  const claimInRelationship = new Set<string>()
  for (const r of relationships) {
    claimInRelationship.add(r.fromClaimId)
    claimInRelationship.add(r.toClaimId)
  }

  for (let i = 0; i < knowledge.length; i++) {
    for (let j = 0; j < knowledge.length; j++) {
      if (i === j) continue
      const a = knowledge[i]
      const b = knowledge[j]
      const uniqueClaims = a.claims.filter((c) => !claimInRelationship.has(c.id))
      if (uniqueClaims.length === 0) continue

      findings.push({
        id: `diff_${a.sourceId}_${b.sourceId}`,
        sourceId: a.sourceId,
        otherSourceId: b.sourceId,
        kind: 'unique_claim',
        claimIds: uniqueClaims.map((c) => c.id),
        statements: uniqueClaims.map((c) => c.statement),
        explanation: `Present in ${a.title} but not connected to ${b.title}.`,
      })
    }
  }

  return dedupeDifferences(findings)
}

function dedupeDifferences(findings: DifferenceFinding[]): DifferenceFinding[] {
  const seen = new Set<string>()
  return findings.filter((f) => {
    const key = `${f.sourceId}:${f.claimIds.sort().join(',')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Pairwise set view for 2-source UI */
export function buildTwoSourceSetView(
  setAnalysis: SetAnalysis,
  sourceA: string,
  sourceB: string,
) {
  const onlyA = setAnalysis.differences.filter(
    (d) => d.sourceId === sourceA && d.otherSourceId === sourceB,
  )
  const onlyB = setAnalysis.differences.filter(
    (d) => d.sourceId === sourceB && d.otherSourceId === sourceA,
  )
  const shared = setAnalysis.intersections.filter(
    (i) => i.sourceIds.includes(sourceA) && i.sourceIds.includes(sourceB),
  )
  const contradictions = setAnalysis.contradictions.filter(
    (c) => c.sourceIds.includes(sourceA) && c.sourceIds.includes(sourceB),
  )

  return { onlyA, onlyB, shared, contradictions }
}
