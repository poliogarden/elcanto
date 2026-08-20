'use client'

import { useTranslation } from '@/lib/i18n/locale-context'

type SynthesizeCTAProps = {
  count: number
  totalDuration: string
  onSynthesize: () => void
}

export function SynthesizeCTA({ count, totalDuration, onSynthesize }: SynthesizeCTAProps) {
  const { t } = useTranslation()
  const disabled = count < 2

  if (disabled) {
    return (
      <div className="border-b border-line px-5 py-6 md:px-8">
        <p className="mono text-[11px] text-ink-soft">
          {count === 0 ? t('selection.needTwoToBegin') : t('selection.needOneMoreToCompare')}
        </p>
      </div>
    )
  }

  return (
    <div className="border-b border-line px-5 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-line p-5 md:p-6">
        <div>
          <p className="mono-label text-[10px] text-ink-soft">
            {t('selection.readyToCompare', { count })}
          </p>
          <p className="mono mt-1 text-[11px] text-ink-soft">
            {t('selection.totalDuration', { duration: totalDuration })}
          </p>
        </div>
        <button
          type="button"
          onClick={onSynthesize}
          className="mono-label bg-ink px-6 py-3 text-[10px] text-background transition-opacity hover:opacity-90"
        >
          {t('selection.synthesize', { count })}
        </button>
      </div>
    </div>
  )
}
