import type { InsightGraphEdge, InsightGraphNode } from '@/lib/types/insight-graph'

export type GraphLayoutPosition = {
  x: number
  y: number
}

export type LaidOutInsightGraph = {
  positions: Map<string, GraphLayoutPosition>
  width: number
  height: number
}

const ROW = {
  insight: 0.12,
  relationship: 0.48,
  video: 0.88,
  concept: 0.32,
  claim: 0.68,
} as const

function visibleNodes(nodes: InsightGraphNode[]): InsightGraphNode[] {
  return nodes.filter((n) => n.defaultVisible)
}

/** Layered layout: insights top, relationships middle, videos bottom. */
export function layoutInsightGraph(
  nodes: InsightGraphNode[],
  edges: InsightGraphEdge[],
  width: number,
  height: number,
): LaidOutInsightGraph {
  const positions = new Map<string, GraphLayoutPosition>()
  const primary = visibleNodes(nodes)
  const insights = primary.filter((n) => n.type === 'insight')
  const relationships = primary.filter(
    (n) =>
      n.type === 'shared' ||
      n.type === 'different' ||
      n.type === 'contradiction' ||
      n.type === 'unique',
  )
  const videos = nodes.filter((n) => n.type === 'video')
  const concepts = nodes.filter((n) => n.type === 'concept')
  const claims = nodes.filter((n) => n.type === 'claim')

  const padX = 72
  const usable = width - padX * 2

  function placeRow(row: InsightGraphNode[], yRatio: number) {
    row.forEach((node, i) => {
      const x =
        row.length === 1
          ? width / 2
          : padX + (usable * i) / Math.max(row.length - 1, 1)
      positions.set(node.id, { x, y: height * yRatio })
    })
  }

  placeRow(insights, ROW.insight)
  placeRow(relationships, ROW.relationship)
  placeRow(videos, ROW.video)

  concepts.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(concepts.length, 1) - Math.PI / 2
    positions.set(node.id, {
      x: width / 2 + Math.cos(angle) * (usable * 0.25),
      y: height * ROW.concept,
    })
  })

  claims.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(claims.length, 1)
    positions.set(node.id, {
      x: width / 2 + Math.cos(angle) * (usable * 0.35),
      y: height * ROW.claim,
    })
  })

  for (const edge of edges) {
    if (!positions.has(edge.from) && nodes.find((n) => n.id === edge.from)) {
      positions.set(edge.from, { x: width / 2, y: height * ROW.relationship })
    }
    if (!positions.has(edge.to) && nodes.find((n) => n.id === edge.to)) {
      positions.set(edge.to, { x: width / 2, y: height * ROW.relationship })
    }
  }

  return { positions, width, height }
}

export function getConnectedNodeIds(
  nodeId: string,
  edges: InsightGraphEdge[],
): Set<string> {
  const connected = new Set<string>([nodeId])
  for (const edge of edges) {
    if (edge.from === nodeId) connected.add(edge.to)
    if (edge.to === nodeId) connected.add(edge.from)
  }
  return connected
}

export function nodeVisualRadius(node: InsightGraphNode): number {
  switch (node.type) {
    case 'insight':
      return 22
    case 'video':
      return 10
    case 'shared':
    case 'different':
    case 'contradiction':
      return 14
    case 'unique':
      return 12
    case 'concept':
      return 11
    case 'claim':
      return 8
    default:
      return 10
  }
}
