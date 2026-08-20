'use client'

import { useLocale, useTranslation } from '@/lib/i18n/locale-context'
import type { InterfaceLocale } from '@/lib/i18n/types'

const LOCALES: InterfaceLocale[] = ['ko', 'en']

type LocaleSwitcherProps = {
  /** GNB: KO/EN — Settings: 한국어/English */
  variant?: 'compact' | 'labeled'
  className?: string
}

export function LocaleSwitcher({ variant = 'compact', className = '' }: LocaleSwitcherProps) {
  const { interfaceLocale, setInterfaceLocale } = useLocale()
  const { t } = useTranslation()

  function label(locale: InterfaceLocale): string {
    if (variant === 'compact') return locale === 'ko' ? 'KO' : 'EN'
    return locale === 'ko' ? t('settings.korean') : t('settings.english')
  }

  return (
    <div
      role="group"
      aria-label={t('i18n.switchLanguage')}
      className={`inline-flex shrink-0 border border-line ${className}`}
    >
      {LOCALES.map((locale, index) => {
        const active = interfaceLocale === locale
        return (
          <button
            key={locale}
            type="button"
            onClick={() => setInterfaceLocale(locale)}
            aria-pressed={active}
            className={`mono-label px-2.5 py-1.5 text-[10px] transition-colors md:px-3 ${
              index > 0 ? 'border-l border-line' : ''
            } ${
              active
                ? 'bg-ink text-background'
                : 'text-ink-soft hover:bg-paper-2/60 hover:text-ink'
            }`}
          >
            {label(locale)}
          </button>
        )
      })}
    </div>
  )
}
