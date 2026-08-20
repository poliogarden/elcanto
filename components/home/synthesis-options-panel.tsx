'use client'

import { useState } from 'react'
import { SynthesisFocusInput } from '@/components/home/synthesis-focus-input'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { SynthesisFocusPreset } from '@/lib/types/synthesis-focus'

type Props = {
  preset: SynthesisFocusPreset
  customPrompt: string
  onPreset: (preset: SynthesisFocusPreset) => void
  onCustomPrompt: (value: string) => void
}

export function SynthesisOptionsPanel({
  preset,
  customPrompt,
  onPreset,
  onCustomPrompt,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mono-label text-[10px] text-ink-soft underline-offset-2 hover:text-ink hover:underline"
      >
        {open ? t('selection.hideOptions') : t('selection.customize')}
      </button>

      {open && (
        <div className="mt-4 border border-line bg-paper-2/40 p-4 md:p-5">
          <SynthesisFocusInput
            preset={preset}
            customPrompt={customPrompt}
            onPreset={onPreset}
            onCustomPrompt={onCustomPrompt}
          />
        </div>
      )}
    </div>
  )
}
