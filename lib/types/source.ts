import type { Evidence } from '@/lib/types/analysis'
import type { StructuredClaim, Entity } from '@/lib/types/relationship'
import type { AnalysisCoverage, VideoKnowledgeMeta } from '@/lib/types/video-knowledge'

/** A YouTube voice in a synthesis session */
export type Source = {
  sourceId: string
  videoId: string
  voiceIndex: number
  title: string
  channel: string
  url: string
}

export type DeepInsight = {
  insight: string
  whyItMatters: string
  supportingReasoning: string
}

/** Per-source structured analysis — independent of other sources */
export type SourceAnalysis = {
  sourceId: string
  videoId: string
  voiceIndex: number
  title: string
  summary: string
  thesis: string
  /** Central question the video addresses */
  centralQuestion?: string
  topics: string[]
  claims: StructuredClaim[]
  entities: Entity[]
  conclusions: string[]
  implications: string[]
  evidence: Evidence[]
  stance: string | null
  assumptions?: string[]
  counterArguments?: string[]
  limitations?: string[]
  keyArguments?: string[]
  importantConcepts?: string[]
  uniquePerspective?: string
  deepInsights?: DeepInsight[]
  /** How much of the transcript was covered by hierarchical analysis */
  coverage?: AnalysisCoverage
  /** Section-level knowledge map (optional, stored in cache) */
  videoKnowledge?: VideoKnowledgeMeta
  /** @deprecated derived fields kept for cache migration */
  mainClaims?: string[]
  keyFacts?: string[]
  keyPeople?: string[]
  keyTopics?: string[]
  arguments?: string[]
}

export type SourceFailure = {
  sourceId: string
  videoId: string
  title: string
  code: string
  message: string
}

export type PipelineCoverage = {
  requestedSourceCount: number
  loadedSourceCount: number
  analyzedSourceCount: number
  synthesizedSourceCount: number
  failedSourceIds: string[]
  analyzedSourceIds: string[]
}

export function createSourceId(voiceIndex: number): string {
  return `source_${voiceIndex}`
}

export function sourceFromVoice(v: {
  id: string
  n: number
  youtubeId: string
  title: string
  channel: string
  url: string
}): Source {
  return {
    sourceId: createSourceId(v.n),
    videoId: v.youtubeId,
    voiceIndex: v.n,
    title: v.title,
    channel: v.channel,
    url: v.url,
  }
}

export function normalizeSourceAnalysis(raw: SourceAnalysis): SourceAnalysis {
  const claims =
    raw.claims?.length > 0
      ? raw.claims
      : (raw.mainClaims ?? []).map((statement, i) => ({
          id: `${raw.sourceId}_claim_${i + 1}`,
          sourceId: raw.sourceId,
          statement,
          topic: raw.keyTopics?.[0] ?? raw.topics?.[0] ?? 'general',
          confidence: 0.7,
        }))

  return {
    ...raw,
    topics: raw.topics?.length ? raw.topics : raw.keyTopics ?? [],
    claims,
    entities: raw.entities ?? [],
    conclusions: raw.conclusions?.length
      ? raw.conclusions
      : raw.thesis
        ? [raw.thesis]
        : [],
    implications: raw.implications ?? [],
  }
}

export function buildCoverage(
  requested: Source[],
  analyzed: SourceAnalysis[],
  failures: SourceFailure[],
  synthesizedCount = 0,
): PipelineCoverage {
  return {
    requestedSourceCount: requested.length,
    loadedSourceCount: analyzed.length + failures.length,
    analyzedSourceCount: analyzed.length,
    synthesizedSourceCount: synthesizedCount,
    failedSourceIds: failures.map((f) => f.sourceId),
    analyzedSourceIds: analyzed.map((a) => a.sourceId),
  }
}

export function validateAnalysisCoverage(
  requested: Source[],
  analyzed: SourceAnalysis[],
): { ok: true } | { ok: false; missingSourceIds: string[] } {
  const expected = new Set(requested.map((s) => s.sourceId))
  const got = new Set(analyzed.map((a) => a.sourceId))
  const missingSourceIds = [...expected].filter((id) => !got.has(id))
  if (missingSourceIds.length > 0) return { ok: false, missingSourceIds }
  return { ok: true }
}
