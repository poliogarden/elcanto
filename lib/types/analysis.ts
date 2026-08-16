/** Structured output from per-video analysis (Phase 2+) */

export type Claim = {
  id: string
  statement: string
  importance: number
  evidenceIds: string[]
}

export type Evidence = {
  id: string
  timestamp: number
  text: string
}

export type VideoAnalysis = {
  videoId: string
  summary: string
  thesis: string
  keyClaims: Claim[]
  evidence: Evidence[]
  topics: string[]
  stance?: string
}

/** Structured output from multi-video synthesis (Phase 3+) */

export type ConsensusItem = {
  claim: string
  supportingVoiceIds: string[]
  evidenceIds: string[]
  confidence: number
}

export type DisagreementSide = {
  label: string
  voiceIds: string[]
  summary: string
  evidenceIds: string[]
}

export type DisagreementItem = {
  question: string
  sides: DisagreementSide[]
}

export type MinorityInsight = {
  claim: string
  detail: string
  voiceIds: string[]
  evidenceIds: string[]
  mentionedBy: number
  total: number
}

export type SynthesisResult = {
  topic: string
  bottomLine: string
  bottomLineHeadline?: string[]
  consensus: ConsensusItem[]
  disagreements: DisagreementItem[]
  minorityInsights: MinorityInsight[]
  overallConclusion: string
}

export type AskAnswer = {
  answer: string
  basedOnVoiceIds: string[]
  evidence: Array<{ videoId: string; timestamp: number; text: string }>
}
