'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReasoningGraphCanvas } from '@/components/reasoning-graph/reasoning-graph-canvas'
import { ReasoningGraphDetail } from '@/components/reasoning-graph/reasoning-graph-detail'
import { ReasoningGraphMobile } from '@/components/reasoning-graph/reasoning-graph-mobile'
import {
  ancestors,
  descendants,
  resolveAskFocus,
  resolveProvenanceNodeId,
} from '@/lib/reasoning-graph/build-reasoning-graph'
import type { GraphFilter, GraphFocusIntent, ReasoningGraph, ReasoningNode } from '@/lib/reasoning-graph/types'
import type { ExplorerSource } from '@/lib/visualization/relationship-explorer-model'
import { useTranslation } from '@/lib/i18n/locale-context'

type Props = {
  graph: ReasoningGraph
  sources: ExplorerSource[]
  focusIntent?: GraphFocusIntent | null
  onClaimSelect?: (claimId: string) => void
}

export function ReasoningGraphExplorer({
  graph,
  sources,
  focusIntent,
  onClaimSelect,
}: Props) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [filter, setFilter] = useState<GraphFilter>('all')

  const selectedNode = useMemo(
    () => (selectedId ? graph.nodes.find((n) => n.id === selectedId) ?? null : null),
    [graph.nodes, selectedId],
  )

  const breadcrumb = useMemo(() => {
    if (!selectedId) return []
    const chain = [...ancestors(graph, selectedId)]
    return chain
      .map((id) => graph.nodes.find((n) => n.id === id))
      .filter((n): n is ReasoningNode => Boolean(n))
  }, [graph, selectedId])

  const applyFocus = useCallback(
    (intent: GraphFocusIntent) => {
      if (intent.kind === 'filter') {
        setFilter(intent.filter)
        const branchId =
          intent.filter === 'agree'
            ? 'branch_agree'
            : intent.filter === 'divide'
              ? 'branch_divide'
              : 'branch_gap'
        setSelectedId(branchId)
        setExpandedIds(new Set(['node_judgment', branchId]))
        return
      }
      if (intent.kind === 'node') {
        const node = graph.nodes.find((n) => n.id === intent.nodeId)
        if (!node) return
        const expand = new Set(ancestors(graph, intent.nodeId))
        setExpandedIds(expand)
        setSelectedId(intent.nodeId)
        return
      }
      if (intent.kind === 'ask') {
        const f = resolveAskFocus(intent.question)
        if (f) {
          applyFocus({ kind: 'filter', filter: f })
        }
      }
    },
    [graph],
  )

  useEffect(() => {
    if (focusIntent) applyFocus(focusIntent)
  }, [focusIntent, applyFocus])

  const handleSelect = useCallback(
    (node: ReasoningNode) => {
      setSelectedId(node.id)
      if (node.childIds.length > 0) {
        setExpandedIds((prev) => {
          const next = new Set(prev)
          if (next.has(node.id)) {
            for (const desc of descendants(graph, node.id)) {
              if (desc !== node.id) next.delete(desc)
            }
            next.delete(node.id)
          } else {
            next.add(node.id)
            for (const pid of ancestors(graph, node.id)) next.add(pid)
          }
          return next
        })
      }
      if (node.claimId) onClaimSelect?.(node.claimId)
    },
    [graph, onClaimSelect],
  )

  const reset = () => {
    setSelectedId(null)
    setExpandedIds(new Set())
    setFilter('all')
  }

  const sourceMeta = sources.map((s) => ({
    sourceId: s.sourceId,
    videoId: s.videoId,
    voiceIndex: s.voiceIndex,
    title: s.title,
    thumbnail: s.thumbnail,
  }))

  return (
    <section className="mt-10" aria-label={t('reasoningGraph.title')}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-soft">
            {t('reasoningGraph.title')}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{t('reasoningGraph.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'agree', 'divide', 'gap'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f)
                if (f !== 'all') {
                  applyFocus({ kind: 'filter', filter: f })
                }
              }}
              className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
                filter === f
                  ? 'bg-ink text-background'
                  : 'border border-line bg-background text-ink-soft hover:border-ink'
              }`}
            >
              {f === 'all'
                ? t('explorer.filterAll')
                : f === 'agree'
                  ? t('explorer.filterAgree')
                  : f === 'divide'
                    ? t('explorer.filterDivide')
                    : t('explorer.filterGap')}
            </button>
          ))}
          {(selectedId || expandedIds.size > 0 || filter !== 'all') && (
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-line px-3 py-1 text-[10px] font-medium text-ink-soft hover:text-ink"
            >
              {t('explorer.reset')}
            </button>
          )}
        </div>
      </div>

      {breadcrumb.length > 1 && (
        <nav className="mt-4 flex flex-wrap items-center gap-1 text-[10px] text-ink-soft" aria-label="Breadcrumb">
          {breadcrumb.map((node, i) => (
            <span key={node.id} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>›</span>}
              <button
                type="button"
                onClick={() => handleSelect(node)}
                className="max-w-[140px] truncate hover:text-ink"
              >
                {node.title.slice(0, 40)}
              </button>
            </span>
          ))}
        </nav>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="hidden md:block">
            <ReasoningGraphCanvas
              graph={graph}
              selectedId={selectedId}
              expandedIds={expandedIds}
              filter={filter}
              onSelect={handleSelect}
            />
          </div>
          <ReasoningGraphMobile
            graph={graph}
            selectedId={selectedId}
            expandedIds={expandedIds}
            filter={filter}
            onSelect={handleSelect}
          />
        </div>
        <div className="hidden lg:block">
          <ReasoningGraphDetail node={selectedNode} sources={sourceMeta} />
        </div>
      </div>

      {selectedNode && (
        <div className="mt-4 lg:hidden">
          <ReasoningGraphDetail node={selectedNode} sources={sourceMeta} />
        </div>
      )}

      {!graph.hasVerifiedRelationships && graph.stats.patternCount === 0 && (
        <p className="mt-4 text-center text-sm text-ink-soft">
          {graph.emptyMessage ?? t('reasoningGraph.sparse')}
        </p>
      )}
    </section>
  )
}

export { resolveProvenanceNodeId }
