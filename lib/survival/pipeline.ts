import type { SourceAnalysis } from '@/lib/types/source'
import {
  ensureMinimumIncluded,
  partitionSourcesByCoherence,
} from '@/lib/survival/coherence'
import {
  buildSurvivalSynthesis,
  checkTopicCoherence,
  generateEmergentInsights,
  generateRelationshipCandidates,
  refineClaimsFromAnalyses,
  verifyRelationships,
} from '@/lib/survival/llm-steps'
import { filterSurvivalClaims } from '@/lib/survival/quality'
import type { ExcludedSource, SourcePosition, SurvivalAnalysis } from '@/lib/survival/types'

export type SurvivalProgressPhase =
  | 'coherence'
  | 'claims'
  | 'relationships'
  | 'verification'
  | 'synthesis'

export type SurvivalProgressEvent =
  | { type: 'phase'; phase: SurvivalProgressPhase; status: 'start' | 'complete' }
  | { type: 'log'; message: string }

function buildExcludedSourcePositions(
  excluded: ExcludedSource[],
  voices: Array<{ channel: string; thumbnail?: string }>,
  allSources: SourceAnalysis[],
): SourcePosition[] {
  return excluded.map((e) => {
    const voice = voices[allSources.findIndex((s) => s.sourceId === e.sourceId)]
    return {
      videoId: e.videoId,
      sourceId: e.sourceId,
      voiceIndex: e.voiceIndex,
      title: e.title,
      channel: voice?.channel ?? '',
      thumbnail: e.thumbnail ?? voice?.thumbnail,
      position: 'Excluded — off-topic',
      includedInSynthesis: false,
      relevance: 'off_topic' as const,
    }
  })
}

export async function runSurvivalPipeline(input: {
  sources: SourceAnalysis[]
  voices: Array<{ channel: string; thumbnail?: string }>
  onProgress?: (event: SurvivalProgressEvent) => void
}): Promise<SurvivalAnalysis> {
  const { sources, voices, onProgress } = input

  if (sources.length < 2) {
    throw new Error('Survival analysis requires at least 2 videos.')
  }
  if (sources.length > 6) {
    throw new Error('Survival analysis supports at most 6 videos.')
  }

  onProgress?.({ type: 'phase', phase: 'coherence', status: 'start' })
  const topicCoherence = await checkTopicCoherence(sources)
  onProgress?.({ type: 'phase', phase: 'coherence', status: 'complete' })

  let { included, excluded, assessmentBySource } = partitionSourcesByCoherence(
    sources,
    topicCoherence,
    voices,
  )

  const ensured = ensureMinimumIncluded(
    sources,
    included,
    excluded,
    assessmentBySource,
    voices,
  )
  included = ensured.included
  excluded = ensured.excluded

  if (included.length < 2) {
    throw new Error(
      'Need at least 2 on-topic videos. Remove off-topic selections and try again.',
    )
  }

  onProgress?.({
    type: 'log',
    message: `${included.length} analyzed, ${excluded.length} excluded (off-topic)`,
  })

  onProgress?.({ type: 'phase', phase: 'claims', status: 'start' })
  const rawClaims = await refineClaimsFromAnalyses(included)
  const claims = filterSurvivalClaims(rawClaims)
  if (claims.length < 2) {
    throw new Error('Not enough high-quality claims for cross-video synthesis.')
  }
  onProgress?.({ type: 'phase', phase: 'claims', status: 'complete' })
  onProgress?.({
    type: 'log',
    message: `Refined ${claims.length} claims (from ${rawClaims.length})`,
  })

  onProgress?.({ type: 'phase', phase: 'relationships', status: 'start' })
  const candidates = await generateRelationshipCandidates(claims)
  onProgress?.({ type: 'phase', phase: 'relationships', status: 'complete' })
  onProgress?.({ type: 'log', message: `Generated ${candidates.length} relationship candidates` })

  onProgress?.({ type: 'phase', phase: 'verification', status: 'start' })
  const { verified, rejected } = await verifyRelationships(claims, candidates)
  onProgress?.({ type: 'phase', phase: 'verification', status: 'complete' })
  onProgress?.({
    type: 'log',
    message: `Verified ${verified.length}, rejected ${rejected.length}`,
  })

  onProgress?.({ type: 'phase', phase: 'synthesis', status: 'start' })
  let synthesisPart = await buildSurvivalSynthesis({
    sources: included,
    claims,
    verifiedRelationships: verified,
    topicCoherence,
    excludedSources: excluded,
  })

  if (synthesisPart.emergentInsights.length === 0 && verified.length >= 2) {
    const emergent = await generateEmergentInsights({
      claims,
      verifiedRelationships: verified,
      topicCoherence,
    })
    if (emergent.length > 0) {
      synthesisPart = {
        ...synthesisPart,
        emergentInsights: emergent,
        emergentInsightMissing: false,
      }
    }
  }

  onProgress?.({ type: 'phase', phase: 'synthesis', status: 'complete' })

  const voiceBySource = new Map(sources.map((s, i) => [s.sourceId, voices[i]]))

  const includedSources = synthesisPart.sources.map((s) => {
    const v = voiceBySource.get(s.sourceId)
    return { ...s, channel: v?.channel ?? '', thumbnail: v?.thumbnail }
  })

  const excludedPositions = buildExcludedSourcePositions(excluded, voices, sources)

  const allSourcesOrdered = sources.map((s) => {
    const includedPos = includedSources.find((p) => p.sourceId === s.sourceId)
    if (includedPos) return includedPos
    return excludedPositions.find((p) => p.sourceId === s.sourceId)!
  })

  return {
    version: 'survival-v3',
    topicCoherence,
    excludedSources: excluded,
    analyzedVideoCount: included.length,
    excludedVideoCount: excluded.length,
    claims,
    verifiedRelationships: verified,
    rejectedRelationships: rejected,
    ...synthesisPart,
    sources: allSourcesOrdered,
    createdAt: new Date().toISOString(),
  }
}
