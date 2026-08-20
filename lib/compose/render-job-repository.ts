import { createClient } from '@supabase/supabase-js'
import type { RenderJob } from '@/lib/types/composition'
import type { RenderManifest } from '@/lib/compose/render-manifest'
import * as localStore from '@/lib/compose/render-job-store'

export type StoredRenderJob = RenderJob & {
  manifest?: RenderManifest
  ffmpegScript?: string
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function useSupabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function rowToJob(row: Record<string, unknown>): StoredRenderJob {
  return {
    id: String(row.id),
    compositionId: String(row.composition_id),
    status: row.status as RenderJob['status'],
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    error: row.error ? String(row.error) : undefined,
    outputUrl: row.output_url ? String(row.output_url) : undefined,
    progress: typeof row.progress === 'number' ? row.progress : undefined,
    progressLabel: row.progress_label ? String(row.progress_label) : undefined,
    message: row.message ? String(row.message) : undefined,
    manifestVersion: typeof row.manifest_version === 'number' ? row.manifest_version : undefined,
    hasFfmpegScript: Boolean(row.has_ffmpeg_script),
    manifest: row.manifest as RenderManifest | undefined,
    ffmpegScript: row.ffmpeg_script ? String(row.ffmpeg_script) : undefined,
  }
}

export async function saveRenderJob(job: StoredRenderJob): Promise<void> {
  await localStore.saveRenderJob({
    ...job,
    manifest: job.manifest ?? {
      version: 1,
      compositionId: job.compositionId,
      title: '',
      thesis: '',
      totalDurationSeconds: 0,
      clips: [],
      interludes: [],
      attribution: [],
    },
  } as localStore.StoredRenderJob)

  const supabase = getSupabase()
  if (!supabase) return

  await supabase.from('render_jobs').upsert({
    id: job.id,
    composition_id: job.compositionId,
    status: job.status,
    progress: job.progress ?? 0,
    progress_label: job.progressLabel,
    message: job.message,
    error: job.error,
    output_url: job.outputUrl,
    manifest_version: job.manifestVersion,
    has_ffmpeg_script: job.hasFfmpegScript ?? false,
    manifest: job.manifest ?? null,
    ffmpeg_script: job.ffmpegScript ?? null,
    created_at: job.createdAt,
    completed_at: job.completedAt ?? null,
  })
}

export async function loadRenderJob(jobId: string): Promise<StoredRenderJob | null> {
  const supabase = getSupabase()
  if (supabase) {
    const { data } = await supabase.from('render_jobs').select('*').eq('id', jobId).maybeSingle()
    if (data) return rowToJob(data)
  }

  return localStore.loadRenderJob(jobId)
}

export async function updateRenderJob(
  jobId: string,
  patch: Partial<StoredRenderJob>,
): Promise<StoredRenderJob | null> {
  const existing = await loadRenderJob(jobId)
  if (!existing) return null

  const next: StoredRenderJob = { ...existing, ...patch }
  await saveRenderJob(next)
  return next
}

export function isRenderJobCloudEnabled(): boolean {
  return useSupabase()
}
