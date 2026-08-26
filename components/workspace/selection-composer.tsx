'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { PROMPT_CHIPS, type PromptChipId } from '@/lib/home/synthesis-prompt-chips'
import { SINGLE_PROMPT_CHIPS, type SinglePromptChipId } from '@/lib/home/single-prompt-chips'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { Voice } from '@/lib/types/voice'
import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'

type ChipId = PromptChipId | SinglePromptChipId

type Props = {
  voices: Voice[]
  customPrompt: string
  activeChip: ChipId | null
  onCustomPrompt: (value: string) => void
  onChipSelect: (chipId: ChipId) => void
  onRemove: (id: string) => void
  onClearAll: () => void
  onRun: () => void
  /** In-flow layout above page footer instead of fixed overlay */
  inline?: boolean
}

function Thumb({ voice }: { voice: Voice }) {
  const thumb = resolveVideoThumbnail(voice.youtubeId, voice.thumbnail)
  return (
    <div className="relative h-10 w-[4.5rem] shrink-0 overflow-hidden rounded-md">
      {thumb ? (
        <img src={thumb} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-paper-2 text-[10px] text-ink-soft">
          {String(voice.n).padStart(2, '0')}
        </div>
      )}
      <span className="absolute left-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-0.5 text-[9px] font-semibold text-white">
        {String(voice.n).padStart(2, '0')}
      </span>
    </div>
  )
}

function ComposerPanel({
  voices,
  customPrompt,
  activeChip,
  onCustomPrompt,
  onChipSelect,
  onRemove,
  onClearAll,
  onRun,
  expanded,
  onToggleExpand,
  inline = false,
}: Props & { expanded: boolean; onToggleExpand: () => void }) {
  const { t } = useTranslation()
  const isSingle = voices.length === 1
  const chips = isSingle ? SINGLE_PROMPT_CHIPS : PROMPT_CHIPS

  const countLabel = isSingle
    ? t('workspace.videoSelectedOne', { count: 1 })
    : t('workspace.videosSelectedMany', { count: voices.length })

  const askPlaceholder = isSingle
    ? t('workspace.askSinglePlaceholder')
    : t('workspace.askPlaceholder')

  const ctaLabel = isSingle ? t('workspace.askAction') : t('workspace.synthesizeAction')

  return (
    <div
      className={
        inline
          ? 'border-t border-line/60 bg-background'
          : 'fixed inset-x-0 bottom-0 z-50 border-t border-line/60 bg-background/95 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl'
      }
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 py-3 sm:px-6">
        {/* Mobile collapsed bar */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex w-full items-center justify-between gap-3 sm:hidden"
          aria-expanded={expanded}
        >
          <span className="text-sm font-medium text-ink">{countLabel}</span>
          <span className="text-lg text-ink-soft" aria-hidden>
            {expanded ? '↓' : '↑'}
          </span>
        </button>

        <div className={`${expanded ? 'mt-3 block' : 'hidden'} sm:mt-0 sm:block`}>
          <div className="flex items-center justify-between gap-2">
            <p className="hidden text-xs font-semibold tracking-wide text-ink sm:block">
              {countLabel.toUpperCase()}
            </p>
            <button
              type="button"
              onClick={onClearAll}
              className="ml-auto text-xs text-ink-soft transition-colors hover:text-ink"
            >
              {t('home.clearAll')}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {voices.map((voice) => (
              <button
                key={voice.id}
                type="button"
                onClick={() => onRemove(voice.id)}
                className="group relative"
                aria-label={t('selection.removeVideo', { title: voice.title })}
              >
                <Thumb voice={voice} />
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => onCustomPrompt(e.target.value)}
              placeholder={askPlaceholder}
              className="min-w-0 flex-1 rounded-lg bg-paper-2/70 px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:bg-paper-2 focus:outline-none focus:ring-2 focus:ring-ink/10"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRun()
              }}
            />
            <button
              type="button"
              onClick={onRun}
              className="shrink-0 rounded-lg bg-ink px-6 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              {ctaLabel} →
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onChipSelect(chip.id)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  activeChip === chip.id
                    ? 'bg-ink font-medium text-background'
                    : 'bg-paper-2 text-ink hover:bg-paper-2/80'
                }`}
              >
                {t(chip.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SelectionComposer(props: Props) {
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const inline = props.inline ?? false

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (props.voices.length > 0) setExpanded(true)
  }, [props.voices.length])

  if (props.voices.length < 1) return null
  if (!mounted) return null

  const panel = (
    <ComposerPanel
      {...props}
      expanded={expanded}
      onToggleExpand={() => setExpanded((v) => !v)}
    />
  )

  if (inline) return panel

  return createPortal(panel, document.body)
}

/** @deprecated */
export const SynthesisComposer = SelectionComposer
