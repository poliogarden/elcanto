import type { ReasoningEvalSnapshot } from '@/lib/reasoning/eval/types'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'

export type McpReproducibilitySnapshot = {
  label: string
  generatedAt: string
  pipelineMode: string
  engineVersion: string
  claims: number
  generationEligible: number
  candidates: number
  verified: number
  agreement: number
  divide: number
  complementary: number
  finalJudgment?: string
  judgmentConfidence: string
  evidenceIntegrityPass: boolean
  relevanceUsable: number
  model?: string
  temperature?: string
  seed?: string
}

function relationshipCounts(reasoning: MultiSourceReasoning | null): {
  agreement: number
  divide: number
  complementary: number
} {
  const rels = reasoning?.relationships ?? []
  return {
    agreement: rels.filter((r) => r.type === 'AGREEMENT' || r.type === 'PARTIAL_AGREEMENT').length,
    divide: rels.filter((r) =>
      r.type === 'CONTRADICTION' || r.type === 'DIVIDE' || r.type === 'TENSION',
    ).length,
    complementary: rels.filter((r) => r.type === 'COMPLEMENTARY').length,
  }
}

export function captureMcpReproducibilitySnapshot(
  label: string,
  snapshot: ReasoningEvalSnapshot,
): McpReproducibilitySnapshot {
  const reasoning = snapshot.reasoning
  const d = reasoning?.diagnostics
  const stats = d?.pipelineStats
  const comparable = d?.comparableClaimFunnel
  const relCounts = relationshipCounts(reasoning)
  const evidenceIntegrityPass = !(d?.pipelineWarnings ?? []).some(
    (w) => w.code === 'EVIDENCE_INTEGRITY_VIOLATION',
  )

  return {
    label,
    generatedAt: snapshot.meta.generatedAt,
    pipelineMode: snapshot.meta.pipelineMode,
    engineVersion: snapshot.meta.engineVersion,
    claims: reasoning?.claims?.length ?? 0,
    generationEligible: stats?.generationEligible ?? comparable?.generationEligible ?? 0,
    candidates: stats?.candidatePairs ?? 0,
    verified: stats?.verifiedRelationships ?? reasoning?.relationships?.length ?? 0,
    agreement: relCounts.agreement,
    divide: relCounts.divide,
    complementary: relCounts.complementary,
    finalJudgment: reasoning?.judgment?.statement,
    judgmentConfidence: reasoning?.judgment?.confidence ?? 'N/A',
    evidenceIntegrityPass,
    relevanceUsable: comparable?.usableInput ?? 0,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini (default)',
    temperature: process.env.OPENAI_TEMPERATURE ?? 'default',
    seed: process.env.OPENAI_SEED ?? 'none',
  }
}

export function compareReproducibilitySnapshots(
  a: McpReproducibilitySnapshot,
  b: McpReproducibilitySnapshot,
): string[] {
  const diffs: string[] = []
  const fields: Array<keyof McpReproducibilitySnapshot> = [
    'claims',
    'generationEligible',
    'candidates',
    'verified',
    'agreement',
    'divide',
    'complementary',
    'judgmentConfidence',
    'evidenceIntegrityPass',
    'relevanceUsable',
  ]
  for (const field of fields) {
    if (a[field] !== b[field]) {
      diffs.push(`${field}: ${a[field]} → ${b[field]}`)
    }
  }
  if (a.finalJudgment !== b.finalJudgment) {
    diffs.push(`finalJudgment changed`)
  }
  return diffs
}
