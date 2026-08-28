import { getBenchmarkGold } from '@/lib/reasoning/eval/benchmark-gold'
import { loadBaselineFixture, loadFixtureSources } from '@/lib/reasoning/eval/fixtures'
import {
  assessDimensionCompatibility,
  assessMinimumSharedProposition,
  classifyPropositionDimension,
  deriveSharedProposition,
} from '@/lib/reasoning/proposition-alignment'
import { assessPreLlmComparability } from '@/lib/reasoning/verification-alignment'
import type { ReasoningClaim } from '@/lib/reasoning/types'

export type GoldRecallTraceEntry = {
  fixtureId: string
  sourceA: string
  sourceB: string
  claimA: string
  claimB: string
  normalizedSubjectA: string
  normalizedSubjectB: string
  normalizedPredicateA: string
  normalizedPredicateB: string
  propositionTargetA: string
  propositionTargetB: string
  dimensionA: string
  dimensionB: string
  polarityA: string
  polarityB: string
  sharedProposition: string
  entailedByA: boolean
  entailedByB: boolean
  addedInference: boolean
  dimensionCompatibility: 'EXACT' | 'COMPATIBLE' | 'DIFFERENT'
  preLlmVerdict: string
  rejectingGate?: string
  rejectingFunction?: string
  proposedType: string
}

const GOLD_PAIR_FIXTURES = [
  'clear-agreement',
  'clear-divide',
  'mixed-irrelevant',
] as const

function extractSubject(statement: string): string {
  const tokens = statement
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3)
  const subjects = tokens.filter((t) =>
    ['remote', 'work', 'attic', 'insulation', 'building', 'codes', 'retrofit'].includes(t),
  )
  return subjects.slice(0, 4).join(' ') || tokens.slice(0, 3).join(' ')
}

function extractPredicate(statement: string): string {
  const match = statement.match(
    /\b(reduces?|cuts?|increases?|decreases?|recommend|target|eliminates?|improves?|lowers?)\b[^.]{0,40}/i,
  )
  return match?.[0]?.trim() ?? statement.slice(0, 60)
}

function extractPropositionTarget(statement: string): string {
  const match = statement.match(
    /\b(productivity|commuting|travel|insulation|r-value|r-\d+|heat loss|retrofit)\b[^.]{0,30}/i,
  )
  return match?.[0]?.trim() ?? 'unspecified'
}

function polarityLabel(statement: string): string {
  if (/\b(increases?|raises?|boosts?|improves?)\b/i.test(statement)) return 'POSITIVE'
  if (/\b(decreases?|lowers?|diminishes?)\b/i.test(statement)) return 'NEGATIVE'
  if (/\b(reduces?|cuts?|eliminates?)\b/i.test(statement)) return 'POSITIVE_REDUCTION'
  return 'NEUTRAL'
}

function findClaimForSource(claims: ReasoningClaim[], sourceId: string): ReasoningClaim | undefined {
  return claims.find((c) => c.sourceId === sourceId)
}

export function buildGoldRecallTraces(): GoldRecallTraceEntry[] {
  const traces: GoldRecallTraceEntry[] = []

  for (const fixtureId of GOLD_PAIR_FIXTURES) {
    const gold = getBenchmarkGold(fixtureId)
    if (!gold) continue

    const sources = loadFixtureSources(loadBaselineFixture(fixtureId))
    const claims: ReasoningClaim[] = sources.flatMap((s) =>
      (s.claims ?? []).map((c) => ({
        id: c.id,
        sourceId: s.sourceId,
        videoId: s.videoId,
        voiceIndex: s.voiceIndex,
        statement: c.statement,
        normalizedStatement: c.statement.toLowerCase(),
        evidenceIds: [c.sourceSegmentId ? `${s.sourceId}_seg_${c.sourceSegmentId}` : `${c.id}_ev`],
        claimType: 'factual',
        confidence: 'strong',
        conceptIds: [],
      })),
    )

    for (const expected of gold.expectedRelationships.filter((r) => r.required)) {
      const [sourceA, sourceB] = expected.sources
      const claimA = findClaimForSource(claims, sourceA)
      const claimB = findClaimForSource(claims, sourceB)
      if (!claimA || !claimB) continue

      const dimA = classifyPropositionDimension(claimA.statement)
      const dimB = classifyPropositionDimension(claimB.statement)
      const msp = assessMinimumSharedProposition(claimA, claimB)
      const shared = deriveSharedProposition(claimA, claimB)
      const proposedType =
        expected.type === 'DIVIDE' ? 'CONTRADICTION' : 'AGREEMENT'
      const preLlm = assessPreLlmComparability(claimA, claimB, proposedType)

      traces.push({
        fixtureId,
        sourceA,
        sourceB,
        claimA: claimA.statement,
        claimB: claimB.statement,
        normalizedSubjectA: extractSubject(claimA.statement),
        normalizedSubjectB: extractSubject(claimB.statement),
        normalizedPredicateA: extractPredicate(claimA.statement),
        normalizedPredicateB: extractPredicate(claimB.statement),
        propositionTargetA: extractPropositionTarget(claimA.statement),
        propositionTargetB: extractPropositionTarget(claimB.statement),
        dimensionA: dimA,
        dimensionB: dimB,
        polarityA: polarityLabel(claimA.statement),
        polarityB: polarityLabel(claimB.statement),
        sharedProposition: msp.sharedProposition || shared,
        entailedByA: msp.entailedByA,
        entailedByB: msp.entailedByB,
        addedInference: msp.addedInference,
        dimensionCompatibility: assessDimensionCompatibility(dimA, dimB, claimA.statement, claimB.statement),
        preLlmVerdict: preLlm.verdict,
        rejectingGate: preLlm.rejectingGate,
        rejectingFunction: preLlm.rejectingFunction,
        proposedType,
      })
    }
  }

  return traces
}
