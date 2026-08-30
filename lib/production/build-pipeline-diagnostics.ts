import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { countFailedVoices, countReadyVoices } from '@/lib/types/synthesis-document'
import type { ProductionPipelineDiagnostics, PerSourcePipelineDiagnostic } from '@/lib/production/types'

export function buildProductionPipelineDiagnostics(input: {
  document: SynthesisDocument
  reasoning?: MultiSourceReasoning | null
}): ProductionPipelineDiagnostics {
  const { document, reasoning } = input
  const stats = reasoning?.pipelineStats
  const ready = countReadyVoices(document)
  const failed = countFailedVoices(document)
  const requested = document.voices.length

  const excludedIds = new Set(
    reasoning?.excludedSources?.map((e) => e.sourceId) ?? [],
  )

  const perSource: PerSourcePipelineDiagnostic[] = document.voices.map((entry) => {
    const sourceId = entry.analysis?.sourceId ?? entry.source?.sourceId ?? entry.voice.id
    if (entry.error || entry.failure) {
      return {
        sourceId,
        videoId: entry.voice.youtubeId,
        title: entry.voice.title,
        status: 'failed',
        failureCode: entry.failure?.code,
        failureMessage: entry.error ?? entry.failure?.message,
        transcriptOk: entry.failure?.code !== 'no_transcript',
      }
    }
    const excluded = excludedIds.has(sourceId)
    const claimCount = entry.analysis?.claims?.length ?? 0
    const evidenceCount =
      entry.analysis?.claims?.filter((c) => c.evidenceIds?.length > 0).length ?? 0
    return {
      sourceId,
      videoId: entry.voice.youtubeId,
      title: entry.voice.title,
      status: excluded ? 'excluded' : 'analyzed',
      transcriptOk: true,
      claimsExtracted: claimCount,
      evidenceSupported: evidenceCount,
    }
  })

  const relationships = reasoning?.relationships ?? []
  const agreement = relationships.filter(
    (r) => r.verificationStatus === 'SUPPORTED' && r.type === 'AGREEMENT',
  ).length
  const divide = relationships.filter(
    (r) =>
      r.verificationStatus === 'SUPPORTED' &&
      (r.type === 'CONTRADICTION' || r.type === 'TENSION' || r.type === 'TRADE_OFF'),
  ).length
  const complementary = relationships.filter(
    (r) => r.verificationStatus === 'SUPPORTED' && r.type === 'COMPLEMENTARY',
  ).length

  return {
    requestedSources: requested,
    analyzedSources: ready,
    failedSources: failed,
    excludedSources: reasoning?.excludedSources?.length ?? 0,
    funnel: {
      claimsExtracted: stats?.claimsExtracted ?? 0,
      relevanceUsable: stats?.funnelFinalUsable ?? stats?.relevantClaims ?? 0,
      generationEligible: stats?.generationEligible ?? 0,
      candidatePairs: stats?.candidatePairs ?? 0,
      verifiedRelationships: stats?.verifiedRelationships ?? relationships.length,
      agreement,
      divide,
      complementary,
    },
    perSource,
    judgmentPresent: Boolean(reasoning?.judgment?.statement),
    evidenceIntegrityPass: reasoning?.evidenceIntegrity?.pass,
  }
}
