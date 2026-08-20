import type { SynthesisResult } from '@/lib/types/analysis'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { SynthesisDraft } from '@/lib/types/synthesis-draft'
import type { SynthesisPerfSummary } from '@/lib/synthesis/synthesis-perf'

/** Persisted job lifecycle status */
export type SynthesisJobStatus = 'queued' | 'running' | 'completed' | 'failed'

/** UX-facing pipeline phase (maps to backend progress) */
export type SynthesisJobPhase =
  | 'queued'
  | 'analyzing'
  | 'connecting'
  | 'synthesizing'
  | 'exploring'
  | 'complete'

export type SynthesisJob = {
  id: string
  synthesisId: string
  status: SynthesisJobStatus
  phase: SynthesisJobPhase
  analyzeCompleted: number
  analyzeTotal: number
  error?: string
  draft: SynthesisDraft
  document?: SynthesisDocument
  result?: SynthesisResult
  perfSummary?: SynthesisPerfSummary
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
}

export type SynthesisJobPublic = Pick<
  SynthesisJob,
  | 'id'
  | 'synthesisId'
  | 'status'
  | 'phase'
  | 'analyzeCompleted'
  | 'analyzeTotal'
  | 'error'
  | 'document'
  | 'result'
  | 'perfSummary'
  | 'createdAt'
  | 'updatedAt'
  | 'startedAt'
  | 'completedAt'
>

export function toPublicSynthesisJob(job: SynthesisJob): SynthesisJobPublic {
  return {
    id: job.id,
    synthesisId: job.synthesisId,
    status: job.status,
    phase: job.phase,
    analyzeCompleted: job.analyzeCompleted,
    analyzeTotal: job.analyzeTotal,
    error: job.error,
    document: job.document,
    result: job.result,
    perfSummary: job.perfSummary,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  }
}
