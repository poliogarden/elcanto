'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatTimestamp, youtubeWatchUrl } from '@/lib/youtube/timestamp'
import type { StoryBlock, StoryPlan } from '@/lib/types/story-plan'

type Props = {
  plan: StoryPlan
}

export function StoryPreview({ plan }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const blocks = plan.blocks

  const totalDuration = useMemo(() => {
    const last = blocks[blocks.length - 1]
    return last?.end ?? 45
  }, [blocks])

  useEffect(() => {
    if (!playing || blocks.length === 0) return
    const block = blocks[activeIndex]
    if (!block) return
    const ms = Math.max(2000, (block.end - block.start) * 1000)
    const timer = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % blocks.length)
    }, ms)
    return () => clearTimeout(timer)
  }, [activeIndex, blocks, playing])

  const current = blocks[activeIndex]
  if (!current) return null

  const isClip = current.type === 'clip'
  const watchUrl =
    isClip && current.sourceVideoId && current.sourceStart !== undefined
      ? youtubeWatchUrl(current.sourceVideoId, current.sourceStart)
      : null

  function openClip() {
    if (watchUrl) window.open(watchUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="mono-label text-[10px] text-ink-soft">PREVIEW · 9:16 STORYBOARD</span>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="mono-label border border-line px-2 py-1 text-[9px] hover:bg-ink hover:text-background"
        >
          {playing ? 'PAUSE' : 'PLAY'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          if (watchUrl) openClip()
          else setActiveIndex((i) => (i + 1) % blocks.length)
        }}
        className="relative mt-4 mx-auto block aspect-[9/16] w-full max-w-[320px] overflow-hidden border border-line bg-paper text-left"
        style={{ maxHeight: '70vh' }}
        aria-label={watchUrl ? 'Open clip on YouTube' : 'Advance to next block'}
      >
        <div className="absolute inset-x-0 top-0 z-10 border-b border-line bg-paper/95 px-4 py-3">
          <p className="mono-label text-center text-[9px] leading-relaxed text-ink">
            {current.topText || blockLabel(current.type)}
          </p>
        </div>

        <div className="absolute inset-0 flex items-center justify-center bg-ink/5 pt-14 pb-20">
          {isClip && current.thumbnail ? (
            <img
              src={current.thumbnail}
              alt=""
              className="h-full w-full object-cover opacity-90"
            />
          ) : (
            <div className="px-6 text-center">
              <p className="font-serif text-2xl leading-snug text-ink">{current.topText}</p>
            </div>
          )}

          {isClip && current.evidenceText && (
            <p className="absolute bottom-24 left-0 right-0 px-4 text-center font-serif text-xs italic text-ink/80">
              &ldquo;{current.evidenceText.slice(0, 120)}
              {current.evidenceText.length > 120 ? '…' : ''}&rdquo;
            </p>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 px-4 py-3">
          {current.bottomText ? (
            <p className="font-serif text-center text-sm leading-snug text-ink">
              {current.bottomText}
            </p>
          ) : current.type === 'insight' ? (
            <p className="font-serif text-center text-sm leading-snug text-mint-ink">
              {current.topText}
            </p>
          ) : null}
          {isClip && current.sourceStart !== undefined && (
            <p className="mono mt-2 text-center text-[8px] text-ink-soft">
              {formatTimestamp(current.sourceStart)}
              {current.sourceEnd !== undefined ? ` → ${formatTimestamp(current.sourceEnd)}` : ''}
              {watchUrl ? ' · Tap to open on YouTube' : ''}
            </p>
          )}
        </div>
      </button>

      <div className="mt-4 flex flex-wrap justify-center gap-1">
        {blocks.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              setActiveIndex(i)
              setPlaying(false)
            }}
            className={`mono h-6 w-6 text-[9px] border ${
              i === activeIndex ? 'border-ink bg-ink text-background' : 'border-line text-ink-soft'
            }`}
            aria-label={`Block ${i + 1}`}
            aria-current={i === activeIndex ? 'true' : undefined}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <p className="mono mt-3 text-center text-[10px] text-ink-soft">
        ~{Math.round(totalDuration)}s · {plan.sourceCount} sources · block {activeIndex + 1}/
        {blocks.length}
      </p>
    </div>
  )
}

function blockLabel(type: StoryBlock['type']): string {
  return type.toUpperCase()
}
