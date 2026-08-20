'use client'

import { BrandLockup } from '@/components/brand/brand-lockup'
import { HomePageShell } from '@/components/home/home-page-shell'
import { useTranslation } from '@/lib/i18n/locale-context'

export function BrandFooter() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-line">
      <HomePageShell className="py-8 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <BrandLockup href="/" symbolSize={28} showTagline={false} />
          <span className="mono-label max-w-xs text-[11px] text-ink-soft">{t('footer.tagline')}</span>
        </div>
      </HomePageShell>
    </footer>
  )
}
