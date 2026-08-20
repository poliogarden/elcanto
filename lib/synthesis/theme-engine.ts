import type { CrossSourcePattern } from '@/lib/types/relationship'
import type { CrossSourceTheme } from '@/lib/types/synthesis-report'
import type { SourceAnalysis } from '@/lib/types/source'

function normalizeTopic(topic: string): string {
  return topic.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function titleCase(topic: string): string {
  return topic
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function parseVoiceIndex(sourceId: string): number {
  const match = sourceId.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

export function discoverThemes(
  sources: SourceAnalysis[],
  patterns: CrossSourcePattern[] = [],
): CrossSourceTheme[] {
  const buckets = new Map<
    string,
    { topic: string; claimIds: string[]; sourceIds: Set<string>; confidence: number }
  >()

  for (const source of sources) {
    for (const claim of source.claims ?? []) {
      const topic = normalizeTopic(claim.topic || 'general')
      const key = topic
      const bucket = buckets.get(key) ?? {
        topic,
        claimIds: [],
        sourceIds: new Set<string>(),
        confidence: 0,
      }
      bucket.claimIds.push(claim.id)
      bucket.sourceIds.add(source.sourceId)
      bucket.confidence += claim.confidence
      buckets.set(key, bucket)
    }
  }

  const themes: CrossSourceTheme[] = []

  for (const [key, bucket] of buckets) {
    const sourceIds = [...bucket.sourceIds]
    if (sourceIds.length < 2 && bucket.claimIds.length < 3) continue

    const pattern = patterns.find((p) =>
      normalizeTopic(p.label).includes(key) || key.includes(normalizeTopic(p.label)),
    )

    const importance =
      sourceIds.length * 0.35 +
      Math.min(bucket.claimIds.length, 12) * 0.05 +
      bucket.confidence / Math.max(bucket.claimIds.length, 1) * 0.3

    themes.push({
      id: `theme_${key.replace(/\s+/g, '_')}`,
      title: titleCase(bucket.topic),
      description:
        pattern?.description ??
        `Recurring theme across ${sourceIds.length} source${sourceIds.length === 1 ? '' : 's'} with ${bucket.claimIds.length} related claims.`,
      claimIds: bucket.claimIds.slice(0, 12),
      sourceIds,
      importance: Math.round(importance * 100) / 100,
      synthesisSentence:
        pattern?.description ??
        `Sources ${sourceIds.map(parseVoiceIndex).sort((a, b) => a - b).map((n) => String(n).padStart(2, '0')).join(', ')} converge on ${titleCase(bucket.topic).toLowerCase()}.`,
      evidenceClaimIds: bucket.claimIds.slice(0, 4),
    })
  }

  return themes.sort((a, b) => b.importance - a.importance).slice(0, 8)
}
