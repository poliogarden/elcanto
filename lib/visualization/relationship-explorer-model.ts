import { isPatternEvidenceBacked } from '@/lib/reasoning/evidence-integrity'
import { alignReasoningEvidenceDisplay } from '@/lib/reasoning/evidence-lineage-audit'
import {
  agreementSourceCount,
  divideSourceCount,
} from '@/lib/reasoning/landscape-from-evidence'
import type {
  MultiSourceReasoning,
  ReasoningRelationship,
} from '@/lib/reasoning/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import {
  grammarForPatternType,
  grammarForRelationshipType,
  type VisualRelationKind,
} from '@/lib/visualization/visual-grammar'

export type ExplorerSource = {
  sourceId: string
  videoId: string
  voiceIndex: number
  title: string
  thumbnail?: string
  excluded: boolean
  excludeReason?: string
}

export type ExplorerClaim = {
  id: string
  sourceId: string
  videoId: string
  voiceIndex: number
  statement: string
  evidenceIds: string[]
  confidence: 'strong' | 'moderate' | 'weak'
}

export type ExplorerEvidence = {
  id: string
  sourceId: string
  videoId: string
  voiceIndex: number
  timestampStart: number
  timestampEnd: number | null
  text: string
}

export type ExplorerRelationship = {
  id: string
  type: string
  fromClaimId: string
  toClaimId: string
  fromSourceId: string
  toSourceId: string
  explanation: string
  confidence: 'strong' | 'moderate' | 'weak'
  visualKind: VisualRelationKind
}

export type ExplorerPattern = {
  id: string
  title: string
  description: string
  type: string
  claimIds: string[]
  sourceIds: string[]
  relationshipIds: string[]
  claimCount: number
  sourceCount: number
  confidence: 'strong' | 'moderate' | 'weak'
  visualKind: VisualRelationKind
}

export type ExplorerGap = {
  id: string
  title: string
  question: string
  whyItMatters?: string
  linkedJudgmentAspect?: string
  status: 'insufficient_evidence' | 'unresolved' | 'unknown'
}

export type ExplorerEmergent = {
  id: string
  statement: string
  explanation: string
  patternIds: string[]
  claimIds: string[]
  evidencePath: Array<{ step: string; refId: string; label: string }>
  confidence: 'strong' | 'moderate' | 'weak'
}

export type JudgmentProvenanceItem = {
  id: string
  label: string
  kind: VisualRelationKind | 'pattern' | 'gap' | 'emergent'
  targetId: string
}

export type RelationshipExplorerGraph = {
  version: string
  question: string
  judgmentStatement: string
  sources: ExplorerSource[]
  claims: ExplorerClaim[]
  evidence: ExplorerEvidence[]
  patterns: ExplorerPattern[]
  relationships: ExplorerRelationship[]
  gaps: ExplorerGap[]
  emergentInsights: ExplorerEmergent[]
  provenance: JudgmentProvenanceItem[]
  stats: {
    patternCount: number
    agreementCount: number
    agreementSourceCount: number
    divideCount: number
    divideSourceCount: number
    tradeOffCount: number
    gapCount: number
    emergentCount: number
  }
  hasVerifiedRelationships: boolean
  emptyMessage?: string
}

function isCrossSourceRel(r: ReasoningRelationship): boolean {
  return r.fromSourceId !== r.toSourceId
}

function isVerifiedRel(r: ReasoningRelationship): boolean {
  return r.verificationStatus === 'SUPPORTED' && r.confidence !== 'weak'
}

function patternVisualKind(
  patternType: string,
  relationshipIds: string[],
  relById: Map<string, ReasoningRelationship>,
): VisualRelationKind {
  const rels = relationshipIds
    .map((id) => relById.get(id))
    .filter((r): r is ReasoningRelationship => Boolean(r))
  const hasTension = rels.some((r) => r.type === 'TENSION')
  const hasContradiction = rels.some((r) => r.type === 'CONTRADICTION')
  if (hasTension || patternType === 'trade_off') return 'trade-off'
  if (hasContradiction || patternType === 'polarization') return 'divide'
  if (
    patternType === 'recurring_driver' ||
    patternType === 'shared_causal_mechanism'
  ) {
    return 'agree'
  }
  return 'neutral'
}

