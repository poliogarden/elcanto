import { synthesizeCollectionWithCost } from '@/lib/pipeline/synthesize-collection'
import { parseSynthesisMode } from '@/lib/types/synthesis-mode'
import { runWithAIContext } from '@/lib/ai/usage/context'
import { recordElcantoSignalsForSession } from '@/lib/personal/record-activity'
import { getSynthesisUsedSourceIds } from '@/lib/types/analysis'
import { formatSseEvent } from '@/lib/synthesis/progress-events'
import type { SourceAnalysis, SourceFailure } from '@/lib/types/source'

export const maxDuration = 180

function includePerfDebug(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.AI_COST_DEBUG === '1'
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    question?: string
    sources?: SourceAnalysis[]
    failedSources?: SourceFailure[]
    synthesisId?: string
    mode?: string
    outputLanguage?: 'ko' | 'en'
  }

  if (!body.sources || body.sources.length < 1) {
    return new Response(JSON.stringify({ error: 'At least one analyzed source is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const requestId = crypto.randomUUID()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Parameters<typeof formatSseEvent>[0]) => {
        controller.enqueue(encoder.encode(formatSseEvent(event)))
      }

      try {
        const { result, costSummary, perfSummary } = await runWithAIContext(
          { requestId, synthesisId: body.synthesisId },
          () =>
            synthesizeCollectionWithCost({
              question: body.question,
              sources: body.sources!,
              failedSources: body.failedSources,
              requestId,
              synthesisId: body.synthesisId,
              mode: parseSynthesisMode(body.mode),
              outputLanguage: body.outputLanguage,
              deferKnowledgeExtension: true,
              onProgress: send,
            }),
        )

        await recordElcantoSignalsForSession(
          body.sources!.map((s) => ({
            source: 'elcanto_synthesis' as const,
            youtubeId: s.videoId,
            title: s.title,
            channel: '',
          })),
        )

        const qualityMetrics = {
          avgCoverageRatio:
            body.sources!.reduce((n, s) => n + (s.coverage?.coverageRatio ?? 0), 0) /
            body.sources!.length,
          totalClaims: body.sources!.reduce((n, s) => n + (s.claims?.length ?? 0), 0),
          relationshipCount: result.relationships.length,
          fourthIdeaSourceCount: result.fourthIdea?.sourceIds.length ?? 0,
          fourthIdeaMultiSource: (result.fourthIdea?.sourceIds.length ?? 0) >= 2,
        }

        send({
          type: 'complete',
          result,
          perfSummary,
          ...(includePerfDebug() && costSummary ? { costSummary } : {}),
          qualityMetrics,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Synthesis failed.'
        send({ type: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
