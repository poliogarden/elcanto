import { NextResponse } from 'next/server'
import { synthesizeCollection } from '@/lib/pipeline/synthesize-collection'
import type { VideoAnalysis } from '@/lib/types/analysis'

export const maxDuration = 180

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      topic?: string
      analyses?: Array<{ voiceIndex: number; youtubeId: string; analysis: VideoAnalysis }>
    }

    if (!body.analyses || body.analyses.length < 1) {
      return NextResponse.json(
        { error: 'At least one analyzed video is required.' },
        { status: 400 },
      )
    }

    const result = await synthesizeCollection({
      topic: body.topic,
      analyses: body.analyses,
    })

    return NextResponse.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Synthesis failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
