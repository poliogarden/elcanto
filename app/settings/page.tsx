'use client'

import Link from 'next/link'
import { HomePageShell } from '@/components/home/home-page-shell'
import { Masthead } from '@/components/masthead'
import { BrandFooter } from '@/components/brand/brand-footer'
import { LanguageSettings } from '@/components/settings/language-settings'
import { useTranslation } from '@/lib/i18n/locale-context'

export default function SettingsPage() {
  const { t } = useTranslation()

  return (
    <main className="min-h-screen bg-background">
      <Masthead />
      <HomePageShell>
        <section className="border-b border-line py-10 md:py-14">
          <Link
            href="/"
            className="mono-label text-[10px] text-ink-soft hover:text-ink"
          >
            ← elcanto
          </Link>
          <h1 className="mt-6 font-serif text-4xl font-medium">{t('settings.title')}</h1>
        </section>
        <section className="py-10">
          <LanguageSettings />
        </section>
      </HomePageShell>
      <BrandFooter />
    </main>
  )
}
