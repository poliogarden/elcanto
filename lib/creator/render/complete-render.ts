import { loadProject, saveProject, saveRenderJob, type StoredRenderJob } from '@/lib/creator/storage/local-store'
import type { VideoProject } from '@/lib/creator/types'
import { resolveCreatorOutputUrl } from '@/lib/creator/render/resolve-output-url'

export async function persistRenderJobUpdate(
  jobId: string,
  patch: Partial<StoredRenderJob> & { projectId?: string },
): Promise<StoredRenderJob | null> {
  const { loadRenderJob } = await import('@/lib/creator/storage/local-store')
  const existing = await loadRenderJob(jobId)
  const job: StoredRenderJob = {
    id: jobId,
    projectId: patch.projectId ?? existing?.projectId ?? '',
    status: patch.status ?? existing?.status ?? 'QUEUED',
    progress: patch.progress ?? existing?.progress ?? 0,
    progressLabel: patch.progressLabel ?? existing?.progressLabel,
    outputUrl: patch.outputUrl ?? existing?.outputUrl,
    error: patch.error ?? existing?.error,
    versionLabel: patch.versionLabel ?? existing?.versionLabel,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    completedAt: patch.completedAt ?? existing?.completedAt,
  }
  await saveRenderJob(job)
  return job
}

export async function applyRenderCompletionToProject(
  projectId: string,
  jobId: string,
  outputUrl: string | null,
  status: 'READY' | 'FAILED',
  error?: string,
): Promise<VideoProject | null> {
  const project = await loadProject(projectId)
  if (!project) return null

  const resolved = resolveCreatorOutputUrl(outputUrl)
  const versions = project.renderVersions.map((v) =>
    v.renderJobId === jobId ? { ...v, outputUrl: resolved } : v,
  )

  const updated: VideoProject = {
    ...project,
    renderVersions: versions,
    status: status === 'READY' ? 'ready' : 'failed',
    stage: status === 'READY' ? 'preview' : project.stage,
    updatedAt: new Date().toISOString(),
  }
  await saveProject(updated)
  return updated
}
