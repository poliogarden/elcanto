import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import path from 'path'
import type { SynthesisJob } from '@/lib/synthesis/synthesis-job-types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { SynthesisResult } from '@/lib/types/analysis'
import type { SynthesisPerfSummary } from '@/lib/synthesis/synthesis-perf'
import type { SynthesisDraft } from '@/lib/types/synthesis-draft'

const JOBS_DIR = path.join(process.cwd(), '.data', 'synthesis-jobs')

type StoredJobMeta = {
  id: string
  synthesisId: string
  status: SynthesisJob['status']
  phase: SynthesisJob['phase']
  analyzeCompleted: number
  analyzeTotal: number
  error?: string
  draft: SynthesisDraft
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
}

type StoredJobExtras = {
  result?: SynthesisResult
  perfSummary?: SynthesisPerfSummary
}

const writeLocks = new Map<string, Promise<unknown>>()

async function withWriteLock<T>(jobId: string, fn: () => Promise<T>): Promise<T> {
  const tail = writeLocks.get(jobId) ?? Promise.resolve()
  let result!: T
  const run = tail.then(async () => {
    result = await fn()
    return result
  })
  writeLocks.set(jobId, run)
  try {
    await run
    return result
  } finally {
    if (writeLocks.get(jobId) === run) writeLocks.delete(jobId)
  }
}

function jobDir(jobId: string): string {
  return path.join(JOBS_DIR, jobId)
}

async function ensureJobDir(jobId: string): Promise<void> {
  await mkdir(jobDir(jobId), { recursive: true })
}

async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const tmpPath = `${filePath}.${process.pid}.tmp`
  await writeFile(tmpPath, contents, 'utf8')
  await rename(tmpPath, filePath)
}

function metaFromJob(job: SynthesisJob): StoredJobMeta {
  return {
    id: job.id,
    synthesisId: job.synthesisId,
    status: job.status,
    phase: job.phase,
    analyzeCompleted: job.analyzeCompleted,
    analyzeTotal: job.analyzeTotal,
    error: job.error,
    draft: job.draft,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  }
}

function assembleJob(
  meta: StoredJobMeta,
  document?: SynthesisDocument,
  extras?: StoredJobExtras,
): SynthesisJob {
  return {
    ...meta,
    document,
    result: extras?.result,
    perfSummary: extras?.perfSummary,
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf8')
    const cleaned = raw.replace(/\0/g, '').trim()
    if (!cleaned) return null
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}

async function loadLegacyJob(jobId: string): Promise<SynthesisJob | null> {
  const legacyPath = path.join(jobDir(jobId), 'job.json')
  const job = await readJsonFile<SynthesisJob>(legacyPath)
  if (!job) return null
  return job
}

async function loadSplitJob(jobId: string): Promise<SynthesisJob | null> {
  const meta = await readJsonFile<StoredJobMeta>(path.join(jobDir(jobId), 'meta.json'))
  if (!meta) return null

  const document = await readJsonFile<SynthesisDocument>(path.join(jobDir(jobId), 'document.json'))
  const extras = await readJsonFile<StoredJobExtras>(path.join(jobDir(jobId), 'extras.json'))

  return assembleJob(meta, document ?? undefined, extras ?? undefined)
}

export async function saveSynthesisJobLocal(job: SynthesisJob): Promise<void> {
  await withWriteLock(job.id, async () => {
    await ensureJobDir(job.id)
    const dir = jobDir(job.id)

    const meta = metaFromJob({ ...job, updatedAt: new Date().toISOString() })
    await atomicWrite(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2))

    if (job.document) {
      await atomicWrite(path.join(dir, 'document.json'), JSON.stringify(job.document))
    }

    if (job.result || job.perfSummary) {
      const extras: StoredJobExtras = {
        result: job.result,
        perfSummary: job.perfSummary,
      }
      await atomicWrite(path.join(dir, 'extras.json'), JSON.stringify(extras))
    }
  })
}

export async function patchSynthesisJobLocal(
  jobId: string,
  patch: Partial<SynthesisJob>,
): Promise<SynthesisJob | null> {
  return withWriteLock(jobId, async () => {
    const existing = (await loadSplitJob(jobId)) ?? (await loadLegacyJob(jobId))
    if (!existing) return null

    const next: SynthesisJob = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    }

    await ensureJobDir(jobId)
    const dir = jobDir(jobId)
    const meta = metaFromJob(next)
    await atomicWrite(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2))

    if (patch.document !== undefined) {
      if (next.document) {
        await atomicWrite(path.join(dir, 'document.json'), JSON.stringify(next.document))
      }
    }

    if (patch.result !== undefined || patch.perfSummary !== undefined) {
      const extras: StoredJobExtras = {
        result: next.result,
        perfSummary: next.perfSummary,
      }
      await atomicWrite(path.join(dir, 'extras.json'), JSON.stringify(extras))
    }

    return next
  })
}

export async function loadSynthesisJobLocal(jobId: string): Promise<SynthesisJob | null> {
  const split = await loadSplitJob(jobId)
  if (split) return split
  return loadLegacyJob(jobId)
}

export async function findActiveSynthesisJobBySynthesisIdLocal(
  synthesisId: string,
): Promise<SynthesisJob | null> {
  try {
    const { readdir } = await import('fs/promises')
    const entries = await readdir(JOBS_DIR, { withFileTypes: true })
    let latest: SynthesisJob | null = null

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const job = await loadSynthesisJobLocal(entry.name)
      if (!job || job.synthesisId !== synthesisId) continue
      if (job.status !== 'queued' && job.status !== 'running') continue
      if (!latest || job.createdAt > latest.createdAt) latest = job
    }

    return latest
  } catch {
    return null
  }
}

export type RecentSynthesisJobSummary = {
  jobId: string
  synthesisId: string
  status: SynthesisJob['status']
  createdAt: string
  completedAt?: string
  voiceCount: number
  analyzedCount?: number
  failedCount?: number
  engineVersion?: string
  topic?: string
  endToEndMs?: number
  totalCostUsd?: number | null
}

export async function listRecentSynthesisJobsLocal(
  limit = 50,
): Promise<RecentSynthesisJobSummary[]> {
  try {
    const { readdir } = await import('fs/promises')
    const entries = await readdir(JOBS_DIR, { withFileTypes: true })
    const summaries: RecentSynthesisJobSummary[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const job = await loadSynthesisJobLocal(entry.name)
      if (!job) continue

      const doc = job.document
      const meta = doc?.productionMeta
      summaries.push({
        jobId: job.id,
        synthesisId: job.synthesisId,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        voiceCount: job.draft.voices.length,
        analyzedCount: meta?.analyzedCount ?? doc?.voices.filter((v) => v.analysis).length,
        failedCount: meta?.failedCount,
        engineVersion: meta?.reasoningEngineVersion,
        topic: doc?.topic ?? doc?.userQuestion,
        endToEndMs: meta?.perfSummary?.endToEndMs ?? job.perfSummary?.endToEndMs,
        totalCostUsd:
          meta?.costSummary?.totalEstimatedCostUsd ??
          job.perfSummary?.estimatedCostUsd,
      })
    }

    return summaries
      .sort((a, b) => {
        const aTime = a.completedAt ?? a.createdAt
        const bTime = b.completedAt ?? b.createdAt
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })
      .slice(0, limit)
  } catch {
    return []
  }
}
