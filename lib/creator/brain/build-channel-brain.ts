import type { ChannelBrain, ContentOpportunity } from '@/lib/creator/types'
import type { SourceAnalysis } from '@/lib/types/source'

export function buildChannelBrainFromAnalyses(input: {
  channelId: string
  analyses: SourceAnalysis[]
}): ChannelBrain {
  const topics = new Map<string, { label: string; videoIds: Set<string> }>()
  const positions: ChannelBrain['positions'] = []

  for (const analysis of input.analyses) {
    const topicLabels = analysis.topics?.slice(0, 3) ?? []
    for (const label of topicLabels) {
      const key = label.toLowerCase().slice(0, 48)
      const entry = topics.get(key) ?? { label, videoIds: new Set<string>() }
      entry.videoIds.add(analysis.videoId)
      topics.set(key, entry)
    }

    for (const claim of analysis.claims?.slice(0, 8) ?? []) {
      const ev = analysis.evidence?.find((e) => e.id === claim.id || e.text.includes(claim.statement.slice(0, 24)))
      positions.push({
        id: `pos_${analysis.sourceId}_${claim.id}`,
        channelId: input.channelId,
        videoId: analysis.videoId,
        topicId: topicLabels[0] ? `topic_${topicLabels[0].toLowerCase().slice(0, 24)}` : null,
        label: claim.statement.slice(0, 80),
        statement: claim.statement,
        evidenceRef: ev ? `${analysis.sourceId}:${ev.id}` : `${analysis.sourceId}:claim`,
        timestamp: ev?.timestamp ?? 0,
        endTime: ev?.endTime ?? undefined,
      })
    }
  }

  const topicRecords = [...topics.entries()].map(([key, val], i) => ({
    id: `topic_${i}_${key.replace(/\W+/g, '_').slice(0, 20)}`,
    channelId: input.channelId,
    label: val.label,
    description: null,
    videoIds: [...val.videoIds],
  }))

  const openLoops: ChannelBrain['openLoops'] = []
  for (const analysis of input.analyses) {
    for (const imp of analysis.implications?.slice(0, 2) ?? []) {
      if (/later|follow|revisit|next|will return/i.test(imp)) {
        openLoops.push({
          id: `loop_${analysis.videoId}_${openLoops.length}`,
          channelId: input.channelId,
          label: imp.slice(0, 60),
          description: imp,
          sourceVideoId: analysis.videoId,
        })
      }
    }
  }

  return {
    channelId: input.channelId,
    topics: topicRecords,
    positions,
    openLoops,
    opportunities: [],
    builtAt: new Date().toISOString(),
  }
}

export function buildContentOpportunities(brain: ChannelBrain): ContentOpportunity[] {
  const opportunities: ContentOpportunity[] = []

  if (brain.openLoops.length >= 1 && brain.positions.length >= 2) {
    const loop = brain.openLoops[0]
    const relatedPositions = brain.positions.slice(0, 3)
    opportunities.push({
      id: `opp_${brain.channelId}_1`,
      channelId: brain.channelId,
      title: loop.label || 'Follow-up your open thread',
      thesis: `Connect ${relatedPositions.map((p) => p.label).join(' and ')} in light of your unfinished thread.`,
      whyNow: [
        'You previously signaled a follow-up on this topic',
        `${relatedPositions.length} prior positions relate to this thread`,
        'Audience expects continuity on this theme',
      ],
      linkedTopicIds: brain.topics.slice(0, 2).map((t) => t.id),
      linkedPositionIds: relatedPositions.map((p) => p.id),
      linkedOpenLoopIds: [loop.id],
      strength: 0.85,
    })
  }

  if (brain.topics.length >= 2) {
    opportunities.push({
      id: `opp_${brain.channelId}_2`,
      channelId: brain.channelId,
      title: `${brain.topics[0].label} × ${brain.topics[1].label}`,
      thesis: `What changes when you read ${brain.topics[0].label} through ${brain.topics[1].label}?`,
      whyNow: [
        'These topics appear across multiple videos',
        'Cross-topic synthesis performed well historically',
      ],
      linkedTopicIds: brain.topics.slice(0, 2).map((t) => t.id),
      linkedPositionIds: brain.positions.slice(0, 2).map((p) => p.id),
      linkedOpenLoopIds: [],
      strength: 0.72,
    })
  }

  return opportunities.sort((a, b) => b.strength - a.strength)
}
