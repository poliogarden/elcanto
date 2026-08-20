'use client'

import type { HomeVoiceRef } from '@/lib/home/home-emerges-data'

type Props = {
  voice: HomeVoiceRef
}

export function SourceRefChip({ voice }: Props) {
  const label = `Source ${String(voice.n).padStart(2, '0')}: ${voice.title}`

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="mono cursor-default border border-line bg-background px-1.5 py-0.5 text-[10px] text-ink transition-colors hover:border-ink hover:bg-paper-2"
    >
      {String(voice.n).padStart(2, '0')}
    </button>
  )
}
