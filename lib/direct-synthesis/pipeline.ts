import { buildSynthesisCostSummary, runWithAIContext } from '@/lib/ai/usage/context'
import type { AIUsageRecord } from '@/lib/ai/usage/types'
import { getModelForRole } from '@/lib/ai/config'
import { buildTranscriptCatalog } from '@/lib/direct-synthesis/build-transcript-catalog'
import { buildProfileSourceAnswers } from '@/lib/direct-synthesis/build-profile-source-answers'
import {
  collectReferencedEvidenceRefs,
  buildPersistedEvidence,
} from '@/lib/direct-synthesis/build-persisted-evidence'
import { groundCandidateInsights } from '@/lib/direct-synthesis/ground-candidate-insights'
import { synthesizeDeepCrossSource } from '@/lib/direct-synthesis/synthesize-deep'
import type {
  DirectPipelineRun,
  DirectSynthesisResult,
  DeepSynthesisDiagnostics,
} from '@/lib/direct-synthesis/types'
import { validateAndFilterSynthesis } from '@/lib/direct-synthesis/validate-evidence'
import { detectQuestionMode } from '@/lib/direct-synthesis/question-mode'
import { buildFinalDirectAnswer } from '@/lib/direct-synthesis/finalize-validated-answer'
import type { SourceAnalysis } from '@/lib/types/source'

