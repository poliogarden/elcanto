import type { ReasoningClaim, ReasoningJudgment, ReasoningRelationship } from '@/lib/reasoning/types'

export type JudgmentGateResult = {
  canGenerate: boolean
  status: 'ready' | 'insufficient_evidence' | 'weak_evidence'
  reason: string
  confidenceCap?: 'low' | 'moderate'
}

export function assessJudgmentGate(input: {
  synthesisSourceCount: number
  claims: ReasoningClaim[]
  relationships: ReasoningRelationship[]
  patternsCount: number
}): JudgmentGateResult {
  const verifiedClaims = input.claims.length
  const verifiedRelationships = input.relationships.filter(
    (r) => r.verificationStatus === 'SUPPORTED',
  ).length

  if (input.synthesisSourceCount < 1 || verifiedClaims < 1) {
    return {
      canGenerate: false,
      status: 'insufficient_evidence',
      reason:
        'No relevant sources or verified claims — cannot form a defensible judgment.',
    }
  }

  const hasCrossSourceEvidence =
    verifiedRelationships > 0 || input.patternsCount > 0

  if (!hasCrossSourceEvidence) {
    if (input.synthesisSourceCount < 2) {
      return {
        canGenerate: false,
        status: 'insufficient_evidence',
        reason:
          'Single source with no verified cross-source relationships — judgment withheld.',
      }
    }
    return {
      canGenerate: true,
      status: 'weak_evidence',
      reason: 'Sources are relevant but no verified cross-source relationships were found.',
      confidenceCap: 'low',
    }
  }

  if (input.synthesisSourceCount < 2) {
    return {
      canGenerate: true,
      status: 'weak_evidence',
      reason: 'Limited to a single relevant source.',
      confidenceCap: 'moderate',
    }
  }

  return {
    canGenerate: true,
    status: 'ready',
    reason: 'Sufficient verified evidence for judgment.',
  }
}

export function applyJudgmentGate(
  judgment: ReasoningJudgment | null,
  gate: JudgmentGateResult,
): ReasoningJudgment | null {
  if (!gate.canGenerate) return null
  if (!judgment) return null

  if (gate.confidenceCap === 'low' && judgment.confidence === 'high') {
    return { ...judgment, confidence: 'low' }
  }
  if (
    gate.confidenceCap === 'moderate' &&
    (judgment.confidence === 'high' || judgment.confidence === 'moderate')
  ) {
    return {
      ...judgment,
      confidence: gate.confidenceCap === 'moderate' ? 'moderate' : judgment.confidence,
    }
  }

  return judgment
}

export function insufficientEvidenceJudgment(reason: string): null {
  return null
}
