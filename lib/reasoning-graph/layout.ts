import type { ReasoningGraph, ReasoningNode } from '@/lib/reasoning-graph/types'
import type { GraphFilter } from '@/lib/reasoning-graph/types'

const ROW_HEIGHT = 148
const NODE_WIDTH = 200
const CANVAS_PADDING = 24

export type LayoutPoint = { x: number; y: number; node: ReasoningNode }

export function isNodeVisible(
  node: ReasoningNode,
  expandedIds: Set<string>,
  filter: GraphFilter,
): boolean {
  if (!node.defaultVisible) {
    const parentExpanded = node.parentIds.some((pid) => expandedIds.has(pid))
    if (!parentExpanded) return false
  }

  if (filter === 'all') return true
  if (node.branch === filter || node.branch === 'neutral' || node.branch === 'emergent') {
    if (node.type === 'question' || node.type === 'judgment') return true
    if (filter === 'agree' && node.branch === 'agree') return true
    if (filter === 'divide' && node.branch === 'divide') return true
    if (filter === 'gap' && node.branch === 'gap') return true
    if (node.defaultVisible) return true
    return node.parentIds.some((pid) => expandedIds.has(pid))
  }

  if (node.type === 'question' || node.type === 'judgment') return true
  return false
}

export function layoutReasoningGraph(
  graph: ReasoningGraph,
  visibleNodes: ReasoningNode[],
): { points: LayoutPoint[]; width: number; height: number } {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const depth = new Map<string, number>()

  function getDepth(id: string): number {
    if (depth.has(id)) return depth.get(id)!
    const node = byId.get(id)
    if (!node || node.parentIds.length === 0) {
      depth.set(id, 0)
      return 0
    }
    const d = 1 + Math.max(...node.parentIds.map(getDepth))
    depth.set(id, d)
    return d
  }

  for (const n of visibleNodes) getDepth(n.id)

  const rows = new Map<number, ReasoningNode[]>()
  for (const n of visibleNodes) {
    const d = depth.get(n.id) ?? 0
    const row = rows.get(d) ?? []
    row.push(n)
    rows.set(d, row)
  }

  const points: LayoutPoint[] = []
  let maxWidth = 400

  for (const [d, rowNodes] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    const rowWidth = rowNodes.length * (NODE_WIDTH + 32)
    maxWidth = Math.max(maxWidth, rowWidth)
    const startX = (maxWidth - rowWidth) / 2 + NODE_WIDTH / 2
    rowNodes.forEach((node, i) => {
      points.push({
        x: startX + i * (NODE_WIDTH + 32),
        y: CANVAS_PADDING + d * ROW_HEIGHT,
        node,
      })
    })
  }

  const maxDepth = Math.max(0, ...depth.values())
  return {
    points,
    width: maxWidth + CANVAS_PADDING * 2,
    height: CANVAS_PADDING * 2 + maxDepth * ROW_HEIGHT + 80,
  }
}

export function edgePath(
  from: LayoutPoint,
  to: LayoutPoint,
): string {
  const x1 = from.x
  const y1 = from.y + 48
  const x2 = to.x
  const y2 = to.y - 8
  const midY = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
}
