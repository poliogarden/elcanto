'use client'

import { useLocale } from '@/lib/i18n/locale-context'
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'
import type { ResultLanguage } from '@/lib/i18n/types'

export function LanguageSettings() {
  const {
    resultLanguage,
    resolvedOutputLanguage,
    setResultLanguage,
    t,
  } = useLocale()

  return (
    <div className="max-w-xl">
      <p className="mono-label text-[10px] text-ink-soft">{t('settings.language')}</p>

      <div className="mt-8 border border-line">
        <div className="border-b border-line p-5">
          <p className="font-serif text-lg font-medium">{t('settings.interface')}</p>
          <p className="mt-1 font-serif text-sm text-ink-soft">{t('settings.interfaceDesc')}</p>
          <div className="mt-4">
            <LocaleSwitcher variant="labeled" />
          </div>
        </div>

        <div className="p-5">
          <p className="font-serif text-lg font-medium">{t('settings.aiResults')}</p>
          <p className="mt-1 font-serif text-sm text-ink-soft">{t('settings.aiResultsDesc')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <LocaleButton
              active={resultLanguage === 'auto'}
              onClick={() => setResultLanguage('auto')}
              label={t('settings.auto')}
            />
            <LocaleButton
              active={resultLanguage === 'ko'}
              onClick={() => setResultLanguage('ko')}
              label={t('settings.korean')}
            />
            <LocaleButton
              active={resultLanguage === 'en'}
              onClick={() => setResultLanguage('en')}
              label={t('settings.english')}
            />
          </div>
          <p className="mono mt-4 text-[10px] text-ink-soft">
            {t('settings.autoHint')}{' '}
            {resultLanguage === 'auto' &&
              `→ ${resolvedOutputLanguage === 'ko' ? t('settings.korean') : t('settings.english')}`}
          </p>
        </div>
      </div>
    </div>
  )
}

function LocaleButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mono-label border px-4 py-2 text-[10px] transition-colors ${
        active
          ? 'border-ink bg-ink text-background'
          : 'border-line text-ink-soft hover:border-ink hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
