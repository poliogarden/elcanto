import { NextResponse } from 'next/server'
import { after } from 'next/server'
import {
  createSynthesisJobRecord,
  findActiveSynthesisJobBySynthesisId,
  findLatestSynthesisJobBySynthesisId,
  saveSynthesisJob,
} from '@/lib/synthesis/synthesis-job-repository'
import { runSynthesisJob } from '@/lib/synthesis/synthesis-job-runner'
import { toPublicSynthesisJob } from '@/lib/synthesis/synthesis-job-types'
import { normalizeSynthesisDraft } from '@/lib/types/synthesis-draft'

export const maxDuration = 300

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const synthesisId = searchParams.get('synthesisId')?.trim()

  if (!synthesisId) {
    return NextResponse.json({ error: 'synthesisId query parameter required.' }, { status: 400 })
  }

  const active = await findActiveSynthesisJobBySynthesisId(synthesisId)
  const job = active ?? (await findLatestSynthesisJobBySynthesisId(synthesisId))

  if (!job) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  }

  return NextResponse.json({ job: toPublicSynthesisJob(job) })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      synthesisId?: string
      draft?: unknown
    }

    const synthesisId = body.synthesisId?.trim()
    if (!synthesisId) {
      return NextResponse.json({ error: 'synthesisId is required.' }, { status: 400 })
    }

    const draft = normalizeSynthesisDraft(body.draft)
    if (!draft || draft.voices.length < 2) {
      return NextResponse.json(
        { error: 'At least two voices are required in draft.' },
        { status: 400 },
      )
    }

    const existing = await findActiveSynthesisJobBySynthesisId(synthesisId)
    if (existing) {
      return NextResponse.json({
        job: toPublicSynthesisJob(existing),
        reused: true,
      })
    }

    const job = createSynthesisJobRecord({ synthesisId, draft })
    await saveSynthesisJob(job)

    after(async () => {
      await runSynthesisJob(job.id)
    })

    return NextResponse.json({
      job: toPublicSynthesisJob(job),
      reused: false,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create synthesis job.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
