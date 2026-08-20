'use client'

import type { InsightGraphData, InsightGraphNode } from '@/lib/types/insight-graph'
import type { Voice } from '@/lib/types/voice'

type Props = {
  graph: InsightGraphData
  voices: Voice[]
  onSelectNode: (id: string) => void
}

export function InsightGraphMobile({ graph, voices, onSelectNode }: Props) {
  const insights = graph.nodes.filter((n) => n.type === 'insight' && n.defaultVisible)
  const relationships = graph.nodes.filter(
    (n) =>
      n.defaultVisible &&
      (n.type === 'shared' || n.type === 'different' || n.type === 'contradiction'),
  )

  return (
    <div className="space-y-8 md:hidden">
      {insights.map((node) => (
        <InsightCard key={node.id} node={node} onSelect={() => onSelectNode(node.id)} />
      ))}

      {relationships.length > 0 && (
        <div>
          <span className="mono-label text-[10px] text-ink-soft">RELATIONSHIPS</span>
          <div className="mt-4 space-y-3">
            {relationships.map((node) => (
              <RelationshipCard key={node.id} node={node} onSelect={() => onSelectNode(node.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InsightCard({ node, onSelect }: { node: InsightGraphNode; onSelect: () => void }) {
  const data = node.data as import('@/lib/types/insight-graph').InsightNodeData
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full border border-line bg-mint/30 p-5 text-left"
    >
      <span className="mono-label text-[10px] text-mint-ink">✦ EMERGING INSIGHT</span>
      <p className="mt-3 font-serif text-xl font-medium leading-snug">&ldquo;{data.statement}&rdquo;</p>
    </button>
  )
}

function RelationshipCard({ node, onSelect }: { node: InsightGraphNode; onSelect: () => void }) {
  const data = node.data as import('@/lib/types/insight-graph').RelationshipNodeData
  const icon =
    node.type === 'shared' ? '▣' : node.type === 'different' ? '△' : node.type === 'contradiction' ? '⊘' : '•'

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full border border-line p-4 text-left hover:bg-paper-2"
    >
      <span className="mono text-[10px] text-ink-soft">
        {icon} {node.label}
      </span>
      <p className="mt-2 font-serif text-base leading-relaxed">{data.statement}</p>
    </button>
  )
}
