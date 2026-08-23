'use client'

import { SourcePicker } from '@/components/home/source-picker'
import { HomePageShell } from '@/components/home/home-page-shell'
import type { VideoSourceItem } from '@/lib/types/selected-source'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
  batchError?: string | null
  onToggleItem: (item: VideoSourceItem) => void
  onBatchAdd: (items: VideoSourceItem[]) => void
}

export function HomeHero({ voices, batchError, onToggleItem, onBatchAdd }: Props) {
  return (
    <section className="pb-8 pt-4 md:pb-10 md:pt-5">
      <HomePageShell>
        <SourcePicker voices={voices} onToggleItem={onToggleItem} onBatchAdd={onBatchAdd} />

        {batchError && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {batchError}
          </p>
        )}
      </HomePageShell>
    </section>
  )
}
