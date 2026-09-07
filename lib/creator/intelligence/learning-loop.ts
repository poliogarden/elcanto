import type { ChannelMemory, CreatorLearning } from '@/lib/creator/intelligence/types'
import { randomUUID } from 'crypto'

export type ProjectOutcome = {
  projectId: string
  publishedVideoId?: string
  views24h?: number
  ctr?: number
  retention30s?: number
  recordedAt: string
}

export function recordOutcomeLearning(input: {
  channelId: string
  outcome: ProjectOutcome
  decisionSummary?: string
  existingLearnings: CreatorLearning[]
}): CreatorLearning[] {
  if (!outcome.views24h && !outcome.retention30s) return input.existingLearnings

  const hasStrongRetention = (outcome.retention30s ?? 0) > 0.55
  const statement = hasStrongRetention
    ? 'Shorter intros may improve early retention on analytical topics.'
    : 'Not enough evidence yet to confirm format changes.'

  const confidence = hasStrongRetention ? 'some_evidence' : 'insufficient'
  if (confidence === 'insufficient') return input.existingLearnings

  const learning: CreatorLearning = {
    id: randomUUID(),
    channelId: input.channelId,
    statement,
    confidence,
    supportingOutcomes: [input.outcome.projectId],
    contradictingOutcomes: [],
    linkedDecisionIds: [],
    createdAt: new Date().toISOString(),
  }

  return [...input.existingLearnings, learning]
}

export function applyLearningToOpportunityStrength(
  baseStrength: number,
  learnings: CreatorLearning[],
  topicKeywords: string[],
): number {
  let boost = 0
  for (const l of learnings) {
    if (l.confidence === 'insufficient') continue
    if (topicKeywords.some((k) => l.statement.toLowerCase().includes(k.toLowerCase()))) {
      boost += l.confidence === 'strong_evidence' ? 0.05 : 0.02
    }
  }
  return Math.min(1, baseStrength + boost)
}
