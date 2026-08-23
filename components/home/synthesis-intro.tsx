'use client'

import { useTranslation } from '@/lib/i18n/locale-context'

export function SynthesisIntro() {
  const { t } = useTranslation()

  return (
    <div className="min-w-0">
      <p className="mono-label text-[10px] text-ink-soft">{t('home.newSynthesis')}</p>
      <h1 className="mt-2 font-serif text-[1.75rem] font-medium leading-[1.12] tracking-tight text-ink md:text-[2rem] lg:text-[2.125rem]">
        {t('home.headline')}
        <br />
        <span className="font-serif italic text-coral">{t('home.headlineItalic')}</span>
      </h1>
    </div>
  )
}
