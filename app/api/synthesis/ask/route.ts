import { NextResponse } from 'next/server'
import { askAcrossVideos } from '@/lib/pipeline/ask-question'
import type { SynthesisResult, VideoAnalysis } from '@/lib/types/analysis'

export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      question?: string
      synthesis?: SynthesisResult
      analyses?: VideoAnalysis[]
      youtubeIds?: string[]
    }

    if (!body.question || !body.synthesis || !body.analyses || !body.youtubeIds) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const answer = await askAcrossVideos({
      question: body.question,
      synthesis: body.synthesis,
      analyses: body.analyses,
      youtubeIds: body.youtubeIds,
    })

    return NextResponse.json({ answer })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not answer question.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