export async function runDirectSynthesisPipeline(input: {
  centralQuestion: string
  sources: SourceAnalysis[]
  outputLanguage?: 'ko' | 'en'
  costAccumulator?: AIUsageRecord[]
}): Promise<DirectPipelineRun> {
  const started = Date.now()
  const costAccumulator = input.costAccumulator ?? []

  return runWithAIContext({ costAccumulator }, async () => {
    const questionMode = detectQuestionMode(input.centralQuestion)

    const evidenceStarted = Date.now()
    const transcriptCatalog = await buildTranscriptCatalog(input.sources)
    const evidenceRetrievalMs = Date.now() - evidenceStarted

    const perSourceStarted = Date.now()
    const sourceAnswers = buildProfileSourceAnswers({
      sources: input.sources,
      centralQuestion: input.centralQuestion,
      questionMode,
    })
    const perSourceAnswerMs = Date.now() - perSourceStarted

    const crossStarted = Date.now()
    let deepSynthesisDiagnostics: DeepSynthesisDiagnostics | undefined
    let candidateInsightCount = 0
    let validatedInsightCount = 0
    let removedInsightCount = 0
    let partiallyGroundedCount = 0
    let groundedInsights: DirectSynthesisResult['insights'] = []
    let agreements: DirectSynthesisResult['agreements'] = []
    let disagreements: DirectSynthesisResult['disagreements'] = []
    let complementaryViews: DirectSynthesisResult['complementaryViews'] = []
    let uniqueViews: DirectSynthesisResult['uniqueViews'] = []
    let nonComparableSources: DirectSynthesisResult['nonComparableSources'] = []
    let uncertainty: string[] = []
    let directAnswerFromDeep = ''
    let removedUnsupportedCompare = {
      agreements: 0,
      disagreements: 0,
      complementaryViews: 0,
      uniqueViews: 0,
      insights: 0,
      insight: 0,
    }

    let validationMs = 0

    let groundedResult: Awaited<ReturnType<typeof groundCandidateInsights>> | undefined

    if (transcriptCatalog.contextExceeded) {
      uncertainty = [
        `Full transcript context (${transcriptCatalog.totalCharacters} chars) exceeds limit (${transcriptCatalog.contextLimitChars} chars). Reduce sources or shorten videos.`,
      ]
      directAnswerFromDeep =
        input.outputLanguage === 'ko'
          ? '전체 자막이 모델 입력 한도를 초과하여 교차 통찰 합성을 실행하지 못했습니다.'
          : 'Cross-source synthesis was not run because full transcripts exceed the input limit.'
    } else {
      const deep = await synthesizeDeepCrossSource({
        centralQuestion: input.centralQuestion,
        questionMode,
        formattedTranscripts: transcriptCatalog.formattedTranscripts,
        outputLanguage: input.outputLanguage,
      })

      candidateInsightCount = deep.candidateInsights.length
      directAnswerFromDeep = deep.directAnswer
      nonComparableSources = deep.nonComparableSources
      uncertainty = deep.uncertainty

      const validationStarted = Date.now()
      groundedResult = groundCandidateInsights({
        candidates: deep.candidateInsights,
        evidenceCatalog: transcriptCatalog.snippets,
        sourceAnswers,
      })
      groundedInsights = groundedResult.insights
      validatedInsightCount = groundedResult.insights.length
      removedInsightCount = groundedResult.removed
      partiallyGroundedCount = groundedResult.partiallyGroundedCount

      const compareFiltered = validateAndFilterSynthesis({
        synthesis: {
          directAnswer: deep.directAnswer,
          sourceContributions: [],
          agreements: deep.agreements,
          disagreements: deep.disagreements,
          complementaryViews: deep.complementaryViews,
          uniqueViews: deep.uniqueViews,
          insights: [],
          insight: null,
          nonComparableSources: deep.nonComparableSources,
          uncertainty: deep.uncertainty,
        },
        sourceAnswers,
        evidenceCatalog: transcriptCatalog.snippets,
      })

      agreements = compareFiltered.agreements
      disagreements = compareFiltered.disagreements
      complementaryViews = compareFiltered.complementaryViews
      uniqueViews = compareFiltered.uniqueViews
      removedUnsupportedCompare = {
        ...compareFiltered.removedUnsupported,
        insights: removedInsightCount,
      }

      validationMs = Date.now() - validationStarted
    }

    const crossSourceMs = Date.now() - crossStarted

    const finalizeStarted = Date.now()
    const directAnswer = buildFinalDirectAnswer({
      centralQuestion: input.centralQuestion,
      sourceAnswers,
      agreements,
      disagreements,
      complementaryViews,
      uniqueViews,
      insights: groundedInsights,
      insight: null,
      nonComparableSources,
      uncertainty,
    })
    const finalizeMs = Date.now() - finalizeStarted

    const referencedRefs = collectReferencedEvidenceRefs({
      insights: groundedInsights,
      agreements,
      disagreements,
      complementaryViews,
      uniqueViews,
    })
    const evidence = buildPersistedEvidence(transcriptCatalog.snippets, referencedRefs)

    deepSynthesisDiagnostics = {
      synthesisModel: getModelForRole('synthesis'),
      userQuestion: input.centralQuestion,
      sourceCount: input.sources.length,
      transcriptCharsPerSource: transcriptCatalog.perSource.map((p) => ({
        sourceId: p.sourceId,
        characterCount: p.characterCount,
        segmentCount: p.segmentCount,
        transcriptSource: p.transcriptSource,
      })),
      totalInputCharacters: transcriptCatalog.totalCharacters,
      contextExceeded: transcriptCatalog.contextExceeded,
      candidateInsightCount,
      validatedInsightCount,
      removedInsightCount,
      partiallyGroundedCount,
      evidenceCountPerInsight: groundedInsights.map((i) => ({
        insightId: i.id,
        count: i.evidenceRefs.length,
      })),
      removedCandidates: groundedResult?.removedCandidates.map((r) => ({
        id: r.candidate.id,
        title: r.candidate.title,
        reason: r.reason,
      })),
    }

    const result: DirectSynthesisResult = {
      centralQuestion: input.centralQuestion,
      questionMode,
      directAnswer: directAnswer || directAnswerFromDeep,
      sourceAnswers,
      sourceContributions: sourceAnswers
        .filter((a) => a.answerability !== 'NOT_RELEVANT')
        .map((a) => ({
          sourceId: a.sourceId,
          contribution: a.answer ?? '',
          answerability: a.answerability,
          evidenceRefs: [],
        })),
      agreements,
      disagreements,
      complementaryViews,
      uniqueViews,
      insights: groundedInsights,
      insight: null,
      nonComparableSources,
      uncertainty,
      evidence,
      removedUnsupported: removedUnsupportedCompare,
    }

    const totalMs = Date.now() - started
    const costSummary = buildSynthesisCostSummary(costAccumulator, input.sources.length)

    return {
      version: 'direct-experiment-1.0',
      synthesisMode: 'deep-direct',
      result,
      timingMs: {
        evidenceRetrievalMs,
        perSourceAnswerMs,
        crossSourceMs,
        validationMs,
        finalizeMs,
        totalMs,
      },
      cost: {
        llmCalls: costAccumulator.length,
        inputTokens: costSummary.totalInputTokens,
        outputTokens: costSummary.totalOutputTokens,
        estimatedCostUsd: costSummary.totalEstimatedCostUsd,
      },
      deepSynthesisDiagnostics,
    }
  })
}
