import { NextResponse } from 'next/server'
import { askAcrossSources } from '@/lib/pipeline/ask-question'
import { runWithAIContext } from '@/lib/ai/usage/context'
import { summarizeRecentAIUsage, getRecentAIUsage } from '@/lib/ai/usage/memory-store'
import type { SynthesisResult } from '@/lib/types/analysis'
import type { SourceAnalysis } from '@/lib/types/source'

export const maxDuration = 120

function includeCostDebug(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.AI_COST_DEBUG === '1'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      question?: string
      synthesis?: SynthesisResult
      sources?: SourceAnalysis[]
      scope?: { type: string; label: string; context: string }
      outputLanguage?: 'ko' | 'en'
    }

    if (!body.question || !body.synthesis || !body.sources || body.sources.length < 1) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const requestId = crypto.randomUUID()
    const beforeCount = getRecentAIUsage().length

    const answer = await runWithAIContext({ requestId }, () =>
      askAcrossSources({
        question: body.question!,
        synthesis: body.synthesis!,
        sources: body.sources!,
        scope: body.scope,
        outputLanguage: body.outputLanguage,
      }),
    )

    const newRecords = getRecentAIUsage().slice(beforeCount)
    const callSummary = summarizeRecentAIUsage(newRecords)

    return NextResponse.json({
      answer,
      ...(includeCostDebug() ? { callSummary } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not answer question.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
