'use client'

import { SelectedVideoCard } from '@/components/home/selected-video-card'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
  onRemove: (id: string) => void
}

function gridClass(count: number): string {
  if (count <= 1) {
    return 'mx-auto grid max-w-md grid-cols-1 gap-6'
  }
  if (count === 2) {
    return 'grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-5 lg:gap-6'
  }
  if (count === 3) {
    return 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5'
  }
  return 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4'
}

export function SelectedVideoGrid({ voices, onRemove }: Props) {
  const compact = voices.length >= 4

  return (
    <ul className={gridClass(voices.length)}>
      {voices.map((voice) => (
        <li key={voice.id} className="relative min-w-0 pb-10 md:pb-12">
          <SelectedVideoCard voice={voice} compact={compact} onRemove={onRemove} />
          <div
            data-synthesis-anchor={voice.id}
            className="pointer-events-none absolute bottom-3 left-1/2 h-px w-px -translate-x-1/2 md:bottom-4"
            aria-hidden
          />
        </li>
      ))}
    </ul>
  )
}
