import type {
  ReasoningEdge,
  ReasoningGraph,
  ReasoningNode,
  ReasoningNodeType,
} from '@/lib/reasoning-graph/types'
import {
  buildExplorerGraph,
  getEvidenceForClaim,
  type RelationshipExplorerGraph,
} from '@/lib/visualization/relationship-explorer-model'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

function edge(
  from: string,
  to: string,
  kind: ReasoningEdge['kind'],
  label?: string,
): ReasoningEdge {
  return { id: `e_${from}_${to}`, from, to, kind, label }
}

function linkParentChild(
  parent: ReasoningNode,
  child: ReasoningNode,
  edges: ReasoningEdge[],
  kind: ReasoningEdge['kind'] = 'contains',
  label?: string,
) {
  if (!parent.childIds.includes(child.id)) parent.childIds.push(child.id)
  if (!child.parentIds.includes(parent.id)) child.parentIds.push(parent.id)
  edges.push(edge(parent.id, child.id, kind, label))
}

export function buildReasoningGraphFromExplorer(
  ex: RelationshipExplorerGraph,
  judgmentSummary?: string,
  judgmentConfidence?: 'strong' | 'moderate' | 'weak',
): ReasoningGraph {
  const nodes: ReasoningNode[] = []
  const edges: ReasoningEdge[] = []
  const sourceById = new Map(ex.sources.map((s) => [s.sourceId, s]))

  const question: ReasoningNode = {
    id: 'node_question',
    type: 'question',
    title: ex.question || 'What do these sources mean together?',
    summary: ex.question,
    sourceIds: ex.sources.filter((s) => !s.excluded).map((s) => s.sourceId),
    claimIds: [],
    evidenceCount: 0,
    parentIds: [],
    childIds: [],
    defaultVisible: true,
    branch: 'neutral',
  }
  nodes.push(question)

  const judgment: ReasoningNode = {
    id: 'node_judgment',
    type: 'judgment',
    title: ex.judgmentStatement,
    summary: judgmentSummary,
    confidence: judgmentConfidence,
    reasoningLevel: 'SYNTHESIZED',
    sourceIds: [],
    claimIds: [],
    evidenceCount: 0,
    parentIds: [],
    childIds: [],
    defaultVisible: true,
    branch: 'neutral',
  }
  nodes.push(judgment)
  linkParentChild(question, judgment, edges)

  const agreeBranch: ReasoningNode = {
    id: 'branch_agree',
    type: 'agreement',
    title: 'Agreement',
    summary:
      ex.stats.agreementCount > 0
        ? `${ex.stats.agreementCount} agreement cluster${ex.stats.agreementCount !== 1 ? 's' : ''} · ${ex.stats.agreementSourceCount} source${ex.stats.agreementSourceCount !== 1 ? 's' : ''}`
        : 'No verified cross-source agreements',
    sourceIds: [],
    claimIds: [],
    evidenceCount: 0,
    parentIds: [],
    childIds: [],
    defaultVisible: true,
    branch: 'agree',
  }

  const divideBranch: ReasoningNode = {
    id: 'branch_divide',
    type: 'disagreement',
    title: 'Divide',
    summary:
      ex.stats.divideSourceCount > 0 || ex.stats.tradeOffCount > 0
        ? `${ex.stats.divideCount + ex.stats.tradeOffCount} verified tension or contradiction${ex.stats.divideCount + ex.stats.tradeOffCount !== 1 ? 's' : ''} · ${ex.stats.divideSourceCount} source${ex.stats.divideSourceCount !== 1 ? 's' : ''}`
        : '0 tension or contradictions',
    sourceIds: [],
    claimIds: [],
    evidenceCount: 0,
    parentIds: [],
    childIds: [],
    defaultVisible: true,
    branch: 'divide',
  }

  const gapBranch: ReasoningNode = {
    id: 'branch_gap',
    type: 'uncertainty',
    title: 'Gaps',
    summary:
      ex.stats.gapCount > 0
        ? `${ex.stats.gapCount} area${ex.stats.gapCount !== 1 ? 's' : ''} with insufficient evidence`
        : 'No major knowledge gaps flagged',
    sourceIds: [],
    claimIds: [],
    evidenceCount: 0,
    parentIds: [],
    childIds: [],
    defaultVisible: true,
    branch: 'gap',
  }

  for (const branch of [agreeBranch, divideBranch, gapBranch]) {
    nodes.push(branch)
    linkParentChild(judgment, branch, edges)
  }

  for (const pattern of ex.patterns) {
    const branch =
      pattern.visualKind === 'agree'
        ? agreeBranch
        : pattern.visualKind === 'divide' || pattern.visualKind === 'trade-off'
          ? divideBranch
          : agreeBranch

    const patternNode: ReasoningNode = {
      id: `pattern_${pattern.id}`,
      type: 'pattern',
      title: pattern.title,
      summary: pattern.description,
      confidence: pattern.confidence,
      reasoningLevel: 'SYNTHESIZED',
      sourceIds: pattern.sourceIds,
      claimIds: pattern.claimIds,
      relationshipType: pattern.type,
      evidenceCount: pattern.claimCount,
      parentIds: [],
      childIds: [],
      patternId: pattern.id,
      defaultVisible: ex.patterns.length <= 7,
      branch: branch.branch,
    }
    nodes.push(patternNode)
    const relKind =
      pattern.visualKind === 'trade-off'
        ? 'trade_off'
        : pattern.visualKind === 'divide'
          ? 'contradicts'
          : 'supports'
    linkParentChild(branch, patternNode, edges, relKind, pattern.type.replace(/_/g, ' '))
  }

  for (const rel of ex.relationships) {
    const branch = rel.visualKind === 'agree' ? agreeBranch : divideBranch
    const parentPattern = ex.patterns.find((p) => p.relationshipIds.includes(rel.id))
    const parentNode = parentPattern
      ? nodes.find((n) => n.patternId === parentPattern.id)
      : branch
    if (!parentNode) continue
    const argNode: ReasoningNode = {
      id: `arg_${rel.id}`,
      type: 'argument',
      title: rel.type.replace(/_/g, ' '),
      summary: rel.explanation,
      confidence: rel.confidence,
      reasoningLevel: 'SYNTHESIZED',
      sourceIds: [rel.fromSourceId, rel.toSourceId],
      claimIds: [rel.fromClaimId, rel.toClaimId],
      relationshipType: rel.type,
      evidenceCount: 2,
      parentIds: [],
      childIds: [],
      relationshipId: rel.id,
      defaultVisible: false,
      branch: branch.branch,
    }
    nodes.push(argNode)
    const edgeKind =
      rel.visualKind === 'trade-off'
        ? 'trade_off'
        : rel.visualKind === 'divide'
          ? 'contradicts'
          : rel.visualKind === 'agree'
            ? 'supports'
            : 'complements'
    linkParentChild(parentNode, argNode, edges, edgeKind)

    for (const claimId of [rel.fromClaimId, rel.toClaimId]) {
      const claim = ex.claims.find((c) => c.id === claimId)
      if (!claim) continue
      const src = sourceById.get(claim.sourceId)
      const claimNodeId = `claim_${claim.id}`
      if (nodes.some((n) => n.id === claimNodeId)) continue

      const evidence = getEvidenceForClaim(ex, claim.id)
      const claimNode: ReasoningNode = {
        id: claimNodeId,
        type: 'claim',
        title: claim.statement,
        summary: claim.statement,
        confidence: claim.confidence,
        reasoningLevel: evidence.length > 0 ? 'SUPPORTED' : 'SYNTHESIZED',
        sourceIds: [claim.sourceId],
        claimIds: [claim.id],
        evidenceCount: evidence.length,
        parentIds: [],
        childIds: [],
        claimId: claim.id,
        videoId: claim.videoId,
        voiceIndex: claim.voiceIndex,
        thumbnail: src?.thumbnail,
        timestampStart: evidence[0]?.timestampStart ?? null,
        defaultVisible: false,
        branch: branch.branch,
      }
      nodes.push(claimNode)
      linkParentChild(argNode, claimNode, edges, 'derived_from')

      for (const ev of evidence) {
        const evNode: ReasoningNode = {
          id: `evidence_${ev.id}`,
          type: 'evidence',
          title: ev.text.slice(0, 120),
          summary: ev.text,
          reasoningLevel: 'SUPPORTED',
          sourceIds: [ev.sourceId],
          claimIds: [claim.id],
          evidenceCount: 1,
          parentIds: [],
          childIds: [],
          evidenceId: ev.id,
          claimId: claim.id,
          videoId: ev.videoId,
          voiceIndex: ev.voiceIndex,
          timestampStart: ev.timestampStart,
          defaultVisible: false,
          branch: branch.branch,
        }
        nodes.push(evNode)
        linkParentChild(claimNode, evNode, edges, 'evidence_for')
      }
    }
  }

  for (const gap of ex.gaps) {
    const gapNode: ReasoningNode = {
      id: `gap_${gap.id}`,
      type: 'uncertainty',
      title: gap.title,
      summary: gap.whyItMatters ?? gap.question,
      sourceIds: [],
      claimIds: [],
      evidenceCount: 0,
      parentIds: [],
      childIds: [],
      gapId: gap.id,
      defaultVisible: false,
      branch: 'gap',
    }
    nodes.push(gapNode)
    linkParentChild(gapBranch, gapNode, edges)
  }

  if (ex.emergentInsights.length > 0) {
    const emergentBranch: ReasoningNode = {
      id: 'branch_emergent',
      type: 'emergent',
      title: 'What emerges',
      summary: `${ex.emergentInsights.length} cross-source insight${ex.emergentInsights.length !== 1 ? 's' : ''}`,
      sourceIds: [],
      claimIds: [],
      evidenceCount: 0,
      parentIds: [],
      childIds: [],
      defaultVisible: ex.emergentInsights.length > 0,
      branch: 'emergent',
    }
    nodes.push(emergentBranch)
    linkParentChild(judgment, emergentBranch, edges)

    for (const ins of ex.emergentInsights) {
      const insNode: ReasoningNode = {
        id: `emergent_${ins.id}`,
        type: 'emergent',
        title: ins.statement,
        summary: ins.explanation,
        confidence: ins.confidence,
        reasoningLevel: 'INFERRED',
        sourceIds: [],
        claimIds: ins.claimIds,
        evidenceCount: ins.evidencePath.length,
        parentIds: [],
        childIds: [],
        emergentId: ins.id,
        defaultVisible: false,
        branch: 'emergent',
      }
      nodes.push(insNode)
      linkParentChild(emergentBranch, insNode, edges, 'derived_from')
    }
  }

  for (const src of ex.sources.filter((s) => s.excluded)) {
    const exNode: ReasoningNode = {
      id: `excluded_${src.sourceId}`,
      type: 'excluded',
      title: src.title,
      summary: src.excludeReason,
      sourceIds: [src.sourceId],
      claimIds: [],
      evidenceCount: 0,
      parentIds: [],
      childIds: [],
      videoId: src.videoId,
      voiceIndex: src.voiceIndex,
      thumbnail: src.thumbnail,
      defaultVisible: false,
      branch: 'neutral',
    }
    nodes.push(exNode)
    linkParentChild(question, exNode, edges)
  }

  if (!ex.hasVerifiedRelationships && ex.patterns.length === 0) {
    const emptyNode: ReasoningNode = {
      id: 'node_sparse',
      type: 'argument',
      title: ex.emptyMessage ?? 'No verified cross-source relationships',
      summary: 'Sources may address independent questions.',
      sourceIds: [],
      claimIds: [],
      evidenceCount: 0,
      parentIds: [],
      childIds: [],
      defaultVisible: true,
      branch: 'neutral',
    }
    nodes.push(emptyNode)
    linkParentChild(judgment, emptyNode, edges)
  }

  return {
    version: ex.version,
    question: ex.question,
    judgmentStatement: ex.judgmentStatement,
    judgmentSummary,
    judgmentConfidence,
    nodes,
    edges,
    provenance: ex.provenance,
    stats: {
      patternCount: ex.stats.patternCount,
      agreementCount: ex.stats.agreementCount,
      divideCount: ex.stats.divideCount + ex.stats.tradeOffCount,
      gapCount: ex.stats.gapCount,
      emergentCount: ex.stats.emergentCount,
      claimCount: ex.claims.length,
    },
    hasVerifiedRelationships: ex.hasVerifiedRelationships,
    emptyMessage: ex.emptyMessage,
  }
}

