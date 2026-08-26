'use client'

import { useMemo } from 'react'
import {
  buildClaimLinkItems,
  claimKeywordTags,
  extractMapTopics,
} from '@/lib/survival/relationship-map-model'
import type { SurvivalAnalysis, SurvivalRelationship } from '@/lib/survival/types'
import { useTranslation } from '@/lib/i18n/locale-context'

const RELATIONSHIP_I18N_KEYS = {
  AGREEMENT: 'survival.relationship.agreement',
  PARTIAL_AGREEMENT: 'survival.relationship.partialAgreement',
  COMPLEMENTARY: 'survival.relationship.complementary',
  DISAGREEMENT: 'survival.relationship.disagreement',
  CONTRADICTION: 'survival.relationship.contradiction',
  INDEPENDENT: 'survival.relationship.independent',
} as const

function isDivideType(type: SurvivalRelationship['type']): boolean {
  return type === 'DISAGREEMENT' || type === 'CONTRADICTION'
}

type Props = {
  survival: SurvivalAnalysis
  onSelectRelationship?: (relationship: SurvivalRelationship) => void
}

export function SurvivalRelationshipMap({ survival, onSelectRelationship }: Props) {
  const { t } = useTranslation()
  const links = useMemo(() => buildClaimLinkItems(survival), [survival])
  const topics = useMemo(() => extractMapTopics(survival), [survival])
  const includedSources = survival.sources.filter((s) => s.includedInSynthesis !== false)

  if (links.length === 0) return null

  return (
    <section className="mt-10 rounded-2xl border border-line bg-paper-2/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-soft">
            {t('survival.map.title')}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {t('survival.map.subtitle', { count: links.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {includedSources.map((source) => (
            <span
              key={source.sourceId}
              className="rounded-full bg-background px-2.5 py-1 text-[10px] font-medium text-ink"
              title={source.title}
            >
              {String(source.voiceIndex).padStart(2, '0')} · {source.position.slice(0, 42)}
              {source.position.length > 42 ? '…' : ''}
            </span>
          ))}
        </div>
      </div>

      {topics.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold tracking-wide text-ink-soft">
            {t('survival.map.topics')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-line bg-background px-3 py-1 text-xs text-ink"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {links.slice(0, 10).map((link) => {
          const divide = isDivideType(link.relationship.type)
          const typeKey = RELATIONSHIP_I18N_KEYS[link.relationship.type]

          return (
            <button
              key={link.relationship.id}
              type="button"
              onClick={() => onSelectRelationship?.(link.relationship)}
              className="w-full rounded-xl border border-line bg-background p-4 text-left transition-colors hover:bg-paper-2/40"
            >
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
                <ClaimBlock
                  videoLabel={link.fromVideoLabel}
                  videoTitle={link.fromVideoTitle}
                  claim={link.fromClaim.claim}
                  tags={claimKeywordTags(link.fromClaim)}
                />

                <div className="flex flex-col items-center justify-center gap-1 px-2 lg:pt-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      divide
                        ? 'bg-coral/10 text-coral'
                        : 'bg-paper-2 text-ink'
                    }`}
                  >
                    {t(typeKey)}
                  </span>
                  <span className="text-[10px] text-ink-soft" aria-hidden>
                    {divide ? '⚡' : '↔'}
                  </span>
                </div>

                <ClaimBlock
                  videoLabel={link.toVideoLabel}
                  videoTitle={link.toVideoTitle}
                  claim={link.toClaim.claim}
                  tags={claimKeywordTags(link.toClaim)}
                />
              </div>

              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {link.relationship.explanation}
              </p>
            </button>
          )
        })}
      </div>

      <p className="mt-4 text-[10px] text-ink-soft">{t('survival.map.hint')}</p>
    </section>
  )
}

function ClaimBlock({
  videoLabel,
  videoTitle,
  claim,
  tags,
}: {
  videoLabel: string
  videoTitle: string
  claim: string
  tags: string[]
}) {
  return (
    <div className="rounded-lg bg-paper-2/50 p-3">
      <p className="text-[10px] font-semibold text-ink-soft">
        VIDEO {videoLabel}
        {videoTitle ? ` · ${videoTitle}` : ''}
      </p>
      <p className="mt-2 text-sm font-medium leading-snug text-ink">&ldquo;{claim}&rdquo;</p>
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-ink-soft"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
