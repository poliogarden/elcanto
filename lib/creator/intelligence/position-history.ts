import type { ChannelBrain, CreatorPosition } from '@/lib/creator/types'
import type { PositionHistoryEntry } from '@/lib/creator/intelligence/types'

export function buildPositionHistory(
  brain: ChannelBrain,
  positions: CreatorPosition[],
): PositionHistoryEntry[] {
  const byTopic = new Map<string, CreatorPosition[]>()
  for (const pos of positions) {
    const key = pos.topicId ?? 'general'
    const list = byTopic.get(key) ?? []
    list.push(pos)
    byTopic.set(key, list)
  }

  const history: PositionHistoryEntry[] = []
  for (const [topicId, topicPositions] of byTopic) {
    const sorted = [...topicPositions].sort((a, b) => {
      const da = a.publishedAt ?? ''
      const db = b.publishedAt ?? ''
      return da.localeCompare(db)
    })

    for (let i = 0; i < sorted.length; i++) {
      const pos = sorted[i]
      const prev = sorted[i - 1]
      let changeFromPrevious: PositionHistoryEntry['changeFromPrevious'] = null
      let changeConfidence: PositionHistoryEntry['changeConfidence'] = 'moderate'

      if (prev) {
        const a = prev.statement.toLowerCase()
        const b = pos.statement.toLowerCase()
        if (a === b) changeFromPrevious = 'CONSISTENT'
        else if (/unsustainable|bubble|correction|skeptic/i.test(b) && /structural|demand|bull/i.test(a)) {
          changeFromPrevious = 'MODIFIED'
          changeConfidence = 'moderate'
        } else if (/not|never|unsustainable/i.test(b) && /will|continue|structural/i.test(a)) {
          changeFromPrevious = 'WEAKENED'
        } else {
          changeFromPrevious = 'MODIFIED'
        }
      }

      history.push({
        id: `ph_${pos.id}`,
        topicId,
        positionId: pos.id,
        label: pos.label,
        statement: pos.statement,
        videoId: pos.videoId,
        evidenceRef: pos.evidenceRef,
        timestamp: pos.timestamp,
        publishedAt: pos.publishedAt ?? new Date().toISOString(),
        changeFromPrevious,
        changeConfidence,
        evidence: {
          videoId: pos.videoId,
          timestampStart: pos.timestamp,
          timestampEnd: pos.endTime,
          transcriptExcerpt: pos.statement.slice(0, 200),
          publishedAt: pos.publishedAt,
        },
      })
    }
  }

  return history.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
}

export function formatEvidenceLink(entry: PositionHistoryEntry): string {
  const min = Math.floor(entry.evidence.timestampStart / 60)
  const sec = entry.evidence.timestampStart % 60
  return `From your video · ${min}:${String(sec).padStart(2, '0')}`
}
