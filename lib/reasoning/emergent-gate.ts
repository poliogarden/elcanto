import { containsOvergeneralization } from '@/lib/reasoning/provenance'
import type { ReasoningInsight, ReasoningKnowledgeGap } from '@/lib/reasoning/types'

export type EmergentRejectionReason =
  | 'SINGLE_SOURCE'
  | 'INSUFFICIENT_EVIDENCE_PATH'
  | 'PARAPHRASE_ONLY'
  | 'OVERGENERALIZATION'
  | 'UNSUPPORTED_CAUSALITY'
  | 'MARKET_PREDICTION'
  | 'EXTERNAL_KNOWLEDGE'
  | 'GAP_LEAKAGE'

export type EmergentGateResult = {
  accepted: ReasoningInsight[]
  rejected: Array<{ insight: ReasoningInsight; reason: EmergentRejectionReason }>
}

function overlapsGapTerms(text: string, gaps: ReasoningKnowledgeGap[]): boolean {
  const words = text.toLowerCase().split(/\W+/)
  for (const g of gaps) {
    const gapWords = g.question.toLowerCase().split(/\W+/).filter((w) => w.length > 4)
    let hits = 0
    for (const w of words) {
      if (gapWords.includes(w)) hits++
    }
    if (hits >= 2) return true
  }
  return false
}

function isParaphraseOnly(insight: ReasoningInsight, claimStatements: string[]): boolean {
  const words = new Set(insight.statement.toLowerCase().split(/\W+/).filter((w) => w.length > 4))
  if (words.size === 0) return true
  for (const stmt of claimStatements) {
    const claimWords = stmt.toLowerCase().split(/\W+/).filter((w) => w.length > 4)
    let shared = 0
    for (const w of claimWords) if (words.has(w)) shared++
    if (shared / words.size > 0.85) return true
  }
  return false
}

export function runEmergentQualityGate(input: {
  insights: ReasoningInsight[]
  claimStatements: string[]
  knowledgeGaps: ReasoningKnowledgeGap[]
  synthesizedSourceCount: number
}): EmergentGateResult {
  const accepted: ReasoningInsight[] = []
  const rejected: EmergentGateResult['rejected'] = []

  for (const insight of input.insights) {
    if (insight.verificationStatus === 'REJECTED') {
      rejected.push({ insight, reason: 'INSUFFICIENT_EVIDENCE_PATH' })
      continue
    }
    if (insight.sourceIds.length < 2) {
      rejected.push({ insight, reason: 'SINGLE_SOURCE' })
      continue
    }
    if (insight.evidencePath.length < 2) {
      rejected.push({ insight, reason: 'INSUFFICIENT_EVIDENCE_PATH' })
      continue
    }
    if (isParaphraseOnly(insight, input.claimStatements)) {
      rejected.push({ insight, reason: 'PARAPHRASE_ONLY' })
      continue
    }
    if (overlapsGapTerms(insight.statement, input.knowledgeGaps)) {
      rejected.push({ insight, reason: 'GAP_LEAKAGE' })
      continue
    }
    if (containsOvergeneralization(insight.statement, input.synthesizedSourceCount)) {
      rejected.push({ insight, reason: 'OVERGENERALIZATION' })
      continue
    }
    if (
      /\b(will decline|will become irrelevant|market will|industry will)\b/i.test(insight.statement) &&
      insight.evidencePath.filter((s) => s.step === 'relationship').length === 0
    ) {
      rejected.push({ insight, reason: 'MARKET_PREDICTION' })
      continue
    }
    if (
      /\b(causes|will cause|therefore leads to)\b/i.test(insight.statement) &&
      insight.evidencePath.filter((s) => s.step === 'relationship').length === 0
    ) {
      rejected.push({ insight, reason: 'UNSUPPORTED_CAUSALITY' })
      continue
    }
    accepted.push(insight)
  }

  return { accepted, rejected }
}
