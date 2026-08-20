'use client'

import { HomeVideoCard } from '@/components/home/home-video-card'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
  onRemove?: (id: string) => void
}

export function HomeSelectedSources({ voices, onRemove }: Props) {
  if (voices.length === 0) return null

  return (
    <div className="w-full">
      <span className="mono-label text-[10px] text-ink-soft">YOUR SOURCES</span>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {voices.map((voice) => (
          <HomeVideoCard
            key={voice.id}
            voice={voice}
            compact
            onRemove={onRemove ? () => onRemove(voice.id) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
