import { NextResponse } from 'next/server'
import {
  applyRenderCompletionToProject,
  persistRenderJobUpdate,
} from '@/lib/creator/render/complete-render'
import { loadRenderJob } from '@/lib/creator/storage/local-store'

export async function POST(request: Request) {
  const body = (await request.json()) as {
    jobId: string
    status: string
    outputUrl?: string
    error?: string
    progress?: number
    progressLabel?: string
    projectId?: string
  }

  if (!body.jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  }

  const stored = await loadRenderJob(body.jobId)
  const projectId = body.projectId ?? stored?.projectId

  const job = await persistRenderJobUpdate(body.jobId, {
    projectId,
    status: body.status,
    outputUrl: body.outputUrl,
    error: body.error,
    progress: body.progress,
    progressLabel: body.progressLabel,
    completedAt:
      body.status === 'READY' || body.status === 'FAILED'
        ? new Date().toISOString()
        : undefined,
  })

  if (job?.projectId && (body.status === 'READY' || body.status === 'FAILED')) {
    await applyRenderCompletionToProject(
      job.projectId,
      body.jobId,
      body.outputUrl ?? null,
      body.status === 'READY' ? 'READY' : 'FAILED',
      body.error,
    )
  }

  return NextResponse.json({ ok: true })
}
