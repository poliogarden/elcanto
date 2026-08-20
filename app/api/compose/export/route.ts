import { NextResponse } from 'next/server'
import { createRenderJob, getCompositionRenderer } from '@/lib/compose/renderer'
import { loadRenderJob } from '@/lib/compose/render-job-repository'
import type { Composition } from '@/lib/types/composition'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { composition?: Composition; compositionId?: string }

    if (!body.composition || !body.compositionId) {
      return NextResponse.json({ error: 'Composition required.' }, { status: 400 })
    }

    const job = createRenderJob(body.compositionId)
    const renderer = getCompositionRenderer()
    const result = await renderer.render(body.composition, body.compositionId, job.id)

    const stored = await loadRenderJob(job.id)

    return NextResponse.json({
      job: {
        ...job,
        status: stored?.status ?? result.status,
        progress: stored?.progress,
        progressLabel: stored?.progressLabel,
        message: stored?.message ?? result.message,
        completedAt: stored?.completedAt,
        outputUrl: stored?.outputUrl ?? result.outputUrl,
        manifestVersion: stored?.manifestVersion ?? result.manifest?.version,
        hasFfmpegScript: stored?.hasFfmpegScript ?? Boolean(result.ffmpegScript),
        error: result.status === 'failed' ? result.message : stored?.error,
      },
      message: result.message,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
