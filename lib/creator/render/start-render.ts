import { randomUUID } from 'crypto'
import {
  getRenderWorkerSecret,
  getRenderWorkerUrl,
  isRenderWorkerConfigured,
} from '@/lib/compose/render-worker-url'
import { buildCreatorRenderManifest } from '@/lib/creator/render/creator-render-manifest'
import type { VideoProject } from '@/lib/creator/types'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { creatorRenderDir, saveRenderJob } from '@/lib/creator/storage/local-store'

export type CreatorRenderJob = {
  id: string
  projectId: string
  status: string
  progress: number
  progressLabel: string
  outputUrl?: string
  error?: string
  versionLabel: string
  createdAt: string
  completedAt?: string
}

export async function startCreatorRender(input: {
  project: VideoProject
  versionLabel: string
  draft?: boolean
}): Promise<CreatorRenderJob> {
  const jobId = randomUUID()
  const manifest = buildCreatorRenderManifest(input.project)
  const renderDir = creatorRenderDir(input.project.id)
  await mkdir(renderDir, { recursive: true })
  await writeFile(path.join(renderDir, `${jobId}-manifest.json`), JSON.stringify(manifest, null, 2))

  const job: CreatorRenderJob = {
    id: jobId,
    projectId: input.project.id,
    status: 'QUEUED',
    progress: 0,
    progressLabel: 'Queued',
    versionLabel: input.versionLabel,
    createdAt: new Date().toISOString(),
  }

  await saveRenderJob({
    id: jobId,
    projectId: input.project.id,
    status: 'QUEUED',
    progress: 0,
    progressLabel: 'Queued',
    versionLabel: input.versionLabel,
    createdAt: job.createdAt,
  })

  if (!isRenderWorkerConfigured()) {
    await runLocalCreatorRender(job, manifest, input.draft ?? false)
    return job
  }

  const workerUrl = getRenderWorkerUrl()!
  const secret = getRenderWorkerSecret() ?? ''
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  await fetch(`${workerUrl}/render-creator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': secret,
    },
    body: JSON.stringify({
      jobId,
      manifest,
      webhookUrl: `${appUrl}/api/creator/render/webhook`,
      draft: input.draft ?? false,
    }),
  })

  return job
}

async function runLocalCreatorRender(
  job: CreatorRenderJob,
  manifest: ReturnType<typeof buildCreatorRenderManifest>,
  draft: boolean,
): Promise<void> {
  const workerUrl = process.env.LOCAL_RENDER_WORKER_URL ?? 'http://localhost:8788'
  const secret = process.env.WORKER_SECRET ?? 'dev-secret-change-me'
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  try {
    const res = await fetch(`${workerUrl}/render-creator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': secret,
      },
      body: JSON.stringify({
        jobId: job.id,
        manifest,
        webhookUrl: `${appUrl}/api/creator/render/webhook`,
        draft,
      }),
    })
    if (!res.ok) {
      job.status = 'FAILED'
      job.error = await res.text()
    }
  } catch (err) {
    job.status = 'FAILED'
    job.error = err instanceof Error ? err.message : 'Render worker unavailable'
  }
}

export async function pollCreatorRenderStatus(
  jobId: string,
): Promise<CreatorRenderJob | null> {
  const workerUrl = getRenderWorkerUrl() ?? process.env.LOCAL_RENDER_WORKER_URL ?? 'http://localhost:8788'
  const secret = getRenderWorkerSecret() ?? process.env.WORKER_SECRET ?? ''
  try {
    const res = await fetch(`${workerUrl}/render-creator-status/${jobId}`, {
      headers: { 'x-worker-secret': secret },
    })
    if (!res.ok) return null
    return (await res.json()) as CreatorRenderJob
  } catch {
    return null
  }
}