export function buildReasoningGraph(
  document: SynthesisDocument,
  survival?: {
    synthesis: { explanation: string; confidence: 'strong' | 'moderate' | 'weak' }
  },
): ReasoningGraph | null {
  const ex = buildExplorerGraph(document)
  if (!ex) return null
  return buildReasoningGraphFromExplorer(
    ex,
    survival?.synthesis.explanation,
    survival?.synthesis.confidence,
  )
}

export function nodeById(graph: ReasoningGraph, id: string): ReasoningNode | undefined {
  return graph.nodes.find((n) => n.id === id)
}

export function descendants(graph: ReasoningGraph, rootId: string): Set<string> {
  const ids = new Set<string>()
  const queue = [rootId]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (ids.has(id)) continue
    ids.add(id)
    const node = nodeById(graph, id)
    if (!node) continue
    for (const cid of node.childIds) queue.push(cid)
  }
  return ids
}

export function ancestors(graph: ReasoningGraph, nodeId: string): Set<string> {
  const ids = new Set<string>()
  let current = nodeById(graph, nodeId)
  while (current) {
    ids.add(current.id)
    const parentId = current.parentIds[0]
    if (!parentId) break
    current = nodeById(graph, parentId)
  }
  return ids
}

export function resolveAskFocus(question: string): GraphFilter | null {
  const q = question.toLowerCase()
  if (q.includes('disagree') || q.includes('divide')) return 'divide'
  if (q.includes('agree') || q.includes('consensus')) return 'agree'
  if (q.includes('missing') || q.includes('gap') || q.includes('weak')) return 'gap'
  return null
}

export function resolveProvenanceNodeId(targetId: string, kind: string): string {
  if (kind === 'agree') return 'branch_agree'
  if (kind === 'pattern') return `pattern_${targetId}`
  if (kind === 'gap') return `gap_${targetId}`
  return targetId
}

// re-export for typing in components
import type { GraphFilter } from '@/lib/reasoning-graph/types'
