'use client'

import { MAX_HOME_SYNTHESIS_VIDEOS } from '@/lib/home/synthesis-limits'
import { useTranslation } from '@/lib/i18n/locale-context'

type Props = {
  count: number
  onClearAll: () => void
}

export function SynthesisSelectedBar({ count, onClearAll }: Props) {
  const { t } = useTranslation()

  if (count === 0) return null

  const selectedLabel =
    count === 1
      ? t('home.videosSelected', { count })
      : t('home.videosSelectedPlural', { count })

  return (
    <div className="mb-4 flex items-center justify-between gap-4 md:mb-5">
      <p className="mono text-[11px] text-ink md:text-xs">
        <span className="text-ink">{selectedLabel}</span>
        <span className="ml-2 text-ink-soft">
          {count}/{MAX_HOME_SYNTHESIS_VIDEOS}
        </span>
      </p>
      <button
        type="button"
        onClick={onClearAll}
        className="mono shrink-0 text-[11px] text-ink-soft transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {t('home.clearAll')} <span aria-hidden>×</span>
      </button>
    </div>
  )
}
