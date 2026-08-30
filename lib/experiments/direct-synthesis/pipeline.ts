import { buildSynthesisCostSummary, runWithAIContext } from '@/lib/ai/usage/context'
import type { AIUsageRecord } from '@/lib/ai/usage/types'
import { buildEvidenceCatalog } from '@/lib/experiments/direct-synthesis/evidence-retrieval'
import { generateDirectCrossSourceSynthesis } from '@/lib/experiments/direct-synthesis/cross-source-synthesis'
import { validateDirectSynthesis } from '@/lib/experiments/direct-synthesis/evidence-validation'
import { generateDirectSourceAnswer } from '@/lib/experiments/direct-synthesis/per-source-answer'
import type { DirectSynthesisResult } from '@/lib/experiments/direct-synthesis/types'
import type { SourceAnalysis } from '@/lib/types/source'

export async function runDirectCrossSourcePipeline(input: {
  centralQuestion: string
  sources: SourceAnalysis[]
  outputLanguage?: 'ko' | 'en'
  costAccumulator?: AIUsageRecord[]
}): Promise<DirectSynthesisResult> {
  const started = Date.now()
  const costAccumulator = input.costAccumulator ?? []

  return runWithAIContext({ costAccumulator }, async () => {
    const evidenceRetrievalStarted = Date.now()
    const evidenceCatalog = buildEvidenceCatalog(input.sources)
    const evidenceRetrievalMs = Date.now() - evidenceRetrievalStarted

    const perSourceStarted = Date.now()
    const sourceAnswers = await Promise.all(
      input.sources.map((source) =>
        generateDirectSourceAnswer({
          centralQuestion: input.centralQuestion,
          source,
          outputLanguage: input.outputLanguage,
        }),
      ),
    )
    const perSourceAnswerMs = Date.now() - perSourceStarted

    const crossStarted = Date.now()
    const synthesis = await generateDirectCrossSourceSynthesis({
      centralQuestion: input.centralQuestion,
      sourceAnswers,
      outputLanguage: input.outputLanguage,
    })
    const crossSourceMs = Date.now() - crossStarted

    const validationStarted = Date.now()
    const validation = validateDirectSynthesis({
      sourceAnswers,
      synthesis,
      evidenceCatalog,
    })
    const validationMs = Date.now() - validationStarted

    const totalMs = Date.now() - started

    return {
      architecture: 'direct_cross_source',
      version: 'direct-baseline-1.0',
      centralQuestion: input.centralQuestion,
      sourceAnswers,
      agreements: validation.filteredAgreements,
      disagreements: validation.filteredDisagreements,
      complementaryViews: validation.filteredComplementary,
      nonComparableSources: synthesis.nonComparableSources,
      uncertainties: synthesis.uncertainties,
      finalAnswer: synthesis.finalAnswer,
      confidence: synthesis.confidence,
      evidenceCatalog,
      validation,
      timingMs: {
        evidenceRetrievalMs,
        perSourceAnswerMs,
        crossSourceMs,
        validationMs,
        totalMs,
      },
    }
  })
}

export function directPipelineCostSummary(
  records: AIUsageRecord[],
  videoCount: number,
) {
  return buildSynthesisCostSummary(records, videoCount)
}
