'use client'

import {
  SYNTHESIS_FOCUS_OPTIONS,
  type SynthesisFocusPreset,
} from '@/lib/types/synthesis-focus'
import { useTranslation } from '@/lib/i18n/locale-context'

type Props = {
  preset: SynthesisFocusPreset
  customPrompt: string
  onPreset: (preset: SynthesisFocusPreset) => void
  onCustomPrompt: (value: string) => void
}

export function SynthesisFocusInput({
  preset,
  customPrompt,
  onPreset,
  onCustomPrompt,
}: Props) {
  const { t } = useTranslation()
  const active = SYNTHESIS_FOCUS_OPTIONS.find((o) => o.id === preset)

  return (
    <div>
      <p className="mono-label text-[10px] text-ink-soft">{t('synthesis.focusPrompt')}</p>

      <input
        value={customPrompt}
        onChange={(e) => onCustomPrompt(e.target.value)}
        placeholder={t('synthesis.focusPlaceholder')}
        className="mt-3 h-11 w-full border border-line bg-background px-4 font-serif text-sm text-ink outline-none focus:border-ink"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {SYNTHESIS_FOCUS_OPTIONS.map((option) => {
          const selected = preset === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onPreset(option.id)}
              className={`mono-label border px-3 py-2 text-[10px] transition-colors ${
                selected
                  ? 'border-ink bg-ink text-background'
                  : 'border-line text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              {t(`synthesis.focus.${option.id}.label`)}
            </button>
          )
        })}
      </div>

      {active && (
        <p className="mt-3 max-w-xl font-serif text-sm text-ink-soft">
          {t(`synthesis.focus.${active.id}.blurb`)}
        </p>
      )}
    </div>
  )
}
