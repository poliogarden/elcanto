'use client'

import { Search } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/locale-context'

type Props = {
  query: string
  addingBatch: boolean
  pasteHintCount?: number
  placeholder?: string
  onQueryChange: (value: string) => void
  onSubmit: () => void
}

export function SynthesisSearchBar({
  query,
  addingBatch,
  pasteHintCount,
  placeholder,
  onQueryChange,
  onSubmit,
}: Props) {
  const { t } = useTranslation()
  const inputPlaceholder = placeholder ?? t('workspace.searchPlaceholder')

  const actionLabel =
    addingBatch
      ? t('source.adding')
      : pasteHintCount && pasteHintCount > 1
        ? t('source.addVoices', { count: pasteHintCount })
        : t('source.searchAction')

  return (
    <div className="w-full">
      <label htmlFor="synthesis-search" className="sr-only">
        {t('workspace.searchPlaceholder')}
      </label>
      <div className="flex min-w-0 items-center gap-3 rounded-xl bg-paper-2/80 px-4 py-3.5 focus-within:bg-paper-2 focus-within:ring-2 focus-within:ring-ink/10">
        <Search className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden />
        <input
          id="synthesis-search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              onSubmit()
            }
          }}
          placeholder={inputPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-soft/70 focus:outline-none"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={addingBatch || !query.trim()}
          className="shrink-0 text-sm font-medium text-ink transition-opacity hover:opacity-60 disabled:opacity-30"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  )
}
