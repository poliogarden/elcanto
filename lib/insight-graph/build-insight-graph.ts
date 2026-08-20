import type { SynthesisResult } from '@/lib/types/analysis'
import type {
  InsightGraphData,
  InsightGraphEdge,
  InsightGraphNode,
  InsightGraphSummary,
  InsightNodeData,
  RelationshipNodeData,
  VideoNodeData,
} from '@/lib/types/insight-graph'
import type { SourceAnalysis } from '@/lib/types/source'
import { normalizeSourceAnalysis } from '@/lib/types/source'
import { extractNormalizedConcepts } from '@/lib/insight-graph/concept-normalize'

export type BuildInsightGraphInput = {
  result: SynthesisResult
  sources: SourceAnalysis[]
}

function parseVoiceIndex(sourceId: string): number {
  const match = sourceId.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function dedupeClaimsById(
  claims: RelationshipNodeData['claims'],
): RelationshipNodeData['claims'] {
  const seen = new Set<string>()
  const unique: RelationshipNodeData['claims'] = []
  for (const claim of claims) {
    if (seen.has(claim.claimId)) continue
    seen.add(claim.claimId)
    unique.push(claim)
  }
  return unique
}

function claimLookup(sources: SourceAnalysis[]) {
  const map = new Map<
    string,
    { statement: string; sourceId: string; voiceIndex: number; evidence?: import('@/lib/types/analysis').Evidence }
  >()
  for (const raw of sources) {
    const source = normalizeSourceAnalysis(raw)
    const voiceIndex = parseVoiceIndex(source.sourceId)
    for (const claim of source.claims) {
      const evidence = source.evidence.find((e) =>
        e.text.toLowerCase().includes(claim.statement.slice(0, 20).toLowerCase()),
      )
      map.set(claim.id, {
        statement: claim.statement,
        sourceId: source.sourceId,
        voiceIndex,
        evidence,
      })
    }
  }
  return map
}

function uniqueTopClaims(
  claims: SourceAnalysis['claims'],
  limit = 4,
): VideoNodeData['keyClaims'] {
  const seen = new Set<string>()
  const result: VideoNodeData['keyClaims'] = []
  for (const claim of [...claims].sort((a, b) => b.confidence - a.confidence)) {
    if (seen.has(claim.id)) continue
    seen.add(claim.id)
    result.push({ id: claim.id, statement: claim.statement, topic: claim.topic })
    if (result.length >= limit) break
  }
  return result
}

function buildVideoNodes(sources: SourceAnalysis[]): InsightGraphNode[] {
  return sources.map((raw) => {
    const source = normalizeSourceAnalysis(raw)
    const voiceIndex = source.voiceIndex || parseVoiceIndex(source.sourceId)
    const keyClaims = uniqueTopClaims(source.claims, 4)
    const concepts = [...extractNormalizedConcepts([source]).values()]
      .slice(0, 5)
      .map((c) => ({ id: c.id, label: c.label }))

    const data: VideoNodeData = {
      sourceId: source.sourceId,
      youtubeId: source.videoId,
      title: source.title,
      channel: '',
      voiceIndex,
      keyClaims,
      keyConcepts: concepts,
    }

    return {
      id: `video_${source.sourceId}`,
      type: 'video' as const,
      label: `Video ${voiceIndex || source.title.slice(0, 20)}`,
      summary: source.title,
      defaultVisible: true,
      data,
    }
  })
}

function buildSharedNodes(
  result: SynthesisResult,
  claims: ReturnType<typeof claimLookup>,
): InsightGraphNode[] {
  const nodes: InsightGraphNode[] = []
  const seen = new Set<string>()

  for (const intersection of result.setAnalysis.intersections.slice(0, 8)) {
    const key = intersection.claimIds.sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)

    const claimDetails = intersection.claimIds
      .map((id) => {
        const c = claims.get(id)
        if (!c) return null
        return {
          sourceId: c.sourceId,
          voiceIndex: c.voiceIndex,
          claimId: id,
          statement: c.statement,
          evidence: c.evidence,
        }
      })
      .filter(Boolean) as RelationshipNodeData['claims']

    const data: RelationshipNodeData = {
      relationshipType: 'shared',
      statement: intersection.label,
      explanation: intersection.description,
      sourceIds: intersection.sourceIds,
      claimIds: intersection.claimIds,
      relationshipIds: intersection.relationshipIds,
      confidence: intersection.confidence,
      claims: dedupeClaimsById(claimDetails),
    }

    nodes.push({
      id: `shared_${intersection.id}`,
      type: 'shared',
      label: 'SHARED',
      summary: intersection.label,
      defaultVisible: true,
      data,
    })
  }

  for (const section of result.synthesis.sections.filter((s) =>
    ['agreement', 'shared_thread'].includes(s.section),
  )) {
    const key = section.claimIds.sort().join('|')
    if (seen.has(key) || section.sourceIds.length < 2) continue
    seen.add(key)

    const claimDetails = section.claimIds
      .map((id) => {
        const c = claims.get(id)
        if (!c) return null
        return {
          sourceId: c.sourceId,
          voiceIndex: c.voiceIndex,
          claimId: id,
          statement: c.statement,
          evidence: c.evidence,
        }
      })
      .filter(Boolean) as RelationshipNodeData['claims']

    const data: RelationshipNodeData = {
      relationshipType: 'shared',
      statement: section.statement,
      explanation: section.label,
      sourceIds: section.sourceIds,
      claimIds: section.claimIds,
      relationshipIds: [],
      confidence: section.confidence,
      claims: dedupeClaimsById(claimDetails),
    }

    nodes.push({
      id: `shared_section_${section.id}`,
      type: 'shared',
      label: 'SHARED',
      summary: section.statement.slice(0, 80),
      defaultVisible: true,
      data,
    })
  }

  return nodes.slice(0, 6)
}

