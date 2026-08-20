'use client'

import { HomePageShell } from '@/components/home/home-page-shell'
import { SourcePicker } from '@/components/home/source-picker'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { SynthesisFocusPreset } from '@/lib/types/synthesis-focus'
import type { VideoSourceItem } from '@/lib/types/selected-source'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
  readyCount: number
  batchError?: string | null
  focusPreset: SynthesisFocusPreset
  customPrompt: string
  onToggleItem: (item: VideoSourceItem) => void
  onBatchAdd: (items: VideoSourceItem[]) => void
  onRemove: (id: string) => void
  onFocusPreset: (preset: SynthesisFocusPreset) => void
  onCustomPrompt: (value: string) => void
  onSynthesize: () => void
}

export function HomeHero({
  voices,
  readyCount,
  batchError,
  focusPreset,
  customPrompt,
  onToggleItem,
  onBatchAdd,
  onRemove,
  onFocusPreset,
  onCustomPrompt,
  onSynthesize,
}: Props) {
  const { t } = useTranslation()

  return (
    <section className="border-b border-line pb-8 pt-3 md:pb-10 md:pt-4">
      <HomePageShell>
        <div className="max-w-2xl">
          <h1 className="font-serif text-2xl font-medium leading-[1.08] tracking-tight md:text-3xl">
            {t('home.headline')}
            <br />
            <span className="italic">{t('home.headlineItalic')}</span>
          </h1>
        </div>

        <div className="mt-6">
          <SourcePicker
            voices={voices}
            readyCount={readyCount}
            focusPreset={focusPreset}
            customPrompt={customPrompt}
            onToggleItem={onToggleItem}
            onBatchAdd={onBatchAdd}
            onRemove={onRemove}
            onFocusPreset={onFocusPreset}
            onCustomPrompt={onCustomPrompt}
            onSynthesize={onSynthesize}
          />
          {batchError && (
            <p className="mono mt-2 text-[11px] text-destructive" role="alert">
              {batchError}
            </p>
          )}
          {voices.length === 0 && (
            <p className="mt-3 font-serif text-sm text-ink-soft" role="status">
              {t('home.pickAtLeastTwo')}
            </p>
          )}
        </div>
      </HomePageShell>
    </section>
  )
}
