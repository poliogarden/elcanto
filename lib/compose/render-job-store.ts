import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import type { RenderJob } from '@/lib/types/composition'
import type { RenderManifest } from '@/lib/compose/render-manifest'

const JOBS_DIR = path.join(process.cwd(), '.data', 'render-jobs')

export type StoredRenderJob = RenderJob & {
  manifest?: RenderManifest
  ffmpegScript?: string
  message?: string
  progress?: number
  progressLabel?: string
}

async function jobPath(jobId: string): Promise<string> {
  const dir = path.join(JOBS_DIR, jobId)
  await mkdir(dir, { recursive: true })
  return path.join(dir, 'job.json')
}

export async function saveRenderJob(job: StoredRenderJob): Promise<void> {
  const file = await jobPath(job.id)
  await writeFile(file, JSON.stringify(job, null, 2), 'utf8')
}

export async function loadRenderJob(jobId: string): Promise<StoredRenderJob | null> {
  try {
    const file = path.join(JOBS_DIR, jobId, 'job.json')
    const raw = await readFile(file, 'utf8')
    return JSON.parse(raw) as StoredRenderJob
  } catch {
    return null
  }
}

export async function updateRenderJob(
  jobId: string,
  patch: Partial<StoredRenderJob>,
): Promise<StoredRenderJob | null> {
  const existing = await loadRenderJob(jobId)
  if (!existing) return null
  const next = { ...existing, ...patch }
  await saveRenderJob(next)
  return next
}
