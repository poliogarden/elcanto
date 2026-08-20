import { NextResponse } from 'next/server'
import { synthesizeCollectionWithCost } from '@/lib/pipeline/synthesize-collection'
import { parseSynthesisMode } from '@/lib/types/synthesis-mode'
import { runWithAIContext } from '@/lib/ai/usage/context'
import { recordElcantoSignalsForSession } from '@/lib/personal/record-activity'
import { buildCoverage } from '@/lib/types/source'
import { logCoverage } from '@/lib/synthesis/logger'
import { getSynthesisUsedSourceIds } from '@/lib/types/analysis'
import type { SourceAnalysis, SourceFailure } from '@/lib/types/source'

export const maxDuration = 180

function includePerfDebug(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.AI_COST_DEBUG === '1'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      question?: string
      sources?: SourceAnalysis[]
      failedSources?: SourceFailure[]
      synthesisId?: string
      mode?: string
    }

    if (!body.sources || body.sources.length < 1) {
      return NextResponse.json(
        { error: 'At least one analyzed source is required.' },
        { status: 400 },
      )
    }

    const requestedCount = body.sources.length + (body.failedSources?.length ?? 0)
    const coverage = buildCoverage(
      body.sources.map((s) => ({
        sourceId: s.sourceId,
        videoId: s.videoId,
        voiceIndex: s.voiceIndex,
        title: s.title,
        channel: '',
        url: '',
      })),
      body.sources,
      body.failedSources ?? [],
    )

    logCoverage(coverage)

    const requestId = crypto.randomUUID()
    const { result, costSummary, perfSummary } = await runWithAIContext(
      {
        requestId,
        synthesisId: body.synthesisId,
      },
      () =>
        synthesizeCollectionWithCost({
          question: body.question,
          sources: body.sources!,
          failedSources: body.failedSources,
          requestId,
          synthesisId: body.synthesisId,
          mode: parseSynthesisMode(body.mode),
          deferKnowledgeExtension: true,
        }),
    )

    await recordElcantoSignalsForSession(
      body.sources.map((s) => ({
        source: 'elcanto_synthesis' as const,
        youtubeId: s.videoId,
        title: s.title,
        channel: '',
      })),
    )

    const finalCoverage = buildCoverage(
      body.sources.map((s) => ({
        sourceId: s.sourceId,
        videoId: s.videoId,
        voiceIndex: s.voiceIndex,
        title: s.title,
        channel: '',
        url: '',
      })),
      body.sources,
      body.failedSources ?? [],
      getSynthesisUsedSourceIds(result).length,
    )

    const qualityMetrics = {
      avgCoverageRatio:
        body.sources.reduce((n, s) => n + (s.coverage?.coverageRatio ?? 0), 0) /
        body.sources.length,
      totalClaims: body.sources.reduce((n, s) => n + (s.claims?.length ?? 0), 0),
      relationshipCount: result.relationships.length,
      fourthIdeaSourceCount: result.fourthIdea?.sourceIds.length ?? 0,
      fourthIdeaMultiSource: (result.fourthIdea?.sourceIds.length ?? 0) >= 2,
    }

    return NextResponse.json({
      result,
      coverage: finalCoverage,
      partial: requestedCount > body.sources.length,
      ...(includePerfDebug() && costSummary ? { costSummary, qualityMetrics } : { qualityMetrics }),
      ...(includePerfDebug() && perfSummary ? { perfSummary } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Synthesis failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
