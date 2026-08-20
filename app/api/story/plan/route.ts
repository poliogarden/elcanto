import { NextResponse } from 'next/server'
import { runStoryPlanner } from '@/lib/story/story-planner'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { StoryMode } from '@/lib/types/story-plan'

export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      document?: SynthesisDocument
      mode?: StoryMode
    }

    if (!body.document?.result) {
      return NextResponse.json({ error: 'Complete synthesis document required.' }, { status: 400 })
    }

    const mode = body.mode ?? 'insight'
    if (!['insight', 'debate', 'funny', 'story'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid story mode.' }, { status: 400 })
    }

    const plan = await runStoryPlanner(body.document, mode)

    return NextResponse.json({ plan })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Story planning failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
