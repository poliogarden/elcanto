import type { SynthesisJobPublic } from '@/lib/synthesis/synthesis-job-types'
import type { SynthesisDraft } from '@/lib/types/synthesis-draft'

export async function createOrResumeSynthesisJob(input: {
  synthesisId: string
  draft: SynthesisDraft
}): Promise<{ job: SynthesisJobPublic; reused: boolean }> {
  const res = await fetch('/api/synthesis/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      synthesisId: input.synthesisId,
      draft: input.draft,
    }),
  })

  const data = (await res.json()) as {
    job?: SynthesisJobPublic
    reused?: boolean
    error?: string
  }

  if (!res.ok || !data.job) {
    throw new Error(data.error ?? 'Failed to create synthesis job.')
  }

  return { job: data.job, reused: Boolean(data.reused) }
}

export async function fetchSynthesisJob(jobId: string): Promise<SynthesisJobPublic> {
  const res = await fetch(`/api/synthesis/jobs/${jobId}`)
  const data = (await res.json()) as { job?: SynthesisJobPublic; error?: string }

  if (!res.ok || !data.job) {
    throw new Error(data.error ?? 'Job not found.')
  }

  return data.job
}

export async function fetchSynthesisJobBySynthesisId(
  synthesisId: string,
): Promise<SynthesisJobPublic | null> {
  const res = await fetch(`/api/synthesis/jobs?synthesisId=${encodeURIComponent(synthesisId)}`)
  if (res.status === 404) return null

  const data = (await res.json()) as { job?: SynthesisJobPublic; error?: string }
  if (!res.ok || !data.job) return null
  return data.job
}

export const SYNTHESIS_JOB_POLL_MS = 2000

export function isSynthesisJobTerminal(job: SynthesisJobPublic): boolean {
  return job.status === 'completed' || job.status === 'failed'
}

export function jobPhaseLabel(job: SynthesisJobPublic): string {
  switch (job.phase) {
    case 'queued':
      return 'QUEUED'
    case 'analyzing':
      return job.analyzeTotal > 0
        ? `ANALYZING ${job.analyzeCompleted} / ${job.analyzeTotal}`
        : 'ANALYZING'
    case 'connecting':
      return 'CONNECTING'
    case 'synthesizing':
      return 'SYNTHESIZING'
    case 'exploring':
      return 'EXPLORING'
    case 'complete':
      return 'COMPLETE'
    default:
      return job.phase
  }
}
