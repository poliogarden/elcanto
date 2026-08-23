'use client'

import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { SynthesisEmergenceNode } from '@/components/home/synthesis-connection'
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

function MiniEmerges({ voices }: { voices: Voice[] }) {
  const n = voices.length
  if (n < 2) return null

  return (
    <div className="hidden items-end justify-center gap-2 sm:flex md:gap-3">
      {voices.slice(0, 4).map((voice) => (
        <div key={voice.id} className="flex flex-col items-center">
          <div className="relative h-10 w-16 overflow-hidden rounded-sm border border-line/60 md:h-11 md:w-[4.5rem]">
            {resolveVideoThumbnail(voice.youtubeId, voice.thumbnail) ? (
              <img
                src={resolveVideoThumbnail(voice.youtubeId, voice.thumbnail)!}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-paper-2 text-[10px] text-ink-soft">
                {String(voice.n).padStart(2, '0')}
              </div>
            )}
            <span className="absolute left-1 top-1 rounded bg-background/90 px-1 text-[9px] font-medium text-ink">
              {String(voice.n).padStart(2, '0')}
            </span>
          </div>
        </div>
      ))}
      <div className="flex flex-col items-center pb-1">
        <span className="text-lg text-coral/70" aria-hidden>
          ╲ │ ╱
        </span>
        <SynthesisEmergenceNode state="ready" />
      </div>
    </div>
  )
}

function TrayContent({
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
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const canSynthesize = readyCount >= 2

  const countLabel =
    voices.length === 1
      ? t('workspace.videosSelectedOne', { count: voices.length })
      : t('workspace.videosSelectedMany', { count: voices.length })

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line/80 bg-background/95 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] backdrop-blur-md">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-4 md:px-6 md:py-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink">{countLabel}</p>
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-ink-soft transition-colors hover:text-ink"
          >
            {t('home.clearAll')}
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {voices.map((voice) => {
            const thumb = resolveVideoThumbnail(voice.youtubeId, voice.thumbnail)
            return (
              <div key={voice.id} className="group relative shrink-0">
                <div className="relative h-14 w-24 overflow-hidden rounded-md border border-line/70 md:h-16 md:w-28">
                  {thumb ? (
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-paper-2 text-xs text-ink-soft">
                      {String(voice.n).padStart(2, '0')}
                    </div>
                  )}
                  <span className="absolute left-1 top-1 rounded bg-ink/85 px-1 py-0.5 text-[10px] font-medium text-background">
                    {String(voice.n).padStart(2, '0')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(voice.id)}
                  aria-label={t('selection.removeVideo', { title: voice.title })}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-background text-xs text-ink-soft opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>

        <MiniEmerges voices={voices} />

        <label htmlFor="workspace-ask" className="sr-only">
          {t('workspace.askPlaceholder')}
        </label>
        <textarea
          id="workspace-ask"
          ref={inputRef}
          value={customPrompt}
          onChange={(e) => onCustomPrompt(e.target.value)}
          placeholder={t('workspace.askPlaceholder')}
          rows={2}
          className="mt-3 w-full resize-none rounded-md border border-line/80 bg-background px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-ink/30 focus:outline-none"
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="w-full text-[11px] text-ink-soft sm:w-auto sm:py-1.5">
            {t('workspace.suggested')}
          </span>
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onChipSelect(chip.id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                activeChip === chip.id
                  ? 'border-ink bg-ink text-background'
                  : 'border-line/80 bg-background text-ink hover:border-ink/40'
              }`}
            >
              {t(chip.labelKey)}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {!canSynthesize && (
            <p className="text-sm text-ink-soft" role="status">
              {t('selection.oneMoreVideo')}
            </p>
          )}
          <button
            type="button"
            disabled={!canSynthesize}
            onClick={onSynthesize}
            className="ml-auto w-full rounded-md bg-ink px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
          >
            {canSynthesize
              ? t('workspace.synthesizeCta', { count: readyCount })
              : t('selection.addOneMore')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SynthesisSelectionTray(props: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (props.voices.length < 1) return null
  if (!mounted) return null

  return createPortal(<TrayContent {...props} />, document.body)
}
