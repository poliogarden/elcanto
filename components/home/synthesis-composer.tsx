'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { PROMPT_CHIPS, type PromptChipId } from '@/lib/home/synthesis-prompt-chips'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { Voice } from '@/lib/types/voice'
import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'

type Props = {
  voices: Voice[]
  readyCount: number
  customPrompt: string
  activeChip: PromptChipId | null
  onCustomPrompt: (value: string) => void
  onChipSelect: (chipId: PromptChipId) => void
  onRemove: (id: string) => void
  onClearAll: () => void
  onSynthesize: () => void
}

function SelectedThumb({
  voice,
  onRemove,
  removeLabel,
}: {
  voice: Voice
  onRemove: () => void
  removeLabel: string
}) {
  const thumb = resolveVideoThumbnail(voice.youtubeId, voice.thumbnail)
  return (
    <div className="group relative shrink-0">
      <div className="relative h-[4.5rem] w-20 overflow-hidden rounded-lg sm:h-20 sm:w-[7.25rem]">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-paper-2 text-xs text-ink-soft">
            {String(voice.n).padStart(2, '0')}
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-semibold text-white">
          {String(voice.n).padStart(2, '0')}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-background opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        ×
      </button>
    </div>
  )
}

function EmergesGraphic() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center px-4 text-center">
      <span className="text-2xl leading-none text-coral/60" aria-hidden>
        ╲ ╱
      </span>
      <span className="mt-1 text-xl leading-none text-coral/80" aria-hidden>
        ?
      </span>
      <p className="mt-2 font-serif text-sm italic text-ink-soft">{t('workspace.whatEmerges')}</p>
    </div>
  )
}

function ComposerPanel({
  voices,
  readyCount,
  customPrompt,
  activeChip,
  onCustomPrompt,
  onChipSelect,
  onRemove,
  onClearAll,
  onSynthesize,
}: Props) {
  const { t } = useTranslation()
  const canSynthesize = readyCount >= 2
  const isFullComposer = voices.length >= 2

  const countLabel = t(
    voices.length === 1 ? 'workspace.videosSelectedOne' : 'workspace.videosSelectedMany',
    { count: voices.length },
  ).toUpperCase()

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-background/95 shadow-[0_-16px_48px_rgba(0,0,0,0.1)] backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide text-ink">{countLabel}</p>
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-ink-soft transition-colors hover:text-ink"
          >
            {t('home.clearAll')}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {voices.map((voice, i) => (
              <div key={voice.id} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="text-lg font-light text-ink-soft/50" aria-hidden>
                    +
                  </span>
                )}
                <SelectedThumb
                  voice={voice}
                  onRemove={() => onRemove(voice.id)}
                  removeLabel={t('selection.removeVideo', { title: voice.title })}
                />
              </div>
            ))}
          </div>

          {isFullComposer && (
            <div className="hidden flex-1 justify-center sm:flex">
              <EmergesGraphic />
            </div>
          )}
        </div>

        {!isFullComposer && (
          <p className="mt-4 text-sm text-ink-soft" role="status">
            {t('workspace.selectOneMore')}
          </p>
        )}

        {isFullComposer && (
          <>
            <div className="mt-4 sm:hidden">
              <EmergesGraphic />
            </div>

            <label htmlFor="workspace-ask" className="sr-only">
              {t('workspace.askPlaceholder')}
            </label>
            <textarea
              id="workspace-ask"
              value={customPrompt}
              onChange={(e) => onCustomPrompt(e.target.value)}
              placeholder={t('workspace.askPlaceholder')}
              rows={3}
              className="mt-4 w-full resize-none rounded-xl bg-paper-2/70 px-4 py-3.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-soft/60 focus:bg-paper-2 focus:outline-none focus:ring-2 focus:ring-ink/10"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => onChipSelect(chip.id)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    activeChip === chip.id
                      ? 'bg-ink font-medium text-background'
                      : 'bg-paper-2 text-ink hover:bg-paper-2/80'
                  }`}
                >
                  {t(chip.labelKey)}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={!canSynthesize}
                onClick={onSynthesize}
                className="w-full rounded-lg bg-ink px-8 py-3.5 text-[15px] font-semibold tracking-wide text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
              >
                {t('workspace.synthesizeAction')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function SynthesisComposer(props: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (props.voices.length < 1) return null
  if (!mounted) return null

  return createPortal(<ComposerPanel {...props} />, document.body)
}

/** @deprecated Use SynthesisComposer */
export const SynthesisSelectionTray = SynthesisComposer
