'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { VideoSourceCard } from '@/components/home/video-source-card'
import type { VideoSourceItem } from '@/lib/types/selected-source'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
  readyCount: number
  canSynthesize: boolean
  onRemove: (id: string) => void
  onSynthesize: () => void
}

function voiceToSourceItem(voice: Voice): VideoSourceItem {
  return {
    videoId: voice.youtubeId,
    title: voice.title,
    channelTitle: voice.channel,
    thumbnail: voice.thumbnail,
    duration: voice.duration,
    url: voice.url,
    sourceType: 'url',
  }
}

function MobileSynthesisBar({
  readyCount,
  canSynthesize,
  onSynthesize,
}: {
  readyCount: number
  canSynthesize: boolean
  onSynthesize: () => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || readyCount === 0) return null

  return createPortal(
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background px-5 py-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="mono text-[11px] text-ink-soft">
            {readyCount} VIDEO{readyCount === 1 ? '' : 'S'}
          </span>
          <button
            type="button"
            disabled={!canSynthesize}
            onClick={onSynthesize}
            className="mono-label bg-ink px-5 py-2.5 text-[10px] text-background disabled:opacity-35"
          >
            {canSynthesize ? `SYNTHESIZE →` : 'ADD ONE MORE'}
          </button>
        </div>
      </div>
      <div className="h-16 md:hidden" aria-hidden />
    </>,
    document.body,
  )
}

export function SynthesisTray({
  voices,
  readyCount,
  canSynthesize,
  onRemove,
  onSynthesize,
}: Props) {
  if (voices.length === 0) return null

  return (
    <div className="synthesis-tray mt-5 border-t border-line pt-4">
      <span className="mono-label text-[10px] text-ink-soft">SELECTED VOICES</span>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {voices.map((voice) => (
          <VideoSourceCard
            key={voice.id}
            item={voiceToSourceItem(voice)}
            selected
            selectionOrder={voice.n}
            onToggle={() => onRemove(voice.id)}
          />
        ))}
      </div>

      <MobileSynthesisBar
        readyCount={readyCount}
        canSynthesize={canSynthesize}
        onSynthesize={onSynthesize}
      />
    </div>
  )
}
