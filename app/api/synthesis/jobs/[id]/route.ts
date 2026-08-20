import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { loadSynthesisJob } from '@/lib/synthesis/synthesis-job-repository'
import { runSynthesisJob } from '@/lib/synthesis/synthesis-job-runner'
import { toPublicSynthesisJob } from '@/lib/synthesis/synthesis-job-types'

export const maxDuration = 300

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const job = await loadSynthesisJob(id)

  if (!job) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  }

  if (job.status === 'queued') {
    after(async () => {
      await runSynthesisJob(job.id)
    })
  }

  return NextResponse.json({ job: toPublicSynthesisJob(job) })
}
