import { NextResponse } from 'next/server'
import { analyzeVideoPipeline } from '@/lib/pipeline/analyze-video'

export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      youtubeId?: string
      title?: string
      channel?: string
      voiceIndex?: number
    }

    if (!body.youtubeId || !body.title || !body.channel) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const outcome = await analyzeVideoPipeline({
      youtubeId: body.youtubeId,
      title: body.title,
      channel: body.channel,
      voiceIndex: body.voiceIndex ?? 1,
    })

    if (!outcome.ok) {
      return NextResponse.json(
        { error: outcome.message, code: outcome.code },
        { status: outcome.code === 'unavailable' || outcome.code === 'disabled' ? 422 : 502 },
      )
    }

    return NextResponse.json({ analysis: outcome.analysis })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