export function buildExplorerFromReasoning(
  reasoning: MultiSourceReasoning,
  document: SynthesisDocument,
): RelationshipExplorerGraph {
  const aligned = alignReasoningEvidenceDisplay(reasoning)
  const excludedIds = new Set(aligned.excludedSources.map((e) => e.sourceId))
  const voiceBySource = new Map(
    document.voices.map((v) => [v.source?.sourceId ?? `source_${v.voice.n}`, v]),
  )

  const sources: ExplorerSource[] = document.voices.map((entry) => {
    const sourceId = entry.source?.sourceId ?? `source_${entry.voice.n}`
    const excluded = excludedIds.has(sourceId)
    const ex = aligned.excludedSources.find((e) => e.sourceId === sourceId)
    return {
      sourceId,
      videoId: entry.voice.youtubeId,
      voiceIndex: entry.voice.n,
      title: entry.voice.title,
      thumbnail: entry.voice.thumbnail,
      excluded,
      excludeReason: ex?.reason,
    }
  })

  const includedSourceIds = new Set(
    sources.filter((s) => !s.excluded).map((s) => s.sourceId),
  )

  const claims: ExplorerClaim[] = aligned.claims
    .filter((c) => includedSourceIds.has(c.sourceId))
    .map((c) => ({
      id: c.id,
      sourceId: c.sourceId,
      videoId: c.videoId,
      voiceIndex: c.voiceIndex,
      statement: c.statement,
      evidenceIds: c.evidenceIds,
      confidence: c.confidence,
    }))

  const evidence: ExplorerEvidence[] = aligned.evidence
    .filter((e) => includedSourceIds.has(e.sourceId))
    .map((e) => {
      const src = sources.find((s) => s.sourceId === e.sourceId)
      return {
        id: e.id,
        sourceId: e.sourceId,
        videoId: e.videoId,
        voiceIndex: src?.voiceIndex ?? 0,
        timestampStart: e.timestampStart,
        timestampEnd: e.timestampEnd,
        text: e.text,
      }
    })

  const relById = new Map(aligned.relationships.map((r) => [r.id, r]))

  const significant = aligned.significantRelationships ?? []
  const useClusters = significant.length > 0

  const relationships: ExplorerRelationship[] = useClusters
    ? significant.map((c) => {
        const visualKind = c.visualKind
        return {
          id: c.id,
          type: c.type,
          fromClaimId: c.supportingClaimIds[0] ?? '',
          toClaimId: c.supportingClaimIds[1] ?? c.supportingClaimIds[0] ?? '',
          fromSourceId: c.supportingSourceIds[0] ?? '',
          toSourceId: c.supportingSourceIds[1] ?? c.supportingSourceIds[0] ?? '',
          explanation: c.canonicalClaim,
          confidence: c.confidence,
          visualKind,
        }
      })
    : []

  const patterns: ExplorerPattern[] = useClusters
    ? significant.map((c) => ({
        id: c.id,
        title: c.label,
        description: `${c.canonicalClaim} · ${c.sourceCount} sources · ${c.evidenceCount} evidence links`,
        type: c.dimension,
        claimIds: c.supportingClaimIds.filter((cid) => claims.some((cl) => cl.id === cid)),
        sourceIds: c.supportingSourceIds.filter((sid) => includedSourceIds.has(sid)),
        relationshipIds: c.memberRelationshipIds,
        claimCount: c.supportingClaimIds.length,
        sourceCount: c.sourceCount,
        confidence: c.confidence,
        visualKind: c.visualKind === 'neutral' ? 'agree' : c.visualKind,
      }))
    : aligned.patterns
        .filter((p) => p.verificationStatus !== 'REJECTED')
        .filter((p) =>
          isPatternEvidenceBacked(p, significant, aligned.relationships),
        )
        .filter((p) => p.sourceIds.some((sid) => includedSourceIds.has(sid)))
        .slice(0, 9)
        .map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          type: p.type,
          claimIds: p.claimIds.filter((cid) => claims.some((c) => c.id === cid)),
          sourceIds: p.sourceIds.filter((sid) => includedSourceIds.has(sid)),
          relationshipIds: p.relationshipIds,
          claimCount: p.claimIds.length,
          sourceCount: p.sourceIds.filter((sid) => includedSourceIds.has(sid)).length,
          confidence: p.confidence,
          visualKind: patternVisualKind(p.type, p.relationshipIds, relById),
        }))

  const gaps: ExplorerGap[] = aligned.knowledgeGaps.map((g) => ({
    id: g.id,
    title: g.question.slice(0, 80),
    question: g.question,
    whyItMatters: g.whyItMatters,
    linkedJudgmentAspect: g.linkedJudgmentAspect,
    status: 'insufficient_evidence' as const,
  })).slice(0, 6)

  const emergentInsights: ExplorerEmergent[] = aligned.insights
    .filter((i) => i.verificationStatus !== 'REJECTED')
    .map((i) => ({
      id: i.id,
      statement: i.statement,
      explanation: i.explanation,
      patternIds: i.patternIds,
      claimIds: i.claimIds,
      evidencePath: i.evidencePath,
      confidence:
        i.confidence === 'high'
          ? 'strong'
          : i.confidence === 'moderate'
            ? 'moderate'
            : 'weak',
    }))

  const agreementCount = relationships.filter((r) => r.visualKind === 'agree').length
  const divideCount = relationships.filter((r) => r.visualKind === 'divide').length
  const tradeOffCount = relationships.filter(
    (r) => r.visualKind === 'trade-off',
  ).length
  const agreementSourceCountVal = useClusters
    ? agreementSourceCount(significant)
    : new Set(
        relationships
          .filter((r) => r.visualKind === 'agree')
          .flatMap((r) => [r.fromSourceId, r.toSourceId]),
      ).size
  const divideSourceCountVal = useClusters
    ? divideSourceCount(significant)
    : new Set(
        relationships
          .filter((r) => r.visualKind === 'divide' || r.visualKind === 'trade-off')
          .flatMap((r) => [r.fromSourceId, r.toSourceId]),
      ).size

  const provenance: JudgmentProvenanceItem[] = []
  for (const p of patterns.slice(0, 3)) {
    provenance.push({
      id: `prov_${p.id}`,
      label: p.title.slice(0, 48),
      kind: p.visualKind === 'neutral' ? 'pattern' : p.visualKind,
      targetId: p.id,
    })
  }
  if (agreementCount > 0) {
    provenance.push({
      id: 'prov_agree',
      label: useClusters
        ? `${agreementCount} agreement cluster${agreementCount !== 1 ? 's' : ''}`
        : `${agreementCount} agreement${agreementCount !== 1 ? 's' : ''}`,
      kind: 'agree',
      targetId: '__filter_agree__',
    })
  }
  if (divideCount + tradeOffCount > 0) {
    provenance.push({
      id: 'prov_divide',
      label: `${divideCount + tradeOffCount} divide/trade-off`,
      kind: 'divide',
      targetId: '__filter_divide__',
    })
  }
  // Knowledge gaps are limitations, NOT judgment supporting evidence — excluded from provenance.

  const hasVerifiedRelationships = relationships.length > 0

  return {
    version: aligned.version,
    question: aligned.centralQuestion,
    judgmentStatement: aligned.judgment?.statement ?? '',
    sources,
    claims,
    evidence,
    patterns,
    relationships,
    gaps,
    emergentInsights,
    provenance,
    stats: {
      patternCount: patterns.length,
      agreementCount,
      agreementSourceCount: agreementSourceCountVal,
      divideCount,
      divideSourceCount: divideSourceCountVal,
      tradeOffCount,
      gapCount: gaps.length,
      emergentCount: emergentInsights.length,
    },
    hasVerifiedRelationships,
    emptyMessage: hasVerifiedRelationships
      ? undefined
      : 'No verified cross-source relationships',
  }
}

