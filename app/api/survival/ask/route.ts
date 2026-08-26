import { NextResponse } from 'next/server'
import { getBoardSurvival } from '@/lib/reasoning/adapter-survival'
import { askSurvivalQuestion } from '@/lib/survival/ask'
import { findLatestSynthesisJobBySynthesisId } from '@/lib/synthesis/synthesis-job-repository'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

export async function POST(request: Request) {
  const body = (await request.json()) as {
    synthesisId?: string
    question?: string
    document?: SynthesisDocument
  }
  if (!body.question?.trim()) {
    return NextResponse.json({ error: 'question required' }, { status: 400 })
  }

  let doc = body.document

  if (!doc?.reasoning && body.synthesisId) {
    const job = await findLatestSynthesisJobBySynthesisId(body.synthesisId)
    doc = job?.document
  }

  const survival = doc ? getBoardSurvival(doc) : null
  if (!survival) {
    return NextResponse.json({ error: 'Survival analysis not found' }, { status: 404 })
  }

  const sources = (doc?.voices ?? [])
    .map((v) => v.analysis)
    .filter((a): a is NonNullable<typeof a> => Boolean(a))

  const answer = await askSurvivalQuestion({
    question: body.question.trim(),
    survival,
    sources,
  })

  return NextResponse.json(answer)
}
