import { createClient } from '@supabase/supabase-js'
import type { SynthesisJob, SynthesisJobStatus } from '@/lib/synthesis/synthesis-job-types'
import type { SynthesisDraft } from '@/lib/types/synthesis-draft'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { SynthesisResult } from '@/lib/types/analysis'
import type { SynthesisPerfSummary } from '@/lib/synthesis/synthesis-perf'
import * as localStore from '@/lib/synthesis/synthesis-job-store'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function rowToJob(row: Record<string, unknown>): SynthesisJob {
  return {
    id: String(row.id),
    synthesisId: String(row.synthesis_id),
    status: row.status as SynthesisJob['status'],
    phase: row.phase as SynthesisJob['phase'],
    analyzeCompleted: Number(row.analyze_completed ?? 0),
    analyzeTotal: Number(row.analyze_total ?? 0),
    error: row.error ? String(row.error) : undefined,
    draft: row.draft as SynthesisDraft,
    document: row.document as SynthesisDocument | undefined,
    result: row.result as SynthesisResult | undefined,
    perfSummary: row.perf_summary as SynthesisPerfSummary | undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    startedAt: row.started_at ? String(row.started_at) : undefined,
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
  }
}

function jobToRow(job: SynthesisJob): Record<string, unknown> {
  return {
    id: job.id,
    synthesis_id: job.synthesisId,
    status: job.status,
    phase: job.phase,
    analyze_completed: job.analyzeCompleted,
    analyze_total: job.analyzeTotal,
    error: job.error ?? null,
    draft: job.draft,
    document: job.document ?? null,
    result: job.result ?? null,
    perf_summary: job.perfSummary ?? null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    started_at: job.startedAt ?? null,
    completed_at: job.completedAt ?? null,
  }
}

export async function saveSynthesisJob(job: SynthesisJob): Promise<void> {
  await localStore.saveSynthesisJobLocal(job)

  const supabase = getSupabase()
  if (!supabase) return

  const { error } = await supabase.from('synthesis_jobs').upsert(jobToRow(job))
  if (error) {
    console.error('[SYNTHESIS JOB] supabase upsert failed', job.id, error.message)
  }
}

export async function loadSynthesisJob(jobId: string): Promise<SynthesisJob | null> {
  const local = await localStore.loadSynthesisJobLocal(jobId)
  if (local) return local

  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase.from('synthesis_jobs').select('*').eq('id', jobId).maybeSingle()
  if (error) {
    console.error('[SYNTHESIS JOB] supabase load failed', jobId, error.message)
    return null
  }
  if (!data) return null
  return rowToJob(data as Record<string, unknown>)
}

export async function findActiveSynthesisJobBySynthesisId(
  synthesisId: string,
): Promise<SynthesisJob | null> {
  const supabase = getSupabase()
  if (supabase) {
    const { data } = await supabase
      .from('synthesis_jobs')
      .select('*')
      .eq('synthesis_id', synthesisId)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) return rowToJob(data as Record<string, unknown>)
  }

  return localStore.findActiveSynthesisJobBySynthesisIdLocal(synthesisId)
}

export async function findLatestSynthesisJobBySynthesisId(
  synthesisId: string,
): Promise<SynthesisJob | null> {
  const supabase = getSupabase()
  if (supabase) {
    const { data } = await supabase
      .from('synthesis_jobs')
      .select('*')
      .eq('synthesis_id', synthesisId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) return rowToJob(data as Record<string, unknown>)
  }

  const active = await localStore.findActiveSynthesisJobBySynthesisIdLocal(synthesisId)
  if (active) return active

  try {
    const { readdir } = await import('fs/promises')
    const entries = await readdir(
      `${process.cwd()}/.data/synthesis-jobs`,
      { withFileTypes: true },
    )
    let latest: SynthesisJob | null = null
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const job = await localStore.loadSynthesisJobLocal(entry.name)
      if (!job || job.synthesisId !== synthesisId) continue
      if (!latest || job.createdAt > latest.createdAt) latest = job
    }
    return latest
  } catch {
    return null
  }
}

export async function updateSynthesisJob(
  jobId: string,
  patch: Partial<SynthesisJob>,
): Promise<SynthesisJob | null> {
  const supabase = getSupabase()
  const updated = await localStore.patchSynthesisJobLocal(jobId, patch)
  if (!updated) return null

  if (supabase) {
    const { error } = await supabase.from('synthesis_jobs').upsert(jobToRow(updated))
    if (error) {
      console.error('[SYNTHESIS JOB] supabase upsert failed', jobId, error.message)
    }
  }

  return updated
}

/**
 * Atomically claim a queued job for execution.
 * Returns the job if this caller won the claim; null if already running/completed/missing.
 */
export async function tryClaimSynthesisJob(jobId: string): Promise<SynthesisJob | null> {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  if (supabase) {
    const { data } = await supabase
      .from('synthesis_jobs')
      .update({
        status: 'running',
        phase: 'analyzing',
        started_at: now,
        updated_at: now,
      })
      .eq('id', jobId)
      .eq('status', 'queued')
      .select('*')
      .maybeSingle()

    if (data) {
      const job = rowToJob(data as Record<string, unknown>)
      await localStore.saveSynthesisJobLocal(job)
      return job
    }

    const existing = await loadSynthesisJob(jobId)
    if (!existing) return null
    if (existing.status === 'running' || existing.status === 'completed' || existing.status === 'failed') {
      return null
    }
    return null
  }

  const existing = await localStore.loadSynthesisJobLocal(jobId)
  if (!existing || existing.status !== 'queued') return null

  const claimed: SynthesisJob = {
    ...existing,
    status: 'running',
    phase: 'analyzing',
    startedAt: now,
    updatedAt: now,
  }
  await localStore.saveSynthesisJobLocal(claimed)
  return claimed
}

export function createSynthesisJobRecord(input: {
  synthesisId: string
  draft: SynthesisDraft
}): SynthesisJob {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    synthesisId: input.synthesisId,
    status: 'queued',
    phase: 'queued',
    analyzeCompleted: 0,
    analyzeTotal: input.draft.voices.length,
    draft: input.draft,
    createdAt: now,
    updatedAt: now,
  }
}

export function isTerminalJobStatus(status: SynthesisJobStatus): boolean {
  return status === 'completed' || status === 'failed'
}
