import type { Composition, RenderJob } from '@/lib/types/composition'
import {
  buildFfmpegConcatScript,
  type RenderManifest,
} from '@/lib/compose/render-manifest'
import { prepareRenderManifest } from '@/lib/compose/prepare-render-manifest'
import { saveRenderJob, updateRenderJob } from '@/lib/compose/render-job-repository'
import { ingestWorkerRenderOutput } from '@/lib/compose/ingest-render-output'
import {
  getRenderWorkerSecret,
  getRenderWorkerUrl,
  isRenderWorkerConfigured,
} from '@/lib/compose/render-worker-url'

export type RenderResult = {
  outputUrl?: string
  status: RenderJob['status']
  message: string
  manifest?: RenderManifest
  ffmpegScript?: string
}

export interface CompositionRenderer {
  render(
    composition: Composition,
    compositionId: string,
    jobId: string,
  ): Promise<RenderResult>
}

async function resolveOutputUrl(params: {
  workerUrl: string
  workerSecret: string
  jobId: string
  compositionId: string
  outputUrl?: string
  appUrl: string
}): Promise<string | undefined> {
  if (!params.outputUrl) return undefined
  return ingestWorkerRenderOutput(params)
}

async function pollWorkerStatus(
  workerUrl: string,
  secret: string,
  jobId: string,
  compositionId: string,
  appUrl: string,
  maxAttempts = 180,
): Promise<{
  status: RenderJob['status']
  message?: string
  outputUrl?: string
  error?: string
  progress?: number
  progressLabel?: string
}> {
  for (let i = 0; i < maxAttempts; i += 1) {
    const res = await fetch(`${workerUrl}/render-status/${jobId}`, {
      headers: { 'x-worker-secret': secret },
    })
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, 2000))
      continue
    }

    const data = (await res.json()) as {
      status?: RenderJob['status']
      message?: string
      outputUrl?: string
      error?: string
      progress?: number
      progressLabel?: string
    }

    if (data.status === 'complete' || data.status === 'failed') {
      const outputUrl =
        data.status === 'complete'
          ? await resolveOutputUrl({
              workerUrl,
              workerSecret: secret,
              jobId,
              compositionId,
              outputUrl: data.outputUrl,
              appUrl,
            })
          : undefined

      return {
        status: data.status,
        message: data.message,
        outputUrl,
        error: data.error,
        progress: data.progress,
        progressLabel: data.progressLabel,
      }
    }

    await updateRenderJob(jobId, {
      status: 'processing',
      progress: data.progress,
      progressLabel: data.progressLabel,
      message: data.message,
    })

    await new Promise((r) => setTimeout(r, 2000))
  }

  return { status: 'processing', message: 'Worker still encoding. Poll render job for updates.' }
}

/**
 * Default renderer: TTS interludes + manifest + FFmpeg plan.
 * MP4 encoding requires a render worker (local or Railway).
 */
export class ManifestCompositionRenderer implements CompositionRenderer {
  async render(
    composition: Composition,
    compositionId: string,
    jobId: string,
  ): Promise<RenderResult> {
    await saveRenderJob({
      id: jobId,
      compositionId,
      status: 'processing',
      createdAt: new Date().toISOString(),
      progress: 5,
      progressLabel: 'Synthesizing interlude speech',
    })

    const manifest = await prepareRenderManifest(compositionId, composition, jobId)
    const ffmpegScript = buildFfmpegConcatScript(manifest)

    await updateRenderJob(jobId, {
      manifest,
      ffmpegScript,
      manifestVersion: manifest.version,
      hasFfmpegScript: true,
      progress: 40,
      progressLabel: 'Building render plan',
    })

    await updateRenderJob(jobId, {
      status: 'complete',
      progress: 100,
      progressLabel: 'Manifest ready',
      completedAt: new Date().toISOString(),
      message: isRenderWorkerConfigured()
        ? 'Render worker is configured. Create a render job to encode MP4.'
        : 'Interlude TTS and render manifest are ready. Start the local render worker or set LOCAL_RENDER_WORKER_URL.',
    })

    return {
      status: 'complete',
      message: isRenderWorkerConfigured()
        ? 'Render manifest ready. Worker will encode MP4 on export.'
        : 'Render plan saved. Run `pnpm dev:render-worker` and set WORKER_SECRET for local MP4 export.',
      manifest,
      ffmpegScript,
    }
  }
}

/** Forwards to FFmpeg worker (local dev or Railway). */
export class RemoteCompositionRenderer implements CompositionRenderer {
  constructor(
    private workerUrl: string,
    private secret: string,
    private appUrl: string,
  ) {}

  async render(
    composition: Composition,
    compositionId: string,
    jobId: string,
  ): Promise<RenderResult> {
    await saveRenderJob({
      id: jobId,
      compositionId,
      status: 'processing',
      createdAt: new Date().toISOString(),
      progress: 5,
      progressLabel: 'Synthesizing interlude speech',
    })

    const manifest = await prepareRenderManifest(compositionId, composition, jobId)
    const ffmpegScript = buildFfmpegConcatScript(manifest)

    await updateRenderJob(jobId, {
      manifest,
      ffmpegScript,
      hasFfmpegScript: true,
      progress: 20,
      progressLabel: 'Sending to worker',
    })

    const webhookUrl = `${this.appUrl}/api/compose/render/webhook`

    const res = await fetch(`${this.workerUrl}/render-composition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': this.secret,
      },
      body: JSON.stringify({ jobId, manifest, ffmpegScript, webhookUrl }),
    })

    const data = (await res.json()) as {
      status?: RenderJob['status']
      message?: string
      outputUrl?: string
      error?: string
    }

    if (!res.ok) {
      await updateRenderJob(jobId, {
        status: 'failed',
        error: data.error ?? 'Worker render failed.',
        completedAt: new Date().toISOString(),
      })
      return {
        status: 'failed',
        message: data.error ?? 'Worker render failed.',
        manifest,
      }
    }

    const polled = await pollWorkerStatus(
      this.workerUrl,
      this.secret,
      jobId,
      compositionId,
      this.appUrl,
    )

    const outputUrl = polled.outputUrl

    await updateRenderJob(jobId, {
      status: polled.status ?? 'processing',
      message: polled.message,
      outputUrl,
      error: polled.error,
      progress: polled.status === 'complete' ? 100 : polled.progress ?? 60,
      progressLabel: polled.progressLabel ?? (polled.status === 'complete' ? 'Complete' : 'Encoding'),
      completedAt:
        polled.status === 'complete' || polled.status === 'failed'
          ? new Date().toISOString()
          : undefined,
    })

    return {
      status: polled.status ?? 'processing',
      message: polled.message ?? data.message ?? 'Worker accepted render job.',
      outputUrl,
      manifest,
    }
  }
}

export function createRenderJob(compositionId: string): RenderJob {
  return {
    id: crypto.randomUUID(),
    compositionId,
    status: 'queued',
    createdAt: new Date().toISOString(),
    progress: 0,
    progressLabel: 'Queued',
  }
}

export function getCompositionRenderer(): CompositionRenderer {
  const workerUrl = getRenderWorkerUrl()
  const secret = getRenderWorkerSecret()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  if (workerUrl && secret) {
    return new RemoteCompositionRenderer(workerUrl, secret, appUrl)
  }
  return new ManifestCompositionRenderer()
}

/** @deprecated use getCompositionRenderer */
export const defaultRenderer = {
  render: async (composition: Composition, jobId: string) => {
    const renderer = getCompositionRenderer()
    return renderer.render(composition, jobId, jobId)
  },
}
