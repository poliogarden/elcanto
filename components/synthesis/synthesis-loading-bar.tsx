'use client'

import { AsterismMark } from '@/components/brand/asterism-mark'
import type { SynthesisProgressPhase } from '@/lib/synthesis/progress-events'

const PHASE_PROGRESS: Partial<Record<SynthesisProgressPhase, number>> = {
  relationship: 14,
  set_analysis: 26,
  combined_analysis: 34,
  emergent_insight: 52,
  fourth_idea: 68,
  insight_map: 84,
  db_save: 94,
}

const STEP_PROGRESS = [14, 52, 84] as const

type SynthesisLoadingBarProps = {
  step: number
  backendPhase?: SynthesisProgressPhase | null
  elapsedSec?: number
  statusLabel?: string
}

function resolveProgress(
  step: number,
  backendPhase?: SynthesisProgressPhase | null,
  elapsedSec = 0,
): number {
  const fromPhase = backendPhase ? PHASE_PROGRESS[backendPhase] : undefined
  const fromStep = STEP_PROGRESS[Math.min(Math.max(step, 0), 2)] ?? 14
  const base = fromPhase ?? fromStep
  const creep = Math.min(6, Math.floor(elapsedSec / 10))
  return Math.min(96, base + creep)
}

export function SynthesisLoadingBar({
  step,
  backendPhase,
  elapsedSec = 0,
  statusLabel,
}: SynthesisLoadingBarProps) {
  const progress = resolveProgress(step, backendPhase, elapsedSec)

  return (
    <div
      className="mx-auto mt-6 w-full max-w-md"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label={statusLabel}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AsterismMark size={18} animate className="text-mint-ink" compact />
          <span className="mono-label text-[10px] text-mint-ink">
            {statusLabel ?? 'SYNTHESIS'}
          </span>
        </div>
        <span className="mono text-[10px] tabular-nums text-ink-soft">{progress}%</span>
      </div>

      <div className="relative h-[3px] w-full bg-line/25">
        <div
          className="synthesis-bar-fill absolute inset-y-0 left-0 bg-mint-ink transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div
          className="synthesis-bar-glow pointer-events-none absolute inset-y-0 bg-mint/60"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      </div>

      <div className="mt-3 flex justify-between gap-2">
        {[0, 1, 2].map((index) => {
          const active = step > index
          const current = step === index
          return (
            <span
              key={index}
              className={`mono-label text-[9px] transition-colors ${
                current
                  ? 'text-mint-ink'
                  : active
                    ? 'text-ink'
                    : 'text-ink-soft/45'
              }`}
            >
              <span className="mr-1 tabular-nums">{index + 1}</span>
              <span
                className={`inline-block h-1 w-6 align-middle ${
                  current ? 'bg-mint-ink' : active ? 'bg-ink' : 'bg-line/40'
                }`}
                aria-hidden
              />
            </span>
          )
        })}
      </div>
    </div>
  )
}