export function buildExplorerFromSurvival(survival: SurvivalAnalysis): RelationshipExplorerGraph {
  const sources: ExplorerSource[] = survival.sources.map((s) => ({
    sourceId: s.sourceId,
    videoId: s.videoId,
    voiceIndex: s.voiceIndex,
    title: s.title,
    thumbnail: s.thumbnail,
    excluded: s.includedInSynthesis === false,
    excludeReason: survival.excludedSources?.find((e) => e.sourceId === s.sourceId)?.reason,
  }))

  const includedSourceIds = new Set(
    sources.filter((s) => !s.excluded).map((s) => s.sourceId),
  )

  const claims: ExplorerClaim[] = survival.claims
    .filter((c) => includedSourceIds.has(c.sourceId))
    .map((c) => ({
      id: c.claimId,
      sourceId: c.sourceId,
      videoId: c.videoId,
      voiceIndex: c.voiceIndex,
      statement: c.claim,
      evidenceIds: [],
      confidence: c.confidence,
    }))

  const relationships: ExplorerRelationship[] = survival.verifiedRelationships
    .filter((r) => {
      const from = claims.find((c) => c.id === r.fromClaimId)
      const to = claims.find((c) => c.id === r.toClaimId)
      return from && to && from.sourceId !== to.sourceId && r.confidence !== 'weak'
    })
    .map((r) => ({
      id: r.id,
      type: r.type,
      fromClaimId: r.fromClaimId,
      toClaimId: r.toClaimId,
      fromSourceId:
        claims.find((c) => c.id === r.fromClaimId)?.sourceId ?? '',
      toSourceId: claims.find((c) => c.id === r.toClaimId)?.sourceId ?? '',
      explanation: r.explanation,
      confidence: r.confidence,
      visualKind: grammarForRelationshipType(r.type).kind,
    }))

  const patterns: ExplorerPattern[] = [
    ...survival.consensus.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.oneLineSummary,
      type: 'recurring_driver',
      claimIds: [] as string[],
      sourceIds: c.supportingVideoIds,
      relationshipIds: [] as string[],
      claimCount: 0,
      sourceCount: c.supportingVideoIds.length,
      confidence: c.confidence,
      visualKind: 'agree' as VisualRelationKind,
    })),
    ...survival.disagreements.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.oneLineSummary,
      type: 'polarization',
      claimIds: [d.sideA.claimId, d.sideB.claimId].filter(Boolean) as string[],
      sourceIds: [...(d.sideA.sourceIds ?? []), ...(d.sideB.sourceIds ?? [])],
      relationshipIds: [] as string[],
      claimCount: 2,
      sourceCount: new Set([...(d.sideA.sourceIds ?? []), ...(d.sideB.sourceIds ?? [])]).size,
      confidence: d.confidence,
      visualKind: 'divide' as VisualRelationKind,
    })),
    ...[
      ...survival.landscape.agree.cards,
      ...survival.landscape.divide.cards,
    ].map((card) => ({
      id: card.id,
      title: card.title,
      description: card.summary,
      type: 'recurring_driver',
      claimIds: card.claimIds ?? [],
      sourceIds: [] as string[],
      relationshipIds: card.relationshipIds ?? [],
      claimCount: card.claimIds?.length ?? 0,
      sourceCount: 0,
      confidence: 'moderate' as const,
      visualKind: (survival.landscape.divide.cards.some((c) => c.id === card.id)
        ? 'divide'
        : 'agree') as VisualRelationKind,
    })),
  ].slice(0, 9)

  const gaps: ExplorerGap[] = [
    ...survival.knowledgeGaps.map((g) => ({
      id: g.id,
      title: g.question.slice(0, 80),
      question: g.question,
      status: 'insufficient_evidence' as const,
    })),
    ...survival.landscape.unclear.cards.map((card) => ({
      id: card.id,
      title: card.title,
      question: card.summary || card.title,
      status: 'unknown' as const,
    })),
  ]

  const emergentInsights: ExplorerEmergent[] = survival.emergentInsights.map((i) => ({
    id: i.id,
    statement: i.statement,
    explanation: '',
    patternIds: [],
    claimIds: [],
    evidencePath: i.reasoningPath,
    confidence: i.confidence,
  }))

  const agreementCount = relationships.filter((r) => r.visualKind === 'agree').length
  const divideCount = relationships.filter((r) => r.visualKind === 'divide').length

  return {
    version: survival.version,
    question: survival.topicCoherence?.centralQuestion ?? '',
    judgmentStatement: survival.synthesis.headline,
    sources,
    claims,
    evidence: survival.claims
      .filter((c) => c.evidence)
      .map((c, i) => ({
        id: `ev_${i}`,
        sourceId: c.sourceId,
        videoId: c.videoId,
        voiceIndex: c.voiceIndex,
        timestampStart: c.timestamp ?? 0,
        timestampEnd: null,
        text: c.evidence,
      })),
    patterns,
    relationships,
    gaps,
    emergentInsights,
    provenance: patterns.slice(0, 4).map((p) => ({
      id: `prov_${p.id}`,
      label: p.title.slice(0, 48),
      kind: p.visualKind,
      targetId: p.id,
    })),
    stats: {
      patternCount: patterns.length,
      agreementCount,
      agreementSourceCount: new Set(
        relationships.filter((r) => r.visualKind === 'agree').flatMap((r) => [r.fromSourceId, r.toSourceId]),
      ).size,
      divideCount,
      divideSourceCount: new Set(
        relationships.filter((r) => r.visualKind === 'divide').flatMap((r) => [r.fromSourceId, r.toSourceId]),
      ).size,
      tradeOffCount: 0,
      gapCount: gaps.length,
      emergentCount: emergentInsights.length,
    },
    hasVerifiedRelationships: relationships.length > 0,
    emptyMessage:
      relationships.length === 0 ? 'No verified cross-source relationships' : undefined,
  }
}

