import { buildSynthesisCostSummary } from '@/lib/ai/usage/context'
import type { AIUsageRecord } from '@/lib/ai/usage/types'
import {
  directPipelineCostSummary,
  runDirectCrossSourcePipeline,
} from '@/lib/experiments/direct-synthesis/pipeline'
import type { DirectSynthesisResult } from '@/lib/experiments/direct-synthesis/types'
import type { ArchitectureBResult, FrozenExperimentInput } from '@/lib/experiments/architecture-ab/types'

export async function runArchitectureB(input: FrozenExperimentInput): Promise<ArchitectureBResult> {
  const costAccumulator: AIUsageRecord[] = []
  const direct = await runDirectCrossSourcePipeline({
    centralQuestion: input.centralQuestion,
    sources: input.sources,
    outputLanguage: input.outputLanguage,
    costAccumulator,
  })
  const costSummary = directPipelineCostSummary(costAccumulator, input.sources.length)
  return extractArchitectureBResult(input.centralQuestion, direct, costSummary, costAccumulator)
}

export function extractArchitectureBResult(
  centralQuestion: string,
  direct: DirectSynthesisResult,
  costSummary: ReturnType<typeof buildSynthesisCostSummary>,
  records: AIUsageRecord[],
): ArchitectureBResult {
  const displayed =
    direct.agreements.length + direct.disagreements.length + direct.complementaryViews.length
  const supported =
    direct.validation.agreementSupported +
    direct.validation.disagreementSupported +
    direct.validation.complementarySupported
  const precision = displayed > 0 ? supported / displayed : 1

  const goodZero =
    displayed === 0 && direct.nonComparableSources.length >= 1

  return {
    architecture: 'direct_baseline',
    centralQuestion,
    finalAnswer: direct.finalAnswer,
    agreementCount: direct.agreements.length,
    divideCount: direct.disagreements.length,
    complementaryCount: direct.complementaryViews.length,
    nonComparableCount: direct.nonComparableSources.length,
    evidencePrecision: precision,
    hallucinationCount: direct.validation.hallucinationFlags.length,
    goodZero,
    timingMs: {
      perSourceAnswerMs: direct.timingMs.perSourceAnswerMs,
      crossSourceMs: direct.timingMs.crossSourceMs,
      validationMs: direct.timingMs.validationMs,
      totalMs: direct.timingMs.totalMs,
    },
    costSummary: {
      llmCalls: records.length,
      inputTokens: costSummary.totalInputTokens,
      outputTokens: costSummary.totalOutputTokens,
      totalEstimatedCostUsd: costSummary.totalEstimatedCostUsd,
    },
    raw: direct,
  }
}
