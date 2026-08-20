import { describe, expect, it } from 'vitest'
import { getConnectedNodeIds, layoutPersonalGraph } from '@/lib/personal/graph-layout'
import type { PersonalGraphEdge, PersonalGraphNode } from '@/lib/types/personal'

describe('graph layout', () => {
  it('positions topic and source nodes', () => {
    const nodes: PersonalGraphNode[] = [
      { id: 'topic_ai', type: 'topic', label: 'ai', weight: 3, recent: true },
      { id: 'src_1', type: 'source', label: 'Video A', weight: 1, recent: true },
    ]

    const layout = layoutPersonalGraph(nodes, 600, 400)
    expect(layout.positions.get('topic_ai')).toBeDefined()
    expect(layout.positions.get('src_1')).toBeDefined()
  })

  it('finds connected nodes', () => {
    const edges: PersonalGraphEdge[] = [
      { id: 'e1', from: 'src_1', to: 'topic_ai' },
      { id: 'e2', from: 'topic_ai', to: 'topic_startup' },
    ]

    const connected = getConnectedNodeIds('topic_ai', edges)
    expect(connected.has('src_1')).toBe(true)
    expect(connected.has('topic_startup')).toBe(true)
  })
})
