import type { PersonalGraphEdge, PersonalGraphNode } from '@/lib/types/personal'

export type GraphLayoutPosition = {
  x: number
  y: number
}

export type LaidOutGraph = {
  positions: Map<string, GraphLayoutPosition>
  width: number
  height: number
}

const NODE_RADIUS = {
  source: 5,
  topic: 14,
  default: 8,
} as const

export function nodeRadius(node: PersonalGraphNode): number {
  if (node.type === 'topic') return NODE_RADIUS.topic + Math.min(node.weight, 6)
  if (node.type === 'source') return NODE_RADIUS.source
  return NODE_RADIUS.default
}

/** Radial layout: topics inner ring, sources outer ring. */
export function layoutPersonalGraph(
  nodes: PersonalGraphNode[],
  width: number,
  height: number,
): LaidOutGraph {
  const positions = new Map<string, GraphLayoutPosition>()
  const topics = nodes.filter((n) => n.type === 'topic')
  const sources = nodes.filter((n) => n.type === 'source')
  const others = nodes.filter((n) => n.type !== 'topic' && n.type !== 'source')

  const cx = width / 2
  const cy = height / 2
  const topicRadius = Math.min(width, height) * 0.18
  const sourceRadius = Math.min(width, height) * 0.4

  topics.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(topics.length, 1) - Math.PI / 2
    positions.set(node.id, {
      x: cx + Math.cos(angle) * topicRadius,
      y: cy + Math.sin(angle) * topicRadius,
    })
  })

  sources.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(sources.length, 1) - Math.PI / 2
    positions.set(node.id, {
      x: cx + Math.cos(angle) * sourceRadius,
      y: cy + Math.sin(angle) * sourceRadius,
    })
  })

  others.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(others.length, 1)
    positions.set(node.id, {
      x: cx + Math.cos(angle) * (topicRadius + sourceRadius) / 2,
      y: cy + Math.sin(angle) * (topicRadius + sourceRadius) / 2,
    })
  })

  return { positions, width, height }
}

export function getConnectedNodeIds(
  nodeId: string,
  edges: PersonalGraphEdge[],
): Set<string> {
  const connected = new Set<string>([nodeId])
  for (const edge of edges) {
    if (edge.from === nodeId) connected.add(edge.to)
    if (edge.to === nodeId) connected.add(edge.from)
  }
  return connected
}

export function isPatternEdge(edge: PersonalGraphEdge): boolean {
  return edge.id.startsWith('pattern_') || Boolean(edge.label)
}