export function buildExplorerGraph(document: SynthesisDocument): RelationshipExplorerGraph | null {
  if (document.reasoning?.mode === 'multi') {
    return buildExplorerFromReasoning(document.reasoning, document)
  }
  if (document.survival) {
    return buildExplorerFromSurvival(document.survival)
  }
  return null
}

export function getAgreeRelationships(graph: RelationshipExplorerGraph): ExplorerRelationship[] {
  return graph.relationships.filter((r) => r.visualKind === 'agree')
}

export function getDivideRelationships(
  graph: RelationshipExplorerGraph,
): ExplorerRelationship[] {
  return graph.relationships.filter(
    (r) => r.visualKind === 'divide' || r.visualKind === 'trade-off',
  )
}

export function getClaimsForPattern(
  graph: RelationshipExplorerGraph,
  patternId: string,
): ExplorerClaim[] {
  const pattern = graph.patterns.find((p) => p.id === patternId)
  if (!pattern) return []
  return graph.claims.filter((c) => pattern.claimIds.includes(c.id))
}

export function getEvidenceForClaim(
  graph: RelationshipExplorerGraph,
  claimId: string,
): ExplorerEvidence[] {
  const claim = graph.claims.find((c) => c.id === claimId)
  if (!claim) return []
  if (claim.evidenceIds.length > 0) {
    return graph.evidence.filter((e) => claim.evidenceIds.includes(e.id))
  }
  return graph.evidence.filter((e) => e.sourceId === claim.sourceId).slice(0, 2)
}
