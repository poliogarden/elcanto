'use client'

import { useTranslation } from '@/lib/i18n/locale-context'

const VALUE_KEYS = [
  { title: 'understandEachVideo', body: 'understandEachVideoBody' },
  { title: 'findConnections', body: 'findConnectionsBody' },
  { title: 'getNewPerspective', body: 'getNewPerspectiveBody' },
  { title: 'exploreNewAngle', body: 'exploreNewAngleBody' },
] as const

export function SynthesisValueStrip() {
  const { t } = useTranslation()

  return (
    <section
      className="border-t border-line/60 bg-background"
      aria-label={t('home.valueStripLabel')}
    >
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-6 px-5 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line/50 lg:px-6 lg:py-10">
        {VALUE_KEYS.map((item, index) => (
          <div
            key={item.title}
            className={`min-w-0 ${index > 0 ? 'lg:px-6' : 'lg:pr-6'}`}
          >
            <h2 className="font-serif text-sm font-medium text-ink">{t(`home.${item.title}`)}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              {t(`home.${item.body}`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
