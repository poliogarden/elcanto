import { ingestSourceUnderstanding } from '@/lib/reasoning/source-ingest'
import type { SingleSourceReasoning } from '@/lib/reasoning/types'
import type { SourceAnalysis } from '@/lib/types/source'

const ENGINE_VERSION = 'reasoning-v1'

export function runSingleSourceReasoning(input: {
  source: SourceAnalysis
}): SingleSourceReasoning {
  const ingested = ingestSourceUnderstanding([input.source])
  const claims = ingested.claims.slice(0, 12)

  const weakPoints = [
    ...(input.source.limitations ?? []),
    ...(input.source.counterArguments ?? []).slice(0, 3),
  ].filter(Boolean)

  const keyInsight =
    input.source.deepInsights?.[0]?.insight ??
    input.source.uniquePerspective ??
    input.source.thesis ??
    null

  const questions = input.source.centralQuestion
    ? [input.source.centralQuestion]
    : input.source.topics.slice(0, 3).map((t) => `How does this video frame ${t}?`)

  return {
    mode: 'single',
    version: ENGINE_VERSION,
    summary: input.source.summary || input.source.thesis,
    claims,
    evidence: ingested.evidence,
    concepts: ingested.concepts,
    assumptions: ingested.assumptions,
    coreArgument: input.source.thesis || input.source.summary,
    stanceSummary: input.source.stance,
    weakPoints,
    keyInsight,
    questions,
    createdAt: new Date().toISOString(),
  }
}
