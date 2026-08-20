import { NextResponse } from 'next/server'
import { runKnowledgeExtension } from '@/lib/synthesis/knowledge-extension-engine'
import { runWithAIContext } from '@/lib/ai/usage/context'
import type { SynthesisResult } from '@/lib/types/analysis'
import type { SetAnalysis } from '@/lib/types/knowledge'
import type { SourceAnalysis } from '@/lib/types/source'

export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sources?: SourceAnalysis[]
      setAnalysis?: SetAnalysis
      synthesis?: SynthesisResult
      synthesisId?: string
    }

    if (!body.sources?.length || !body.setAnalysis || !body.synthesis) {
      return NextResponse.json(
        { error: 'sources, setAnalysis, and synthesis are required.' },
        { status: 400 },
      )
    }

    const requestId = crypto.randomUUID()
    const extension = await runWithAIContext(
      { requestId, synthesisId: body.synthesisId },
      () =>
        runKnowledgeExtension(body.sources!, body.setAnalysis!, body.synthesis!),
    )

    return NextResponse.json({ knowledge: extension })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Knowledge extension failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