function buildDifferentNodes(
  result: SynthesisResult,
  claims: ReturnType<typeof claimLookup>,
): InsightGraphNode[] {
  const nodes: InsightGraphNode[] = []

  for (const diff of result.setAnalysis.differences.slice(0, 5)) {
    const claimDetails = diff.claimIds
      .map((id) => {
        const c = claims.get(id)
        if (!c) return null
        return {
          sourceId: c.sourceId,
          voiceIndex: c.voiceIndex,
          claimId: id,
          statement: c.statement,
          evidence: c.evidence,
        }
      })
      .filter(Boolean) as RelationshipNodeData['claims']

    const data: RelationshipNodeData = {
      relationshipType: 'different',
      statement: diff.statements[0] ?? diff.explanation,
      explanation: diff.explanation,
      sourceIds: [diff.sourceId, diff.otherSourceId],
      claimIds: diff.claimIds,
      relationshipIds: [],
      confidence: 0.7,
      claims: dedupeClaimsById(claimDetails),
    }

    nodes.push({
      id: `different_${diff.id}`,
      type: 'different',
      label: 'DIFFERENT',
      summary: diff.explanation.slice(0, 80),
      defaultVisible: true,
      data,
    })
  }

  for (const section of result.synthesis.sections.filter((s) =>
    ['different_directions', 'unique_view'].includes(s.section),
  )) {
    if (section.sourceIds.length < 2) continue
    const claimDetails = section.claimIds
      .map((id) => {
        const c = claims.get(id)
        if (!c) return null
        return {
          sourceId: c.sourceId,
          voiceIndex: c.voiceIndex,
          claimId: id,
          statement: c.statement,
          evidence: c.evidence,
        }
      })
      .filter(Boolean) as RelationshipNodeData['claims']

    nodes.push({
      id: `different_section_${section.id}`,
      type: 'different',
      label: 'DIFFERENT',
      summary: section.statement.slice(0, 80),
      defaultVisible: true,
      data: {
        relationshipType: 'different',
        statement: section.statement,
        explanation: section.label,
        sourceIds: section.sourceIds,
        claimIds: section.claimIds,
        relationshipIds: [],
        confidence: section.confidence,
        claims: dedupeClaimsById(claimDetails),
      },
    })
  }

  return nodes.slice(0, 5)
}

function buildContradictionNodes(
  result: SynthesisResult,
  claims: ReturnType<typeof claimLookup>,
): InsightGraphNode[] {
  return result.setAnalysis.contradictions.slice(0, 4).map((c) => {
    const claimDetails = c.claimIds
      .map((id) => {
        const cl = claims.get(id)
        if (!cl) return null
        return {
          sourceId: cl.sourceId,
          voiceIndex: cl.voiceIndex,
          claimId: id,
          statement: cl.statement,
          evidence: cl.evidence,
        }
      })
      .filter(Boolean) as RelationshipNodeData['claims']

    const data: RelationshipNodeData = {
      relationshipType: 'contradiction',
      statement: c.description,
      explanation: c.description,
      sourceIds: c.sourceIds,
      claimIds: c.claimIds,
      relationshipIds: [c.relationshipId],
      confidence: c.confidence,
      claims: dedupeClaimsById(claimDetails),
    }

    return {
      id: `contradiction_${c.id}`,
      type: 'contradiction' as const,
      label: 'CONFLICT',
      summary: c.description.slice(0, 80),
      defaultVisible: true,
      data,
    }
  })
}

