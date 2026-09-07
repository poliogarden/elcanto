import type { ContentOpportunity } from '@/lib/creator/types'
import type { ChannelMemory, OpportunitySignals } from '@/lib/creator/intelligence/types'

export type EnrichedOpportunity = ContentOpportunity & {
  opportunityType?: string
  signals?: OpportunitySignals
  whyExplanation?: {
    openLoops: string[]
    positions: string[]
    audience: string[]
    performance: string[]
    evidence: string[]
  }
}

/** Internal ranking heuristic — not a statistical probability. */
export function scoreOpportunitySignals(input: {
  opportunity: ContentOpportunity
  memory: ChannelMemory
}): OpportunitySignals {
  const hasOpenLoop = input.opportunity.linkedOpenLoopIds.length > 0
  const hasAudience = input.memory.audienceQuestions.some((q) =>
    input.opportunity.title.toLowerCase().includes(q.label.slice(0, 12).toLowerCase()),
  )

  return {
    CHANNEL_HISTORY: input.opportunity.linkedPositionIds.length >= 2 ? 0.75 : 0.4,
    OPEN_LOOP: hasOpenLoop ? 0.81 : 0.2,
    AUDIENCE_DEMAND: hasAudience ? 0.76 : 0.35,
    PERFORMANCE: 0.68,
    POSITION_CHANGE: input.opportunity.linkedPositionIds.length >= 2 ? 0.55 : 0.2,
    SERIES_CONTINUITY: hasOpenLoop ? 0.7 : 0.3,
    NEW_EVIDENCE: 0.84,
    MARKET_TIMING: 0.62,
    REPETITION_RISK: 0.21,
  }
}

export function computeOpportunityStrength(signals: OpportunitySignals): number {
  const weights: Record<string, number> = {
    CHANNEL_HISTORY: 0.12,
    OPEN_LOOP: 0.18,
    AUDIENCE_DEMAND: 0.15,
    PERFORMANCE: 0.1,
    POSITION_CHANGE: 0.1,
    SERIES_CONTINUITY: 0.1,
    NEW_EVIDENCE: 0.15,
    MARKET_TIMING: 0.08,
    REPETITION_RISK: -0.12,
  }
  let score = 0
  for (const [key, weight] of Object.entries(weights)) {
    const val = signals[key as keyof OpportunitySignals] ?? 0
    score += val * weight
  }
  return Math.max(0, Math.min(1, score))
}

export function diversifyOpportunities(opps: EnrichedOpportunity[]): EnrichedOpportunity[] {
  const selected: EnrichedOpportunity[] = []
  for (const opp of opps.sort((a, b) => b.strength - a.strength)) {
    const tooSimilar = selected.some((s) => {
      const overlap = tokenOverlap(s.title, opp.title)
      return overlap > 0.55
    })
    if (!tooSimilar) selected.push(opp)
  }
  return selected
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\s+/))
  const tb = new Set(b.toLowerCase().split(/\s+/))
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / Math.max(ta.size, tb.size, 1)
}

export function buildWhyExplanation(
  opportunity: ContentOpportunity,
  memory: ChannelMemory,
  positions: Array<{ id: string; label: string; statement: string; videoId: string; timestamp: number }>,
): EnrichedOpportunity['whyExplanation'] {
  const linkedPositions = positions.filter((p) => opportunity.linkedPositionIds.includes(p.id))
  const linkedLoops = memory.audienceQuestions
    .filter((q) => opportunity.title.toLowerCase().includes('회수') || opportunity.title.toLowerCase().includes('capex'))
    .map((q) => q.label)

  return {
    openLoops: opportunity.whyNow.filter((w) => /약속|follow|다시|미완/i.test(w)),
    positions: linkedPositions.map((p) => `${p.label}: "${p.statement.slice(0, 80)}…"`),
    audience: linkedLoops.length
      ? linkedLoops
      : memory.audienceQuestions.slice(0, 2).map((q) => q.label),
    performance: ['AI/버블 주제 영상이 채널 평균 대비 높은 조회수 (normalized baseline)'],
    evidence: opportunity.whyNow.filter((w) => /실적|Q2|earnings|데이터/i.test(w)),
  }
}

export function enrichOpportunities(
  opportunities: ContentOpportunity[],
  memory: ChannelMemory,
  positions: Array<{ id: string; label: string; statement: string; videoId: string; timestamp: number }>,
): EnrichedOpportunity[] {
  const enriched = opportunities.map((opp) => {
    const signals = scoreOpportunitySignals({ opportunity: opp, memory })
    const strength = computeOpportunityStrength(signals)
    return {
      ...opp,
      strength,
      signals,
      opportunityType: opp.linkedOpenLoopIds.length ? 'FOLLOW_UP' : 'UPDATE',
      whyExplanation: buildWhyExplanation(opp, memory, positions),
    }
  })
  return diversifyOpportunities(enriched)
}
