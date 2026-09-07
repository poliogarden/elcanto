import { NextResponse } from 'next/server'
import { pollCreatorRenderStatus } from '@/lib/creator/render/start-render'
import {
  applyRenderCompletionToProject,
  persistRenderJobUpdate,
} from '@/lib/creator/render/complete-render'
import { resolveCreatorOutputUrl } from '@/lib/creator/render/resolve-output-url'
import { loadRenderJob } from '@/lib/creator/storage/local-store'

type Params = { params: Promise<{ jobId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { jobId } = await params
  const stored = await loadRenderJob(jobId)
  const workerStatus = await pollCreatorRenderStatus(jobId)

  const status = workerStatus ?? stored
  if (!status) {
    return NextResponse.json({ status: 'QUEUED', progress: 0, id: jobId })
  }

  if (workerStatus) {
    await persistRenderJobUpdate(jobId, {
      projectId: stored?.projectId ?? workerStatus.projectId,
      status: workerStatus.status,
      outputUrl: workerStatus.outputUrl,
      error: workerStatus.error,
      progress: workerStatus.progress,
      progressLabel: workerStatus.progressLabel,
      completedAt:
        workerStatus.status === 'READY' || workerStatus.status === 'FAILED'
          ? new Date().toISOString()
          : undefined,
    })

    const projectId = stored?.projectId ?? workerStatus.projectId
    if (
      projectId &&
      (workerStatus.status === 'READY' || workerStatus.status === 'FAILED')
    ) {
      await applyRenderCompletionToProject(
        projectId,
        jobId,
        workerStatus.outputUrl ?? null,
        workerStatus.status === 'READY' ? 'READY' : 'FAILED',
        workerStatus.error,
      )
    }
  }

  const outputUrl = resolveCreatorOutputUrl(status.outputUrl)
  return NextResponse.json({ ...status, outputUrl })
}
