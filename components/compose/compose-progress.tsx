'use client'

import { COMPOSE_LOADING_STEPS } from '@/lib/types/composition'
import { AsterismMark } from '@/components/compose/asterism-mark'

type Props = {
  step: number
}

export function ComposeProgress({ step }: Props) {
  const label = COMPOSE_LOADING_STEPS[Math.min(step, COMPOSE_LOADING_STEPS.length - 1)]

  return (
    <div className="flex flex-col items-center justify-center py-24 md:py-32">
      <AsterismMark size={72} animate className="text-ink" />
      <p className="mono-label mt-8 text-xs text-ink-soft">{label}</p>
      <div className="mt-6 flex gap-2">
        {COMPOSE_LOADING_STEPS.map((s, i) => (
          <span
            key={s}
            className={`h-1 w-8 ${i <= step ? 'bg-ink' : 'bg-line'}`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  )
}
