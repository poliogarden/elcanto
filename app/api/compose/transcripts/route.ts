import { NextResponse } from 'next/server'
import { buildComposeSourceContexts } from '@/lib/compose/build-compose-input'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { document?: SynthesisDocument }

    if (!body.document?.voices?.length) {
      return NextResponse.json({ error: 'Synthesis document required.' }, { status: 400 })
    }

    const sources = await buildComposeSourceContexts(body.document)

    const transcripts = Object.fromEntries(
      sources.map((s) => [
        s.sourceId,
        {
          sourceId: s.sourceId,
          voiceIndex: s.voiceIndex,
          youtubeId: s.youtubeId,
          title: s.title,
          segments: s.segments,
        },
      ]),
    )

    return NextResponse.json({ transcripts })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load transcripts.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
