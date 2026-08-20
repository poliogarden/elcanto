import { NextResponse } from 'next/server'
import { ingestWorkerRenderOutput } from '@/lib/compose/ingest-render-output'
import { loadRenderJob, updateRenderJob } from '@/lib/compose/render-job-repository'
import { getRenderWorkerSecret, getRenderWorkerUrl } from '@/lib/compose/render-worker-url'
import type { RenderJob } from '@/lib/types/composition'

export async function POST(request: Request) {
  const secret = process.env.WORKER_SECRET
  if (!secret || request.headers.get('x-worker-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as {
      jobId?: string
      status?: RenderJob['status']
      progress?: number
      progressLabel?: string
      message?: string
      error?: string
      outputUrl?: string
    }

    if (!body.jobId || !body.status) {
      return NextResponse.json({ error: 'jobId and status required.' }, { status: 400 })
    }

    let outputUrl = body.outputUrl
    if (body.status === 'complete' && outputUrl) {
      const job = await loadRenderJob(body.jobId)
      const workerUrl = getRenderWorkerUrl()
      const workerSecret = getRenderWorkerSecret()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      if (workerUrl && workerSecret && job?.compositionId) {
        outputUrl = await ingestWorkerRenderOutput({
          workerUrl,
          workerSecret: workerSecret,
          jobId: body.jobId,
          compositionId: job.compositionId,
          outputUrl,
          appUrl,
        })
      }
    }

    await updateRenderJob(body.jobId, {
      status: body.status,
      progress: body.progress,
      progressLabel: body.progressLabel,
      message: body.message,
      error: body.error,
      outputUrl,
      completedAt:
        body.status === 'complete' || body.status === 'failed'
          ? new Date().toISOString()
          : undefined,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
