'use client'

import Link from 'next/link'
import { ArchiveList } from '@/app/archive/archive-list'
import { BrandFooter } from '@/components/brand/brand-footer'
import { HomePageShell } from '@/components/home/home-page-shell'
import { Masthead } from '@/components/masthead'
import { useTranslation } from '@/lib/i18n/locale-context'

export default function ArchivePage() {
  const { t } = useTranslation()

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Masthead />

      <div className="flex-1">
        <HomePageShell>
          <section className="border-b border-line py-12 md:py-16">
            <div className="grid gap-6 lg:grid-cols-12">
              <h1 className="font-serif text-6xl font-medium leading-none tracking-tight md:text-8xl lg:col-span-8">
                {t('archive.title')}
              </h1>
              <p className="self-end font-serif text-lg leading-relaxed text-ink-soft text-pretty lg:col-span-4">
                {t('archive.description')}
              </p>
            </div>
          </section>

          <ArchiveList />

          <div className="py-12">
            <Link
              href="/"
              className="mono-label inline-flex border border-line px-5 py-4 text-xs text-ink transition-colors hover:bg-ink hover:text-background"
            >
              {t('archive.startNew')}
            </Link>
          </div>
        </HomePageShell>
      </div>

      <BrandFooter />
    </main>
  )
}
