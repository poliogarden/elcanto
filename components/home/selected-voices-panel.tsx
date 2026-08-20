'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { SelectedVoicesList } from '@/components/home/selected-voices-list'
import { SynthesisOptionsPanel } from '@/components/home/synthesis-options-panel'
import { VoiceRelationshipCanvas } from '@/components/home/voice-relationship-canvas'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { SynthesisFocusPreset } from '@/lib/types/synthesis-focus'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
  readyCount: number
  focusPreset: SynthesisFocusPreset
  customPrompt: string
  onRemove: (id: string) => void
  onFocusPreset: (preset: SynthesisFocusPreset) => void
  onCustomPrompt: (value: string) => void
  onSynthesize: () => void
}

function MobileVoiceBar({
  voices,
  readyCount,
  canSynthesize,
  onSynthesize,
  synthesizeLabel,
  addOneMoreLabel,
}: {
  voices: Voice[]
  readyCount: number
  canSynthesize: boolean
  onSynthesize: () => void
  synthesizeLabel: string
  addOneMoreLabel: string
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || voices.length === 0) return null

  return createPortal(
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background/95 px-5 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <p className="mono flex-1 text-[11px] text-ink-soft">{voices.length}</p>
          <button
            type="button"
            disabled={!canSynthesize}
            onClick={onSynthesize}
            className="mono-label shrink-0 bg-ink px-4 py-2.5 text-[10px] text-background disabled:opacity-35"
          >
            {canSynthesize ? synthesizeLabel : addOneMoreLabel}
          </button>
        </div>
      </div>
      <div className="h-16 md:hidden" aria-hidden />
    </>,
    document.body,
  )
}

export function SelectedVoicesPanel({
  voices,
  readyCount,
  focusPreset,
  customPrompt,
  onRemove,
  onFocusPreset,
  onCustomPrompt,
  onSynthesize,
}: Props) {
  const { t } = useTranslation()

  if (voices.length === 0) return null

  const canSynthesize = readyCount >= 2
  const cta =
    readyCount === 0
      ? null
      : readyCount === 1
        ? t('selection.addOneMore')
        : t('selection.synthesize', { count: readyCount })

  const hint =
    voices.length === 1 ? t('selection.oneMoreVideo') : canSynthesize ? t('selection.readyToSynthesize') : null

  const selectedLabel =
    voices.length === 1
      ? t('selection.videoSelected', { count: voices.length })
      : t('selection.videosSelected', { count: voices.length })

  return (
    <div className="mt-3">
      <SelectedVoicesList voices={voices} onRemove={onRemove} />

      <p className="mono-label mt-4 text-[10px] text-ink-soft">{selectedLabel}</p>

      {hint && (
        <p className="mt-2 font-serif text-sm text-ink-soft" role="status">
          {hint}
        </p>
      )}

      {voices.length >= 2 && (
        <div className="mt-4">
          <VoiceRelationshipCanvas voices={voices} phase="idle" compact />
        </div>
      )}

      {canSynthesize && (
        <SynthesisOptionsPanel
          preset={focusPreset}
          customPrompt={customPrompt}
          onPreset={onFocusPreset}
          onCustomPrompt={onCustomPrompt}
        />
      )}

      {cta && (
        <div className="mt-4 hidden md:block">
          <button
            type="button"
            disabled={!canSynthesize}
            onClick={onSynthesize}
            className={`mono-label px-6 py-4 text-[11px] transition-opacity ${
              canSynthesize
                ? 'bg-ink text-background hover:opacity-90'
                : 'cursor-not-allowed border border-line text-ink-soft'
            }`}
          >
            {cta}
          </button>
        </div>
      )}

      <MobileVoiceBar
        voices={voices}
        readyCount={readyCount}
        canSynthesize={canSynthesize}
        onSynthesize={onSynthesize}
        synthesizeLabel={t('selection.synthesize', { count: readyCount })}
        addOneMoreLabel={t('selection.addOneMore')}
      />
    </div>
  )
}
