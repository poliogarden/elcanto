import { NextResponse } from 'next/server'
import { loadRenderJob } from '@/lib/compose/render-job-repository'

type Params = { params: Promise<{ jobId: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { jobId } = await params
  const job = await loadRenderJob(jobId)

  if (!job) {
    return NextResponse.json({ error: 'Render job not found.' }, { status: 404 })
  }

  return NextResponse.json({
    job: {
      id: job.id,
      compositionId: job.compositionId,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error,
      outputUrl: job.outputUrl,
      progress: job.progress,
      progressLabel: job.progressLabel,
      message: job.message,
      manifestVersion: job.manifestVersion,
      hasFfmpegScript: job.hasFfmpegScript,
    },
    manifest: job.manifest,
    ffmpegScript: job.ffmpegScript,
  })
}
