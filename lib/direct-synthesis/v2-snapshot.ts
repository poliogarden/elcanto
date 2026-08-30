import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

export type V2CompareSnapshot = {
  engineVersion: string
  centralQuestion: string
  judgmentStatement: string | null
  relationshipCount: number
  agreements: string[]
  divides: string[]
  complementary: string[]
  displayMessage: string
  pipelineStats?: Record<string, unknown>
  timingMs?: number
  cost: {
    llmCalls?: number
    inputTokens?: number
    outputTokens?: number
    estimatedCostUsd?: number | null
  }
  source: 'job_document' | 'pipeline_run'
}

const ZERO_MESSAGE =
  'No defensible cross-source judgment could be produced from verified relationships.'

function labelsFromReasoning(reasoning: MultiSourceReasoning): {
  agreements: string[]
  divides: string[]
  complementary: string[]
} {
  const supported = reasoning.relationships.filter((r) => r.verificationStatus === 'SUPPORTED')
  const agreements: string[] = []
  const divides: string[] = []
  const complementary: string[] = []

  for (const r of supported) {
    const text = r.explanation ?? r.type
    if (r.type === 'AGREEMENT' || r.type === 'PARTIAL_AGREEMENT') agreements.push(text)
    else if (
      r.type === 'CONTRADICTION' ||
      r.type === 'TENSION' ||
      r.type === 'TRADE_OFF'
    ) {
      divides.push(text)
    } else if (
      r.type === 'COMPLEMENTARY' ||
      r.type === 'MECHANISM_OUTCOME' ||
      r.type === 'SAME_TOPIC_DIFFERENT_PERSPECTIVE'
    ) {
      complementary.push(text)
    }
  }

  return { agreements, divides, complementary }
}

export function buildV2SnapshotFromDocument(
  doc: SynthesisDocument,
  extras?: {
    perfSummary?: {
      llmCalls?: number
      inputTokens?: number
      outputTokens?: number
      estimatedCostUsd?: number
      endToEndMs?: number
      totalMs?: number
    }
  },
): V2CompareSnapshot | null {
  const reasoning = doc.reasoning
  if (!reasoning || reasoning.mode !== 'multi') return null

  const labels = labelsFromReasoning(reasoning)
  const judgmentStatement = reasoning.judgment?.statement ?? null
  const relationshipCount = reasoning.relationships.filter(
    (r) => r.verificationStatus === 'SUPPORTED',
  ).length

  const displayMessage =
    judgmentStatement ??
    (relationshipCount === 0
      ? ZERO_MESSAGE
      : reasoning.synthesis?.statement ?? ZERO_MESSAGE)

  const pipelineStats = reasoning.diagnostics?.pipelineStats as
    | Record<string, unknown>
    | undefined

  return {
    engineVersion: reasoning.version ?? 'reasoning-v2.2',
    centralQuestion: reasoning.centralQuestion,
    judgmentStatement,
    relationshipCount,
    agreements: labels.agreements,
    divides: labels.divides,
    complementary: labels.complementary,
    displayMessage,
    pipelineStats,
    timingMs: extras?.perfSummary?.endToEndMs ?? extras?.perfSummary?.totalMs,
    cost: {
      llmCalls: extras?.perfSummary?.llmCalls,
      inputTokens: extras?.perfSummary?.inputTokens,
      outputTokens: extras?.perfSummary?.outputTokens,
      estimatedCostUsd: extras?.perfSummary?.estimatedCostUsd,
    },
    source: 'job_document',
  }
}

export function buildV2SnapshotFromPipeline(
  reasoning: MultiSourceReasoning,
  totalMs: number,
  cost: V2CompareSnapshot['cost'],
): V2CompareSnapshot {
  const labels = labelsFromReasoning(reasoning)
  const judgmentStatement = reasoning.judgment?.statement ?? null
  const relationshipCount = reasoning.relationships.filter(
    (r) => r.verificationStatus === 'SUPPORTED',
  ).length

  const displayMessage =
    judgmentStatement ??
    (relationshipCount === 0
      ? ZERO_MESSAGE
      : reasoning.synthesis?.statement ?? ZERO_MESSAGE)

  return {
    engineVersion: reasoning.version ?? 'reasoning-v2.2',
    centralQuestion: reasoning.centralQuestion,
    judgmentStatement,
    relationshipCount,
    agreements: labels.agreements,
    divides: labels.divides,
    complementary: labels.complementary,
    displayMessage,
    pipelineStats: reasoning.diagnostics?.pipelineStats as Record<string, unknown> | undefined,
    timingMs: totalMs,
    cost,
    source: 'pipeline_run',
  }
}