function buildUniqueNodes(
  sources: SourceAnalysis[],
  result: SynthesisResult,
  claims: ReturnType<typeof claimLookup>,
): InsightGraphNode[] {
  const nodes: InsightGraphNode[] = []
  const usedClaimIds = new Set<string>()

  for (const section of result.synthesis.sections.filter((s) => s.section === 'unique_view')) {
    for (const claimId of section.claimIds) usedClaimIds.add(claimId)
  }

  for (const raw of sources) {
    const source = normalizeSourceAnalysis(raw)
    const uniqueClaim = source.claims.find((c) => !usedClaimIds.has(c.id))
    if (!uniqueClaim) continue

    const voiceIndex = parseVoiceIndex(source.sourceId)
    const data: RelationshipNodeData = {
      relationshipType: 'unique',
      statement: uniqueClaim.statement,
      explanation: `Unique perspective from Video ${voiceIndex || source.title}`,
      sourceIds: [source.sourceId],
      claimIds: [uniqueClaim.id],
      relationshipIds: [],
      confidence: uniqueClaim.confidence,
      claims: [
        {
          sourceId: source.sourceId,
          voiceIndex,
          claimId: uniqueClaim.id,
          statement: uniqueClaim.statement,
          evidence: source.evidence[0],
        },
      ],
    }

    nodes.push({
      id: `unique_${source.sourceId}`,
      type: 'unique',
      label: 'UNIQUE',
      summary: uniqueClaim.statement.slice(0, 80),
      defaultVisible: false,
      data,
    })
  }

  return nodes.slice(0, sources.length)
}

function buildInsightNodes(result: SynthesisResult): InsightGraphNode[] {
  const nodes: InsightGraphNode[] = []

  if (result.fourthIdea) {
    const fi = result.fourthIdea
    const data: InsightNodeData = {
      insightId: fi.id,
      title: 'Emerging Insight',
      statement: fi.statement,
      explanation: fi.explanation,
      noveltyReason:
        fi.derivationSummary ||
        'This idea is not directly stated by any single source. It emerges from comparing multiple voices together.',
      sourceIds: fi.sourceIds,
      claimIds: fi.claimIds,
      relationshipIds: fi.relationshipIds,
      confidence: fi.confidence,
      isFourthIdea: true,
    }
    nodes.push({
      id: `insight_${fi.id}`,
      type: 'insight',
      label: '✦ INSIGHT',
      summary: fi.statement,
      defaultVisible: true,
      data,
    })
  }

  const crossInsights = result.insights
    .filter((i) => i.type === 'cross_source_inference')
    .sort((a, b) => b.noveltyScore - a.noveltyScore)
    .slice(0, 3)

  for (const insight of crossInsights) {
    if (result.fourthIdea?.id === insight.id) continue
    const data: InsightNodeData = {
      insightId: insight.id,
      title: 'Insight',
      statement: insight.statement,
      explanation: insight.derivation,
      noveltyReason: insight.derivation,
      sourceIds: insight.sourceIds,
      claimIds: insight.claimIds,
      relationshipIds: insight.relationshipIds,
      confidence: insight.confidence,
      isFourthIdea: false,
    }
    nodes.push({
      id: `insight_${insight.id}`,
      type: 'insight',
      label: 'INSIGHT',
      summary: insight.statement.slice(0, 100),
      defaultVisible: nodes.length < 2,
      data,
    })
  }

  return nodes
}

function buildConceptAndClaimNodes(
  sources: SourceAnalysis[],
  claims: ReturnType<typeof claimLookup>,
): InsightGraphNode[] {
  const nodes: InsightGraphNode[] = []
  const concepts = extractNormalizedConcepts(sources)

  for (const concept of [...concepts.values()].filter((c) => c.sourceIds.length >= 2).slice(0, 12)) {
    nodes.push({
      id: concept.id,
      type: 'concept',
      label: concept.label,
      summary: concept.description,
      defaultVisible: false,
      data: {
        conceptId: concept.id,
        label: concept.label,
        description: concept.description,
        sourceIds: concept.sourceIds,
        claimIds: concept.claimIds,
      },
    })
  }

  for (const [claimId, claim] of claims) {
    nodes.push({
      id: `claim_${claimId}`,
      type: 'claim',
      label: claim.statement.slice(0, 40),
      summary: claim.statement,
      defaultVisible: false,
      data: {
        claimId,
        sourceId: claim.sourceId,
        statement: claim.statement,
        topic: '',
        evidence: claim.evidence ? [claim.evidence] : [],
        voiceIndex: claim.voiceIndex,
      },
    })
  }

  return nodes
}

