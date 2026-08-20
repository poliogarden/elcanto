'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { HomePageShell } from '@/components/home/home-page-shell'
import type { SynthesisPerfSummary } from '@/lib/synthesis/synthesis-perf'

type Props = {
  synthesisId: string
}

export function SynthesisPerfDebug({ synthesisId }: Props) {
  const searchParams = useSearchParams()
  const [perf, setPerf] = useState<SynthesisPerfSummary | null>(null)

  useEffect(() => {
    if (searchParams.get('debug') !== 'perf' && process.env.NODE_ENV === 'production') return

    try {
      const raw = sessionStorage.getItem(`synthesis-perf-${synthesisId}`)
      if (raw) setPerf(JSON.parse(raw) as SynthesisPerfSummary)
    } catch {
      // ignore
    }
  }, [synthesisId, searchParams])

  if (!perf || (process.env.NODE_ENV === 'production' && searchParams.get('debug') !== 'perf')) {
    return null
  }

  return (
    <section className="border-b border-line bg-paper-2 py-6">
      <HomePageShell>
        <div className="mx-auto max-w-xl text-center">
          <p className="mono-label text-[10px] text-ink-soft">PERFORMANCE DEBUG</p>
          <div className="mono mt-4 space-y-1 text-[11px] text-ink-soft">
            {perf.individualAnalysisMs != null && (
              <p>individual_analysis: {perf.individualAnalysisMs}ms</p>
            )}
            {perf.phases.map((phase) => (
              <p key={phase.name}>
                {phase.name}: {phase.durationMs}ms
                {phase.metadata
                  ? ` (${Object.entries(phase.metadata)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(', ')})`
                  : ''}
              </p>
            ))}
            <p className="pt-2 text-ink">
              pipeline (wall) {perf.totalMs}ms
              {perf.stagesMs > 0 && perf.stagesMs !== perf.totalMs ? ` · stages ${perf.stagesMs}ms` : ''}
              {perf.endToEndMs != null ? ` · end-to-end ${perf.endToEndMs}ms` : ''} · LLM {perf.llmCalls}{' '}
              calls · tokens in/out {perf.inputTokens}/{perf.outputTokens}
            </p>
            {perf.pipelineRunId && (
              <p className="text-ink-soft">run: {perf.pipelineRunId}</p>
            )}
          </div>
        </div>
      </HomePageShell>
    </section>
  )
}
