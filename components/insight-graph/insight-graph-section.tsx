'use client'

import { useCallback, useMemo, useState } from 'react'
import { InsightGraphCanvas } from '@/components/insight-graph/insight-graph-canvas'
import { InsightGraphDetail } from '@/components/insight-graph/insight-graph-detail'
import { InsightGraphMobile } from '@/components/insight-graph/insight-graph-mobile'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { InsightGraphData } from '@/lib/types/insight-graph'
import type { Voice } from '@/lib/types/voice'

type Props = {
  graph: InsightGraphData
  voices: Voice[]
  compact?: boolean
  whyMode?: boolean
  onAskAboutInsight?: (statement: string) => void
}

export function InsightGraphSection({ graph, voices, compact, whyMode, onAskAboutInsight }: Props) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [mobileMapOpen, setMobileMapOpen] = useState(false)

  const selectedNode = useMemo(
    () => graph.nodes.find((n) => n.id === selectedId) ?? null,
    [graph.nodes, selectedId],
  )

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  if (graph.nodes.length === 0) return null

  return (
    <section id="insight-graph" className={whyMode ? '' : 'border-b border-line py-8 md:py-10'}>
      <div className={whyMode ? 'mb-4' : 'mb-6'}>
        <span className="mono-label text-[10px] text-ink-soft">
          {whyMode || compact ? t('graph.reasoningMap') : t('graph.insightGraph')}
        </span>
        <p className="mt-2 max-w-2xl font-serif text-sm text-ink-soft">
          {whyMode
            ? t('graph.hintWhy')
            : compact
              ? t('graph.hintCompact')
              : t('graph.hintFull')}
        </p>
        {compact && !whyMode && (
          <p className="mono mt-2 text-[10px] text-ink-soft">
            {graph.summary.insightCount === 1
              ? t('graph.summaryOneInsight', {
                  voices: graph.summary.voiceCount,
                  connections: graph.summary.connectionCount,
                })
              : t('graph.summary', {
                  voices: graph.summary.voiceCount,
                  connections: graph.summary.connectionCount,
                  insights: graph.summary.insightCount,
                })}
          </p>
        )}
      </div>

      <InsightGraphMobile
        graph={graph}
        voices={voices}
        onSelectNode={(id) => {
          setSelectedId(id)
          setMobileMapOpen(true)
        }}
      />

      <div className="mt-6 hidden md:block">
        <div className="grid border border-line bg-background lg:grid-cols-[1fr_320px]">
          <div>
            <div className="border-b border-line px-4 py-3">
              <div className="flex flex-wrap gap-4">
                <Legend icon="●" label={t('graph.legendVoice')} />
                <Legend icon="▣" label={t('graph.legendShared')} />
                <Legend icon="△" label={t('graph.legendDifferent')} />
                <Legend icon="⊘" label={t('graph.legendConflict')} />
                <Legend icon="✦" label={t('graph.legendInsight')} highlight />
              </div>
            </div>
            <InsightGraphCanvas
              graph={graph}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={setSelectedId}
              onToggleExpand={toggleExpand}
            />
          </div>
          <InsightGraphDetail
            node={selectedNode}
            voices={voices}
            onAskAboutInsight={onAskAboutInsight}
            onClose={() => setSelectedId(null)}
          />
        </div>
      </div>

      <div className="mt-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMapOpen(true)}
          className="mono-label w-full border border-line px-4 py-3 text-[10px] hover:bg-ink hover:text-background"
        >
          {whyMode ? t('graph.viewMap') : t('graph.exploreMap')}
        </button>
      </div>

      {mobileMapOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="mono-label text-[10px] text-ink-soft">{t('graph.insightMap')}</span>
            <button
              type="button"
              onClick={() => setMobileMapOpen(false)}
              className="mono text-[10px] text-ink-soft"
            >
              {t('common.close').toUpperCase()}
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <InsightGraphCanvas
              graph={graph}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={setSelectedId}
              onToggleExpand={toggleExpand}
            />
          </div>
          {selectedNode && (
            <div className="max-h-[45vh] overflow-y-auto border-t border-line">
              <InsightGraphDetail
                node={selectedNode}
                voices={voices}
                onAskAboutInsight={onAskAboutInsight}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Legend({
  icon,
  label,
  highlight,
}: {
  icon: string
  label: string
  highlight?: boolean
}) {
  return (
    <span
      className={`mono text-[10px] ${highlight ? 'text-mint-ink' : 'text-ink-soft'}`}
    >
      {icon} {label}
    </span>
  )
}
