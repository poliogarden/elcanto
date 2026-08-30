import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { countFailedVoices, countReadyVoices } from '@/lib/types/synthesis-document'
import type { DirectSynthesisPersisted } from '@/lib/direct-synthesis/persisted'
import type { ProductionPipelineDiagnostics } from '@/lib/production/types'

export function buildDirectProductionDiagnostics(input: {
  document: SynthesisDocument
  direct: DirectSynthesisPersisted
}): ProductionPipelineDiagnostics {
  const ready = countReadyVoices(input.document)
  const failed = countFailedVoices(input.document)
  const requested = input.document.voices.length

  const perSource = input.document.voices.map((entry) => {
    const sourceId = entry.analysis?.sourceId ?? entry.source?.sourceId ?? entry.voice.id
    if (entry.error || entry.failure) {
      return {
        sourceId,
        videoId: entry.voice.youtubeId,
        title: entry.voice.title,
        status: 'failed' as const,
        failureCode: entry.failure?.code,
        failureMessage: entry.error ?? entry.failure?.message,
        transcriptOk: entry.failure?.code !== 'no_transcript',
      }
    }
    const sa = input.direct.sourceAnswers.find((a) => a.sourceId === sourceId)
    const notComparable = input.direct.nonComparableSources.some((n) => n.sourceId === sourceId)
    return {
      sourceId,
      videoId: entry.voice.youtubeId,
      title: entry.voice.title,
      status: notComparable ? ('excluded' as const) : ('analyzed' as const),
      transcriptOk: true,
      claimsExtracted: entry.analysis?.claims?.length ?? 0,
      evidenceSupported: sa?.keyEvidence?.length ?? 0,
    }
  })

  return {
    requestedSources: requested,
    analyzedSources: ready,
    failedSources: failed,
    excludedSources: input.direct.nonComparableSources.length,
    funnel: {
      claimsExtracted: 0,
      relevanceUsable: input.direct.sourceAnswers.length,
      generationEligible: input.direct.sourceAnswers.length,
      candidatePairs: 0,
      verifiedRelationships:
        input.direct.agreements.length +
        input.direct.disagreements.length +
        input.direct.complementaryViews.length +
        input.direct.uniqueViews.length +
        (input.direct.insights?.length ?? 0) +
        (input.direct.insight ? 1 : 0),
      agreement: input.direct.agreements.length,
      divide: input.direct.disagreements.length,
      complementary: input.direct.complementaryViews.length,
    },
    perSource,
    judgmentPresent: Boolean(input.direct.directAnswer),
    evidenceIntegrityPass: true,
    deepSynthesis: input.direct.deepSynthesisDiagnostics
      ? {
          synthesisModel: input.direct.deepSynthesisDiagnostics.synthesisModel,
          userQuestion: input.direct.deepSynthesisDiagnostics.userQuestion,
          sourceCount: input.direct.deepSynthesisDiagnostics.sourceCount,
          totalInputCharacters: input.direct.deepSynthesisDiagnostics.totalInputCharacters,
          contextExceeded: input.direct.deepSynthesisDiagnostics.contextExceeded,
          candidateInsightCount: input.direct.deepSynthesisDiagnostics.candidateInsightCount,
          validatedInsightCount: input.direct.deepSynthesisDiagnostics.validatedInsightCount,
          removedInsightCount: input.direct.deepSynthesisDiagnostics.removedInsightCount,
          partiallyGroundedCount: input.direct.deepSynthesisDiagnostics.partiallyGroundedCount,
          transcriptCharsPerSource:
            input.direct.deepSynthesisDiagnostics.transcriptCharsPerSource,
          evidenceCountPerInsight:
            input.direct.deepSynthesisDiagnostics.evidenceCountPerInsight,
        }
      : undefined,
  }
}
