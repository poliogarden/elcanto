'use client'

import { useState } from 'react'
import type { SynthesisViewModel } from '@/lib/types/view-model'

type ExploreGroup = {
  id: string
  label: string
  count: number
  blurb: string
  items: Array<{ text: string; from: string[] }>
}

function buildExploreGroups(view: SynthesisViewModel): ExploreGroup[] {
  const groups: ExploreGroup[] = []

  if (view.editorialAgreements.length > 0) {
    groups.push({
      id: 'shared',
      label: 'SHARED',
      count: view.editorialAgreements.length,
      blurb: 'What most voices agree on',
      items: view.editorialAgreements.map((item) => ({
        text: item.title,
        from: [item.sideA.label, item.sideB.label].filter(Boolean),
      })),
    })
  }

  if (view.editorialDisagreements.length > 0) {
    groups.push({
      id: 'different',
      label: 'DIFFERENT',
      count: view.editorialDisagreements.length,
      blurb: 'Where their views diverge',
      items: view.editorialDisagreements.map((item) => ({
        text: item.title,
        from: [item.sideA.label, item.sideB.label].filter(Boolean),
      })),
    })
  }

  if (view.contradictions.length > 0) {
    groups.push({
      id: 'contradictions',
      label: 'CONTRADICTIONS',
      count: view.contradictions.length,
      blurb: 'Where they directly conflict',
      items: view.contradictions.map((item) => ({
        text: item.description,
        from: item.voices.map((v) => String(v).padStart(2, '0')),
      })),
    })
  }

  const uniqueInsights = view.insights.filter((i) => i.voices.length === 1)
  if (uniqueInsights.length > 0) {
    groups.push({
      id: 'unique',
      label: 'UNIQUE',
      count: uniqueInsights.length,
      blurb: 'Ideas only one voice contributes',
      items: uniqueInsights.slice(0, 8).map((item) => ({
        text: item.statement,
        from: item.voices.map((v) => String(v).padStart(2, '0')),
      })),
    })
  }

  if (view.fourthIdea) {
    groups.push({
      id: 'emerging',
      label: 'EMERGING',
      count: 1,
      blurb: 'Ideas visible only together',
      items: [
        {
          text: view.fourthIdea.statement,
          from: view.fourthIdea.voices.map((v) => String(v).padStart(2, '0')),
        },
      ],
    })
  }

  return groups
}

type Props = {
  view: SynthesisViewModel
}

export function ExploreVoicesSection({ view }: Props) {
  const groups = buildExploreGroups(view)
  const [openId, setOpenId] = useState<string | null>(groups[0]?.id ?? null)

  if (groups.length === 0) return null

  return (
    <section className="border-b border-line py-8 md:py-10" aria-labelledby="explore-heading">
      <p className="mono-label text-[10px] text-ink-soft" id="explore-heading">
        EXPLORE
      </p>

      <div className="mt-4 divide-y divide-line border-y border-line">
        {groups.map((group) => {
          const isOpen = openId === group.id
          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : group.id)}
                className="flex w-full items-center gap-4 py-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="mono-label shrink-0 text-[10px] text-ink">{group.label}</span>
                <span className="mono text-xs text-ink-soft tabular-nums">· {group.count}</span>
                <span className="flex-1 font-serif text-sm text-ink-soft">{group.blurb}</span>
                <span
                  className={`shrink-0 text-ink-soft transition-transform ${isOpen ? 'rotate-45' : ''}`}
                  aria-hidden
                >
                  +
                </span>
              </button>

              {isOpen && (
                <ul className="space-y-3 pb-5 pl-2">
                  {group.items.map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-mint" aria-hidden />
                      <p className="font-serif text-base leading-relaxed text-ink">
                        {item.text}
                        {item.from.length > 0 && (
                          <span className="ml-2 font-mono text-[10px] text-ink-soft">
                            {item.from.map((f) => `· ${f}`).join(' ')}
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
