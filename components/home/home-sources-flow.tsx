'use client'

import { AsterismMark } from '@/components/brand/asterism-mark'
import { HomeVideoCard } from '@/components/home/home-video-card'
import {
  DEMO_SYNTHESIS_MAP,
  RELATIONSHIP_LABELS,
  buildMapFromVoices,
  shouldShowDemoAnimation,
  type RelationshipEdge,
  type VisualSynthesisMapData,
} from '@/lib/home/visual-synthesis-map-model'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
}

function RelationshipBridge({ edge }: { edge: RelationshipEdge }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center px-2 md:px-3">
      <div className="hidden h-px w-6 bg-line md:block" />
      <span className="mono-label my-2 whitespace-nowrap border border-line px-2 py-1 text-[9px] text-ink">
        {RELATIONSHIP_LABELS[edge.type]}
      </span>
      <p className="mono hidden max-w-[8rem] text-center text-[9px] leading-relaxed text-ink-soft lg:block">
        {edge.explanation.slice(0, 72)}
        {edge.explanation.length > 72 ? '…' : ''}
      </p>
      <div className="hidden h-px w-6 bg-line md:block" />
    </div>
  )
}

function FourthIdeaPreview({ data }: { data: VisualSynthesisMapData }) {
  if (!data.insight) return null

  return (
    <div className="mt-5 border border-line bg-paper-2/80 p-4 md:mt-0 md:max-w-xs md:border-l-2 md:border-mint md:pl-4">
      <div className="flex items-start gap-3">
        <AsterismMark size={22} className="mt-0.5 shrink-0 text-ink" />
        <div>
          <span className="mono-label text-[10px] text-ink-soft">FOURTH IDEA PREVIEW</span>
          <p className="mt-2 font-serif text-base leading-snug md:text-lg">
            &ldquo;{data.insight.statement}&rdquo;
          </p>
          <p className="mt-2 font-serif text-sm text-ink-soft">{data.insight.explanation}</p>
        </div>
      </div>
    </div>
  )
}

const MAX_VISIBLE_SOURCES = 3

function SourcesRow({
  data,
  voices,
  onRemove,
  showBridges = false,
}: {
  data: VisualSynthesisMapData
  voices: Voice[]
  onRemove?: (id: string) => void
  showBridges?: boolean
}) {
  const isDemo = data.mode === 'demo'
  const filled = isDemo
    ? data.sources
    : voices.map((v) => ({
        id: v.id,
        voiceIndex: v.n,
        title: v.title,
        thumbnail: v.thumbnail,
        filled: true as const,
      }))

  if (filled.length === 0) return null

  const visible = filled.slice(0, MAX_VISIBLE_SOURCES)
  const bridges = showBridges && data.edges.length > 0 && visible.length >= 2

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-auto pb-1 sm:flex-row sm:items-stretch sm:gap-0">
      {visible.map((node, index) => {
        const voice = voices.find((v) => v.id === node.id)
        const edge = data.edges[index - 1]

        return (
          <div key={node.id} className="flex min-w-0 flex-1 items-stretch sm:contents">
            {bridges && index > 0 && edge && (
              <div className="flex items-center justify-center sm:contents">
                <RelationshipBridge edge={edge} />
              </div>
            )}
            <div className="min-w-0 flex-1 sm:min-w-[180px] sm:max-w-[220px]">
              {isDemo ? (
                <HomeVideoCard sample={{ ...node, sample: true }} />
              ) : voice ? (
                <HomeVideoCard voice={voice} onRemove={onRemove ? () => onRemove(voice.id) : undefined} />
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function useHomeMapData(voices: Voice[]) {
  const isDemo = shouldShowDemoAnimation(voices)
  const data = isDemo ? DEMO_SYNTHESIS_MAP : buildMapFromVoices(voices)
  return { isDemo, data }
}

export function HomeVideoSources({ voices, onRemove }: Props & { onRemove?: (id: string) => void }) {
  const { isDemo, data } = useHomeMapData(voices)

  if (data.mode === 'empty') return null

  return (
    <div className="w-full">
      {isDemo && (
        <p className="mono mb-3 text-[10px] text-ink-soft">
          SAMPLE — Add your own URLs to replace this preview
        </p>
      )}

      <SourcesRow data={data} voices={voices} onRemove={onRemove} />

      {voices.length > MAX_VISIBLE_SOURCES && (
        <p className="mono mt-3 text-[10px] text-ink-soft">
          +{voices.length - MAX_VISIBLE_SOURCES} more source
          {voices.length - MAX_VISIBLE_SOURCES === 1 ? '' : 's'} in this synthesis
        </p>
      )}
    </div>
  )
}

export function HomeSynthesisPreview({ voices }: Props) {
  const { isDemo, data } = useHomeMapData(voices)

  const hasPreview =
    isDemo || (data.edges.length > 0 && voices.length >= 2) || Boolean(data.insight)

  if (!hasPreview) return null

  const showBridges = data.edges.length > 0 && (isDemo || voices.length >= 2)

  return (
    <div className="w-full">
      <span className="mono-label text-[10px] text-ink-soft">
        {data.insight ? 'RELATIONSHIP · FOURTH IDEA' : 'RELATIONSHIP PREVIEW'}
      </span>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        {showBridges && (
          <div className="flex flex-wrap items-center gap-2 md:gap-0">
            {data.edges.slice(0, MAX_VISIBLE_SOURCES - 1).map((edge) => (
              <RelationshipBridge key={edge.id} edge={edge} />
            ))}
          </div>
        )}

        {data.insight && <FourthIdeaPreview data={data} />}
      </div>

      {data.statusMessage && !isDemo && (
        <p className="mono mt-3 text-[11px] text-ink-soft">{data.statusMessage}</p>
      )}

      {data.showNoStrongRelationship && (
        <p className="mono mt-3 text-[11px] text-ink-soft">These sources may not strongly converge.</p>
      )}
    </div>
  )
}

/** @deprecated Use HomeVideoSources + HomeSynthesisPreview */
export function HomeSourcesFlow({ voices, onRemove }: Props & { onRemove?: (id: string) => void }) {
  return (
    <>
      <HomeVideoSources voices={voices} onRemove={onRemove} />
      <HomeSynthesisPreview voices={voices} />
    </>
  )
}
