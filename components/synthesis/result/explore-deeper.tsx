'use client'

import { useMemo, useState } from 'react'
import { SynthesisDeepDive } from '@/components/synthesis/synthesis-deep-dive'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { SynthesisViewModel } from '@/lib/types/view-model'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { AskScope } from '@/components/synthesis-view'

type ExploreCategory = {
  id: string
  icon: string
  label: string
  count: number
  items: Array<{ text: string; meta?: string }>
}

function buildCategories(
  view: SynthesisViewModel,
  t: (key: string) => string,
): ExploreCategory[] {
  const cats: ExploreCategory[] = []

  if (view.editorialAgreements.length > 0) {
    cats.push({
      id: 'common',
      icon: '=',
      label: t('relationship.commonThoughts'),
      count: view.editorialAgreements.length,
      items: view.editorialAgreements.map((a) => ({
        text: a.title,
        meta: [a.sideA.label, a.sideB.label].filter(Boolean).join(' · '),
      })),
    })
  }

  if (view.editorialDisagreements.length > 0) {
    cats.push({
      id: 'different',
      icon: '≠',
      label: t('relationship.viewsDiverge'),
      count: view.editorialDisagreements.length,
      items: view.editorialDisagreements.map((d) => ({
        text: d.title,
        meta: d.whyItMatters,
      })),
    })
  }

  if (view.contradictions.length > 0) {
    cats.push({
      id: 'contradictions',
      icon: '⚡',
      label: t('relationship.directConflicts'),
      count: view.contradictions.length,
      items: view.contradictions.map((c) => ({
        text: c.description,
        meta: c.voices.map((v) => String(v).padStart(2, '0')).join(' · '),
      })),
    })
  }

  const unique = view.insights.filter((i) => i.voices.length === 1)
  if (unique.length > 0) {
    cats.push({
      id: 'unique',
      icon: '○',
      label: t('relationship.onlyOneSaid'),
      count: unique.length,
      items: unique.slice(0, 10).map((i) => ({
        text: i.statement,
        meta: i.voices.map((v) => String(v).padStart(2, '0')).join(' · '),
      })),
    })
  }

  const emerging = view.insights.filter((i) => i.voices.length >= 2)
  if (emerging.length > 0) {
    cats.push({
      id: 'emerging',
      icon: '✦',
      label: t('relationship.newlyDiscovered'),
      count: emerging.length,
      items: emerging.slice(0, 6).map((i) => ({
        text: i.statement,
        meta: i.voices.map((v) => String(v).padStart(2, '0')).join(' · '),
      })),
    })
  }

  if (view.themes.length > 0) {
    cats.push({
      id: 'themes',
      icon: '◈',
      label: t('relationship.bigPicture'),
      count: view.themes.length,
      items: view.themes.map((t) => ({
        text: t.title,
        meta: t.synthesisSentence,
      })),
    })
  }

  if (view.theAnswer.paragraphs.length > 0) {
    cats.push({
      id: 'answer',
      icon: '→',
      label: t('relationship.theAnswer'),
      count: view.theAnswer.paragraphs.length,
      items: view.theAnswer.paragraphs.map((p) => ({ text: p })),
    })
  }

  if (view.questionsWorthAsking.length > 0) {
    cats.push({
      id: 'questions',
      icon: '?',
      label: t('relationship.questionsToAsk'),
      count: view.questionsWorthAsking.length,
      items: view.questionsWorthAsking.map((q) => ({
        text: q.question,
        meta: q.description,
      })),
    })
  }

  return cats
}

type Props = {
  view: SynthesisViewModel
  document: SynthesisDocument
  askScope: AskScope | null
  onAskScope: (scope: AskScope | null) => void
  onAsk: (question: string) => void
}

export function ExploreDeeper({ view, document, askScope, onAskScope, onAsk }: Props) {
  const { t } = useTranslation()
  const categories = useMemo(() => buildCategories(view, t), [view, t])
  const [openId, setOpenId] = useState<string | null>(null)
  const [showDeepDive, setShowDeepDive] = useState(false)

  if (categories.length === 0 && !view.sourceReasoning.length) return null

  return (
    <section id="explore" className="border-b border-line py-10 md:py-14">
      <p className="mono-label text-[10px] text-ink-soft">{t('result.exploreDeeper')}</p>

      <div className="mt-6 divide-y divide-line border-y border-line">
        {categories.map((cat) => {
          const isOpen = openId === cat.id
          return (
            <div key={cat.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : cat.id)}
                aria-expanded={isOpen}
                aria-controls={`explore-${cat.id}`}
                className="flex w-full items-center gap-3 py-4 text-left"
              >
                <span className="mono shrink-0 text-sm text-ink">{cat.icon}</span>
                <span className="font-serif text-base text-ink">{cat.label}</span>
                <span className="mono text-[10px] text-ink-soft">· {cat.count}</span>
                <span
                  className={`ml-auto shrink-0 text-ink-soft transition-transform ${isOpen ? 'rotate-45' : ''}`}
                  aria-hidden
                >
                  +
                </span>
              </button>

              {isOpen && (
                <ul id={`explore-${cat.id}`} className="space-y-4 pb-5">
                  {cat.items.map((item, i) => (
                    <li key={i} className="border-l border-line pl-4">
                      <p className="font-serif text-base leading-relaxed text-ink">{item.text}</p>
                      {item.meta && (
                        <p className="mt-1 font-serif text-sm text-ink-soft">{item.meta}</p>
                      )}
                      {cat.id === 'questions' && (
                        <button
                          type="button"
                          onClick={() => onAsk(item.text)}
                          className="mono-label mt-2 text-[10px] text-ink-soft hover:text-ink"
                        >
                          {t('relationship.askThis')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={() => setShowDeepDive((v) => !v)}
          aria-expanded={showDeepDive}
          className="mono-label border border-line px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
        >
          {showDeepDive ? t('result.hideAdvanced') : t('result.advanced')}
        </button>

        {showDeepDive && (
          <div className="mt-6">
            <SynthesisDeepDive
              view={view}
              document={document}
              askScope={askScope}
              onAskScope={onAskScope}
            />
            {process.env.NODE_ENV !== 'production' && document.result && (
              <details className="mt-6 border border-line p-4">
                <summary className="mono-label cursor-pointer text-[10px] text-ink-soft">
                  {t('explore.debugInspect')}
                </summary>
                <pre className="mono mt-4 max-h-64 overflow-auto text-[9px] text-ink-soft">
                  {JSON.stringify(
                    {
                      claims: view.inspectStats.claimsExtracted,
                      relationships: view.inspectStats.meaningfulRelationships,
                      rejected: view.rejectedInsights.length,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
