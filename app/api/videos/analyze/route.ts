import { NextResponse } from 'next/server'
import { analyzeOneSource } from '@/lib/pipeline/analyze-source'
import { runWithAIContext } from '@/lib/ai/usage/context'
import { summarizeRecentAIUsage, getRecentAIUsage } from '@/lib/ai/usage/memory-store'
import { recordElcantoSignalsForSession } from '@/lib/personal/record-activity'
import { createSourceId } from '@/lib/types/source'
import {
  isValidYouTubeVideoId,
  normalizeChannelName,
  normalizeVideoTitle,
  normalizeYouTubeVideoId,
} from '@/lib/voice/normalize-voice'

export const maxDuration = 300

function includeCostDebug(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.AI_COST_DEBUG === '1'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceId?: string
      youtubeId?: string
      title?: string
      channel?: string
      url?: string
      voiceIndex?: number
    }

    const youtubeId = body.youtubeId ? normalizeYouTubeVideoId(body.youtubeId) : null
    if (!youtubeId || !isValidYouTubeVideoId(youtubeId)) {
      return NextResponse.json(
        { error: 'Invalid or missing YouTube video ID.' },
        { status: 400 },
      )
    }

    const title = normalizeVideoTitle(body.title)
    const channel = normalizeChannelName(body.channel)
    const voiceIndex = Number(body.voiceIndex)

    if (!Number.isFinite(voiceIndex) || voiceIndex < 1) {
      return NextResponse.json(
        { error: 'Invalid voice index. Re-add videos from the home page.' },
        { status: 400 },
      )
    }

    const sourceId = body.sourceId ?? createSourceId(voiceIndex)
    const requestId = crypto.randomUUID()
    const beforeCount = getRecentAIUsage().length

    const outcome = await runWithAIContext(
      { requestId, youtubeVideoId: youtubeId },
      () =>
        analyzeOneSource({
          sourceId,
          videoId: youtubeId,
          voiceIndex,
          title,
          channel,
          url: body.url?.trim() || `https://www.youtube.com/watch?v=${youtubeId}`,
        }),
    )

    if (!outcome.ok) {
      console.log(
        '[ANALYZE_DEBUG]',
        JSON.stringify({
          videoId: youtubeId,
          title,
          metadataSuccess: true,
          transcriptSuccess: false,
          transcriptLength: outcome.transcriptChars,
          transcriptLanguage: null,
          transcriptSource: 'none',
          isAnalyzable: false,
          failureReason: outcome.failure.message,
          stage: 'api_response_failure',
          failureCode: outcome.failure.code,
        }),
      )
      return NextResponse.json(
        { failure: outcome.failure, code: outcome.failure.code },
        { status: outcome.failure.code === 'unavailable' || outcome.failure.code === 'disabled' ? 422 : 502 },
      )
    }

    await recordElcantoSignalsForSession([
      {
        source: 'elcanto_added',
        youtubeId,
        title,
        channel,
      },
    ])

    const newRecords = getRecentAIUsage().slice(beforeCount)
    const callSummary = summarizeRecentAIUsage(newRecords)

    const timing = outcome.timing
      ? {
          ...outcome.timing,
          inputTokens: callSummary.totalInputTokens || outcome.timing.inputTokens,
          outputTokens: callSummary.totalOutputTokens || outcome.timing.outputTokens,
          model: callSummary.byOperation
            ? Object.keys(callSummary.byOperation)[0] ?? outcome.timing.model
            : outcome.timing.model,
        }
      : undefined

    return NextResponse.json({
      analysis: outcome.analysis,
      transcriptChars: outcome.transcriptChars,
      cached: Boolean(outcome.fromCache),
      coverage: outcome.analysis.coverage,
      timing,
      qualityMetrics: {
        claimCount: outcome.analysis.claims?.length ?? 0,
        evidenceCount: outcome.analysis.evidence?.length ?? 0,
        sectionCount: outcome.analysis.coverage?.sectionCount ?? 0,
        deepSections: outcome.analysis.coverage?.deepAnalyzedSectionCount ?? 0,
        coverageRatio: outcome.analysis.coverage?.coverageRatio ?? null,
      },
      ...(includeCostDebug() ? { callSummary } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
