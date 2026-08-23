'use client'

import { useTranslation } from '@/lib/i18n/locale-context'

type Props = {
  count: number
  disabled?: boolean
  onSynthesize: () => void
}

export function SynthesisCTA({ count, disabled = false, onSynthesize }: Props) {
  const { t } = useTranslation()

  const label =
    count === 0
      ? t('selection.addOneMore')
      : count === 1
        ? t('selection.addOneMore')
        : t('selection.synthesize', { count })

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSynthesize}
      className="mono-label mt-5 w-full max-w-md rounded-sm bg-ink px-6 py-3.5 text-[11px] text-background transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-35 md:mt-6 md:py-4"
    >
      {label}
    </button>
  )
}
