'use client'

import { AsterismMark } from '@/components/brand/asterism-mark'
import { useTranslation } from '@/lib/i18n/locale-context'
import {
  getHeroStatement,
  hasStrongEmergence,
} from '@/lib/synthesis/result-helpers'
import type { SynthesisViewModel } from '@/lib/types/view-model'

type Props = {
  view: SynthesisViewModel
  onWhy: () => void
  onSeeDifferences?: () => void
}

function weakCopy(view: SynthesisViewModel, t: (key: string, p?: Record<string, string | number>) => string) {
  const disagreements = view.editorialDisagreements.length + view.contradictions.length
  if (disagreements > 0) {
    return {
      headline: t('result.noConverge'),
      subline: t(
        disagreements === 1 ? 'result.disagreementsFound' : 'result.disagreementsFoundPlural',
        { count: disagreements },
      ),
      cta: 'differences' as const,
    }
  }
  if (view.noStrongRelationship) {
    return {
      headline: t('result.mostlyApart'),
      subline: t('result.noPattern'),
      cta: 'explore' as const,
    }
  }
  return {
    headline: t('result.noConverge'),
    subline: t('result.validNoInsight'),
    cta: 'explore' as const,
  }
}

export function ResultHero({ view, onWhy, onSeeDifferences }: Props) {
  const { t } = useTranslation()
  const statement = getHeroStatement(view)
  const strong = hasStrongEmergence(view)
  const weak = !strong ? weakCopy(view, t) : null

  const meta =
    view.inspectStats.claimsExtracted > 0
      ? t('result.metaWithClaims', {
          videos: view.readyVoiceCount,
          duration: view.totalDuration.toUpperCase(),
          claims: view.inspectStats.claimsExtracted,
        })
      : t('result.meta', {
          videos: view.readyVoiceCount,
          duration: view.totalDuration.toUpperCase(),
        })

  const support = view.fourthIdea?.voices.length
    ? t('result.supportPattern', { count: view.fourthIdea.voices.length })
    : view.meaningfulRelationships.length > 0
      ? t('result.supportReading', {
          count: new Set(
            view.meaningfulRelationships.flatMap((r) => [r.fromVoice, r.toVoice]),
          ).size,
        })
      : null

  if (!strong && weak) {
    return (
      <section id="what-emerges" className="border-b border-line bg-paper-2 py-12 md:py-16">
        <p className="mono text-center text-[11px] text-ink-soft">{meta}</p>

        <div className="mt-8 flex justify-center">
          <AsterismMark size={28} className="text-ink-soft" />
        </div>

        <p className="mt-6 text-center font-serif text-sm text-ink-soft">{t('result.whatEmerges')}</p>

        <h1 className="mx-auto mt-6 max-w-2xl text-center font-serif text-3xl font-medium leading-tight md:text-4xl">
          {weak.headline}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center font-serif text-lg text-ink-soft">
          {weak.subline}
        </p>

        <div className="mt-10 text-center">
          {weak.cta === 'differences' && onSeeDifferences ? (
            <button
              type="button"
              onClick={onSeeDifferences}
              className="mono-label border border-ink px-6 py-3 text-[10px] hover:bg-ink hover:text-background"
            >
              {t('result.seeDifferences')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onWhy}
              className="mono-label border border-ink px-6 py-3 text-[10px] hover:bg-ink hover:text-background"
            >
              {t('result.explore')}
            </button>
          )}
        </div>
      </section>
    )
  }

  if (!statement) return null

  return (
    <section id="what-emerges" className="border-b border-line bg-paper-2 py-12 md:py-20">
      <p className="mono text-center text-[11px] text-ink-soft">{meta}</p>

      <div className="mt-10 flex justify-center">
        <AsterismMark size={32} className="text-mint-ink" />
      </div>

      <p className="mt-8 text-center font-serif text-sm text-ink-soft md:text-base">
        {t('result.whatEmerges')}
      </p>

      <blockquote className="mx-auto mt-6 max-w-3xl text-center font-serif text-3xl font-medium leading-[1.12] tracking-tight md:text-5xl">
        &ldquo;{statement}&rdquo;
      </blockquote>

      {support && (
        <p className="mx-auto mt-6 max-w-xl text-center font-serif text-sm text-ink-soft">
          {support}
        </p>
      )}

      <div className="mt-12 text-center">
        <button
          type="button"
          onClick={onWhy}
          className="mono-label text-[11px] text-ink-soft transition-colors hover:text-ink"
        >
          {t('result.why')} ↓
        </button>
      </div>
    </section>
  )
}