function buildEdges(
  videoNodes: InsightGraphNode[],
  relationshipNodes: InsightGraphNode[],
  insightNodes: InsightGraphNode[],
  conceptNodes: InsightGraphNode[],
  claimNodes: InsightGraphNode[],
): InsightGraphEdge[] {
  const edges: InsightGraphEdge[] = []

  for (const rel of relationshipNodes) {
    const data = rel.data as RelationshipNodeData
    for (const sourceId of data.sourceIds) {
      const videoId = `video_${sourceId}`
      if (videoNodes.some((v) => v.id === videoId)) {
        edges.push({
          id: `edge_${videoId}_${rel.id}`,
          from: videoId,
          to: rel.id,
          kind: 'supports',
        })
      }
    }
  }

  for (const insight of insightNodes) {
    const data = insight.data as InsightNodeData
    for (const sourceId of data.sourceIds) {
      const videoId = `video_${sourceId}`
      if (videoNodes.some((v) => v.id === videoId)) {
        edges.push({
          id: `edge_${videoId}_${insight.id}`,
          from: videoId,
          to: insight.id,
          kind: 'derives',
        })
      }
    }
    for (const rel of relationshipNodes) {
      const relData = rel.data as RelationshipNodeData
      const overlap = relData.sourceIds.some((id) => data.sourceIds.includes(id))
      if (overlap) {
        edges.push({
          id: `edge_${rel.id}_${insight.id}`,
          from: rel.id,
          to: insight.id,
          kind: 'derives',
        })
      }
    }
  }

  for (const concept of conceptNodes) {
    const data = concept.data as import('@/lib/types/insight-graph').ConceptNodeData
    for (const sourceId of data.sourceIds) {
      const videoId = `video_${sourceId}`
      edges.push({
        id: `edge_${videoId}_${concept.id}`,
        from: videoId,
        to: concept.id,
        kind: 'contains',
      })
    }
    for (const claimId of data.claimIds) {
      const claimNodeId = `claim_${claimId}`
      if (claimNodes.some((c) => c.id === claimNodeId)) {
        edges.push({
          id: `edge_${concept.id}_${claimNodeId}`,
          from: concept.id,
          to: claimNodeId,
          kind: 'connects',
        })
      }
    }
  }

  for (const claim of claimNodes) {
    const data = claim.data as import('@/lib/types/insight-graph').ClaimNodeData
    const videoId = `video_${data.sourceId}`
    if (videoNodes.some((v) => v.id === videoId)) {
      edges.push({
        id: `edge_${videoId}_${claim.id}`,
        from: videoId,
        to: claim.id,
        kind: 'contains',
      })
    }
  }

  return edges
}

function buildSummary(
  videoCount: number,
  relationshipNodes: InsightGraphNode[],
  insightNodes: InsightGraphNode[],
): InsightGraphSummary {
  const disagreements = relationshipNodes.filter(
    (n) => n.type === 'different' || n.type === 'contradiction',
  ).length
  const connections = relationshipNodes.filter((n) => n.type === 'shared').length

  return {
    voiceCount: videoCount,
    connectionCount: connections,
    disagreementCount: disagreements,
    insightCount: insightNodes.length,
  }
}

export function buildInsightGraph(input: BuildInsightGraphInput): InsightGraphData {
  const claims = claimLookup(input.sources)
  const videoNodes = buildVideoNodes(input.sources)
  const sharedNodes = buildSharedNodes(input.result, claims)
  const differentNodes = buildDifferentNodes(input.result, claims)
  const contradictionNodes = buildContradictionNodes(input.result, claims)
  const uniqueNodes = buildUniqueNodes(input.sources, input.result, claims)
  const insightNodes = buildInsightNodes(input.result)
  const conceptClaimNodes = buildConceptAndClaimNodes(input.sources, claims)
  const conceptNodes = conceptClaimNodes.filter((n) => n.type === 'concept')
  const claimNodes = conceptClaimNodes.filter((n) => n.type === 'claim')

  const relationshipNodes = [
    ...sharedNodes,
    ...differentNodes,
    ...contradictionNodes,
    ...uniqueNodes,
  ]

  const nodes = [
    ...videoNodes,
    ...relationshipNodes,
    ...insightNodes,
    ...conceptNodes,
    ...claimNodes,
  ]

  const edges = buildEdges(
    videoNodes,
    relationshipNodes,
    insightNodes,
    conceptNodes,
    claimNodes,
  )

  return {
    version: '1',
    summary: buildSummary(input.sources.length, relationshipNodes, insightNodes),
    nodes,
    edges,
  }
}

export function attachInsightGraph(
  result: SynthesisResult,
  sources: SourceAnalysis[],
): SynthesisResult {
  const insightGraph = buildInsightGraph({ result, sources })
  return { ...result, insightGraph }
}
