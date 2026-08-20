import type { AIUsageRecord } from '@/lib/ai/usage/types'

export type PerfPhaseRecord = {
  name: string
  durationMs: number
  metadata?: Record<string, string | number | boolean>
}

export type SynthesisPerfSummary = {
  phases: PerfPhaseRecord[]
  /** Wall-clock duration of the `total` phase (true pipeline time) */
  totalMs: number
  /** Sum of sub-stage phases (excludes `total`) — for breakdown only */
  stagesMs: number
  llmCalls: number
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number | null
  cachedSources: number
  uncachedSources: number
  /** Unique ID for this pipeline execution (debug) */
  pipelineRunId?: string
  /** Client-side: time spent in individual video analysis before synthesis API */
  individualAnalysisMs?: number
  /** Client-side: analyze + pipeline wall-clock */
  endToEndMs?: number
}

export class SynthesisPerfCollector {
  private phases: PerfPhaseRecord[] = []
  private timers = new Map<string, number>()

  start(name: string): void {
    this.timers.set(name, Date.now())
  }

  end(name: string, metadata?: Record<string, string | number | boolean>): void {
    const started = this.timers.get(name)
    if (started == null) return
    this.phases.push({
      name,
      durationMs: Date.now() - started,
      metadata,
    })
    this.timers.delete(name)
  }

  async time<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, string | number | boolean>,
  ): Promise<T> {
    this.start(name)
    try {
      return await fn()
    } finally {
      this.end(name, metadata)
    }
  }

  summary(
    llmRecords: AIUsageRecord[],
    sourceStats?: { cached: number; uncached: number },
    pipelineRunId?: string,
  ): SynthesisPerfSummary {
    const totalPhase = this.phases.find((p) => p.name === 'total')
    const stagesMs = this.phases
      .filter((p) => p.name !== 'total')
      .reduce((n, p) => n + p.durationMs, 0)
    const pipelineWallMs = totalPhase?.durationMs ?? stagesMs
    const inputTokens = llmRecords.reduce((n, r) => n + (r.inputTokens ?? 0), 0)
    const outputTokens = llmRecords.reduce((n, r) => n + (r.outputTokens ?? 0), 0)
    const costs = llmRecords
      .map((r) => r.estimatedCostUsd)
      .filter((c): c is number => c != null)

    return {
      phases: this.phases,
      totalMs: pipelineWallMs,
      stagesMs,
      llmCalls: llmRecords.length,
      inputTokens,
      outputTokens,
      estimatedCostUsd: costs.length > 0 ? costs.reduce((a, b) => a + b, 0) : null,
      cachedSources: sourceStats?.cached ?? 0,
      uncachedSources: sourceStats?.uncached ?? 0,
      pipelineRunId,
    }
  }

  log(summary: SynthesisPerfSummary, llmRecords: AIUsageRecord[]): void {
    if (process.env.NODE_ENV === 'production' && process.env.AI_COST_DEBUG !== '1') return

    console.log('[SYNTHESIS PERF]')
    for (const phase of summary.phases) {
      const meta = phase.metadata
        ? ` ${Object.entries(phase.metadata)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ')}`
        : ''
      console.log(`${phase.name.padEnd(28)} ${phase.durationMs}ms${meta}`)
    }
    console.log(`TOTAL (wall)`.padEnd(28) + ` ${summary.totalMs}ms`)
    if (summary.stagesMs !== summary.totalMs) {
      console.log(`STAGES (sum)`.padEnd(28) + ` ${summary.stagesMs}ms`)
    }
    if (summary.pipelineRunId) {
      console.log(`pipeline_run_id`.padEnd(28) + ` ${summary.pipelineRunId}`)
    }

    console.log('[LLM PERF]')
    for (const r of llmRecords) {
      const promptMeta =
        r.promptCharLength != null
          ? ` prompt_chars=${r.promptCharLength} ctx_bytes=${r.contextObjectSize ?? 'n/a'}`
          : ''
      console.log(
        `${r.operation} model=${r.model} input=${r.inputTokens ?? '?'} output=${r.outputTokens ?? '?'} ` +
          `cached=${r.cachedInputTokens ?? 0} reasoning=${r.reasoningTokens ?? 0} ` +
          `max_out=${r.maxOutputTokens ?? 'default'} effort=${r.reasoningEffort ?? 'default'} ` +
          `duration=${(r.durationMs / 1000).toFixed(1)}s retry=${r.retryCount} success=${r.success}${promptMeta}`,
      )
    }

    console.log('[SYNTHESIS METRICS]')
    console.log(
      `sources=${summary.cachedSources + summary.uncachedSources} ` +
        `cachedSources=${summary.cachedSources} uncachedSources=${summary.uncachedSources}`,
    )
    console.log(
      `LLM calls: ${summary.llmCalls} inputTokens=${summary.inputTokens} outputTokens=${summary.outputTokens}`,
    )
    console.log(
      `duration=${(summary.totalMs / 1000).toFixed(1)}s ` +
        `estimatedCost=${summary.estimatedCostUsd != null ? `$${summary.estimatedCostUsd.toFixed(4)}` : 'n/a'}`,
    )
  }
}
