'use client'

import { useRef } from 'react'
import { SelectedVideoGrid } from '@/components/home/selected-video-grid'
import { SynthesisCTA } from '@/components/home/synthesis-cta'
import {
  SynthesisConnection,
  SynthesisEmergenceNode,
} from '@/components/home/synthesis-connection'
import { SynthesisOptionsPanel } from '@/components/home/synthesis-options-panel'
import { SynthesisSelectedBar } from '@/components/home/synthesis-selected-bar'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { SynthesisFocusPreset } from '@/lib/types/synthesis-focus'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
  readyCount: number
  focusPreset: SynthesisFocusPreset
  customPrompt: string
  onRemove: (id: string) => void
  onClearAll: () => void
  onFocusPreset: (preset: SynthesisFocusPreset) => void
  onCustomPrompt: (value: string) => void
  onSynthesize: () => void
}

export function SelectedVoicesPanel({
  voices,
  readyCount,
  focusPreset,
  customPrompt,
  onRemove,
  onClearAll,
  onFocusPreset,
  onCustomPrompt,
  onSynthesize,
}: Props) {
  const { t } = useTranslation()
  const workspaceRef = useRef<HTMLDivElement>(null)

  if (voices.length === 0) return null

  const canSynthesize = readyCount >= 2

  return (
    <div className="mt-6 md:mt-8">
      <SynthesisSelectedBar count={voices.length} onClearAll={onClearAll} />

      <div ref={workspaceRef} className="relative">
        <SelectedVideoGrid voices={voices} onRemove={onRemove} />

        <div className="relative mt-2 flex flex-col items-center pb-2 md:mt-0">
          <SynthesisConnection voices={voices} state="ready" workspaceRef={workspaceRef} />

          <div className="relative z-10 flex w-full flex-col items-center pt-16 md:pt-20">
            <SynthesisEmergenceNode state="ready" />
            <SynthesisCTA
              count={readyCount}
              disabled={!canSynthesize}
              onSynthesize={onSynthesize}
            />
            {!canSynthesize && voices.length === 1 && (
              <p className="mt-3 text-center font-serif text-sm text-ink-soft" role="status">
                {t('selection.oneMoreVideo')}
              </p>
            )}
          </div>
        </div>
      </div>

      {canSynthesize && (
        <SynthesisOptionsPanel
          preset={focusPreset}
          customPrompt={customPrompt}
          onPreset={onFocusPreset}
          onCustomPrompt={onCustomPrompt}
        />
      )}
    </div>
  )
}
