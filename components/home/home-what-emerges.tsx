'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AsterismMark } from '@/components/brand/asterism-mark'
import { SourceRefChip } from '@/components/home/source-ref-chip'
import { resolveHomeEmerges, type HomeRelationshipBlock } from '@/lib/home/home-emerges-data'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
  canSynthesize?: boolean
  onSynthesize?: () => void
}

function RelationshipBlock({
  block,
  voiceByNumber,
}: {
  block: HomeRelationshipBlock
  voiceByNumber: Map<number, { n: number; title: string; thumbnail?: string }>
}) {
  return (
    <article className="border border-line bg-background p-4 md:p-5">
      <span className="mono-label text-[10px] text-ink-soft">{block.label}</span>
      <p className="mt-3 font-serif text-base leading-relaxed text-pretty md:text-lg">
        {block.statement}
      </p>
      {block.voices.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {block.voices.map((n) => {
            const voice = voiceByNumber.get(n)
            if (!voice) {
              return (
                <span key={n} className="mono text-[10px] text-ink-soft">
                  {String(n).padStart(2, '0')}
                </span>
              )
            }
            return <SourceRefChip key={n} voice={voice} />
          })}
        </div>
      )}
    </article>
  )
}

export function HomeWhatEmerges({ voices, canSynthesize, onSynthesize }: Props) {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const data = useMemo(
    () => resolveHomeEmerges(voices, { allowStoredResults: hydrated }),
    [voices, hydrated],
  )

  const voiceByNumber = useMemo(
    () => new Map(data.voices.map((v) => [v.n, v])),
    [data.voices],
  )

  const metadata =
    data.metadataLine ??
    (data.voiceCount > 0
      ? `${data.voiceCount} VOICE${data.voiceCount === 1 ? '' : 'S'} · ${data.connectionCount} CONNECTION${data.connectionCount === 1 ? '' : 'S'}`
      : undefined)

  const showRelationships = data.relationships.length > 0

  return (
    <div className="w-full">
      {data.isSample && (
        <p className="mono mb-3 text-[10px] text-ink-soft">
          SAMPLE — Add your own videos to replace this preview
        </p>
      )}

      <section className="border border-line border-l-2 border-l-mint bg-mint/10 p-5 md:p-6 lg:p-8">
        <div className="flex items-start gap-3">
          <AsterismMark size={20} className="mt-1 shrink-0 text-mint-ink" />
          <div className="min-w-0 flex-1">
            <span className="mono-label text-[10px] text-ink-soft">WHAT EMERGES</span>

            {data.headline ? (
              <>
                <blockquote className="mt-4 max-w-3xl font-serif text-2xl font-medium leading-[1.2] tracking-tight text-balance md:text-3xl lg:text-4xl">
                  &ldquo;{data.headline}&rdquo;
                </blockquote>
                {data.subline && (
                  <p className="mt-4 max-w-2xl font-serif text-base leading-relaxed text-ink-soft md:text-lg">
                    {data.subline}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-4 max-w-2xl font-serif text-xl leading-relaxed text-ink-soft md:text-2xl">
                {data.statusMessage ??
                  'Add at least two videos to discover what appears between them.'}
              </p>
            )}

            {metadata && data.headline && (
              <p className="mono mt-5 text-[11px] text-ink-soft">{metadata}</p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {data.synthesisId ? (
                <>
                  <Link
                    href={`/synthesis/${data.synthesisId}`}
                    className="mono-label inline-flex border border-line bg-ink px-4 py-2.5 text-[10px] text-background hover:opacity-90"
                  >
                    EXPLORE SYNTHESIS →
                  </Link>
                  <Link
                    href={`/synthesis/${data.synthesisId}#emergent`}
                    className="mono-label inline-flex border border-line bg-background px-4 py-2.5 text-[10px] hover:bg-ink hover:text-background"
                  >
                    WHY THIS?
                  </Link>
                </>
              ) : canSynthesize && onSynthesize ? (
                <button
                  type="button"
                  onClick={onSynthesize}
                  className="mono-label inline-flex border border-line bg-ink px-4 py-2.5 text-[10px] text-background hover:opacity-90"
                >
                  SYNTHESIZE {voices.length} →
                </button>
              ) : null}
            </div>

            {data.statusMessage && data.headline && data.mode === 'no_insight' && (
              <p className="mono mt-4 text-[11px] text-ink-soft">{data.statusMessage}</p>
            )}
          </div>
        </div>
      </section>

      {showRelationships && (
        <section className="mt-4 md:mt-5">
          <span className="mono-label text-[10px] text-ink-soft">HOW THEY CONNECT</span>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.relationships.map((block) => (
              <RelationshipBlock
                key={block.id}
                block={block}
                voiceByNumber={voiceByNumber}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
