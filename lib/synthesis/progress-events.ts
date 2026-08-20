import type { SynthesisPerfSummary } from '@/lib/synthesis/synthesis-perf'
import type { SynthesisResult } from '@/lib/types/analysis'

export type SynthesisProgressPhase =
  | 'relationship'
  | 'set_analysis'
  | 'combined_analysis'
  | 'emergent_insight'
  | 'fourth_idea'
  | 'insight_map'
  | 'db_save'

export type SynthesisProgressEvent =
  | {
      type: 'phase'
      phase: SynthesisProgressPhase
      status: 'start' | 'complete'
      metadata?: Record<string, string | number | boolean>
    }
  | {
      type: 'heartbeat'
      phase: SynthesisProgressPhase
      elapsedMs: number
      message?: string
    }
  | {
      type: 'complete'
      result: SynthesisResult
      perfSummary?: SynthesisPerfSummary
      costSummary?: unknown
      qualityMetrics?: unknown
    }
  | { type: 'error'; message: string }

export function formatSseEvent(event: SynthesisProgressEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export type SynthesisStreamCompletePayload = Extract<
  SynthesisProgressEvent,
  { type: 'complete' }
>
