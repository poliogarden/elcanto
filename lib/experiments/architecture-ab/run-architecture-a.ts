import { buildSynthesisCostSummary, runWithAIContext } from '@/lib/ai/usage/context'
import type { AIUsageRecord } from '@/lib/ai/usage/types'
import { runReasoningPipeline } from '@/lib/reasoning/pipeline'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import type { ArchitectureAResult, FrozenExperimentInput } from '@/lib/experiments/architecture-ab/types'

export async function runArchitectureA(input: FrozenExperimentInput): Promise<ArchitectureAResult> {
  const costAccumulator: AIUsageRecord[] = []
  const started = Date.now()

  try {
    const reasoning = await runWithAIContext({ costAccumulator }, () =>
      runReasoningPipeline({
        sources: input.sources,
        voices: input.sources.map((s) => ({
          channel: s.title?.split(' ')[0] ?? 'source',
        })),
        userQuestion: input.centralQuestion,
        outputLanguage: input.outputLanguage,
      }),
    )

    const totalMs = Date.now() - started
    const costSummary = buildSynthesisCostSummary(costAccumulator, input.sources.length)
    return extractArchitectureAResult(
      input.centralQuestion,
      reasoning,
      totalMs,
      costSummary,
      costAccumulator,
    )
  } catch (error) {
    const totalMs = Date.now() - started
    const costSummary = buildSynthesisCostSummary(costAccumulator, input.sources.length)
    const message = error instanceof Error ? error.message : String(error)
    return {
      architecture: 'reasoning_v2.2',
      centralQuestion: input.centralQuestion,
      judgmentStatement: null,
      synthesisSummary: `Pipeline error: ${message}`,
      agreementCount: 0,
      divideCount: 0,
      complementaryCount: 0,
      verifiedRelationshipCount: 0,
      rejectedRelationshipCount: 0,
      goodZero: true,
      pipelineStats: { error: message },
      timingMs: { reasoningMs: totalMs, totalMs },
      costSummary: {
        llmCalls: costAccumulator.length,
        inputTokens: costSummary.totalInputTokens,
        outputTokens: costSummary.totalOutputTokens,
        totalEstimatedCostUsd: costSummary.totalEstimatedCostUsd,
      },
      raw: { error: message },
    }
  }
}

export function extractArchitectureAResult(
  centralQuestion: string,
  reasoning: MultiSourceReasoning,
  totalMs: number,
  costSummary: ReturnType<typeof buildSynthesisCostSummary>,
  records: AIUsageRecord[],
): ArchitectureAResult {
  const supported = reasoning.relationships.filter((r) => r.verificationStatus === 'SUPPORTED')
  const agreementCount = supported.filter(
    (r) => r.type === 'AGREEMENT' || r.type === 'PARTIAL_AGREEMENT',
  ).length
  const divideCount = supported.filter(
    (r) =>
      r.type === 'CONTRADICTION' ||
      r.type === 'TENSION' ||
      r.type === 'TRADE_OFF',
  ).length
  const complementaryCount = supported.filter(
    (r) =>
      r.type === 'COMPLEMENTARY' ||
      r.type === 'MECHANISM_OUTCOME' ||
      r.type === 'PROBLEM_SOLUTION' ||
      r.type === 'CAUSE_EFFECT',
  ).length

  const stats = reasoning.diagnostics?.pipelineStats
  const goodZero =
    supported.length === 0 && (stats?.goodZeroResult === true || agreementCount + divideCount === 0)

  return {
    architecture: 'reasoning_v2.2',
    centralQuestion,
    judgmentStatement: reasoning.judgment?.statement ?? null,
    synthesisSummary: reasoning.synthesis?.headline ?? reasoning.synthesis?.summary ?? null,
    agreementCount,
    divideCount,
    complementaryCount,
    verifiedRelationshipCount: supported.length,
    rejectedRelationshipCount: reasoning.rejectedRelationships?.length ?? 0,
    goodZero,
    noRelationshipReason: stats?.noRelationshipReason as string | undefined,
    pipelineStats: stats as Record<string, unknown> | undefined,
    timingMs: {
      reasoningMs: totalMs,
      totalMs,
    },
    costSummary: {
      llmCalls: records.length,
      inputTokens: costSummary.totalInputTokens,
      outputTokens: costSummary.totalOutputTokens,
      totalEstimatedCostUsd: costSummary.totalEstimatedCostUsd,
    },
    raw: reasoning,
  }
}
