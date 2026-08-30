import type { DirectSynthesisPersisted } from '@/lib/direct-synthesis/persisted'
import { evidenceTimeSeconds } from '@/lib/direct-synthesis/evidence-time'
import { legacyInsightToInsights } from '@/lib/direct-synthesis/legacy-insight'
import type { DirectInsight } from '@/lib/direct-synthesis/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { formatTimestamp, youtubeWatchUrl } from '@/lib/youtube/timestamp'

export type ExplorerSource = {
  id: string
  number: string
  name: string
  short: string
  title: string
  channel?: string
  youtubeId: string
  url: string
  colorClass: 'ie-source-a' | 'ie-source-b' | 'ie-source-c'
  participatingInsightIds: string[]
}

export type ExplorerEvidence = {
  ref: string
  sourceId: string
  youtubeId: string
  timeLabel: string
  timeSeconds?: number
  quote: string
  usedByInsightIds: string[]
  watchUrl?: string
}

export type InsightExplorerModel = {
  centralQuestion: string
  lang: 'ko' | 'en'
  totalSources: number
  comparedSources: number
  insights: DirectInsight[]
  sources: ExplorerSource[]
  evidence: ExplorerEvidence[]
  agreements: DirectSynthesisPersisted['agreements']
  disagreements: DirectSynthesisPersisted['disagreements']
  complementaryViews: DirectSynthesisPersisted['complementaryViews']
  uniqueViews: DirectSynthesisPersisted['uniqueViews']
  evidenceByRef: Map<string, ExplorerEvidence>
  sourceById: Map<string, ExplorerSource>
}

const SOURCE_COLORS: ExplorerSource['colorClass'][] = [
  'ie-source-a',
  'ie-source-b',
  'ie-source-c',
]

function shortName(title: string, channel?: string): string {
  if (channel && channel.length <= 12) return channel
  const words = title.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'Source'
  return words.slice(0, 2).join(' ')
}

export function resolveExplorerInsights(direct: DirectSynthesisPersisted): DirectInsight[] {
  if (direct.insights?.length) return direct.insights
  if (direct.insight) {
    return legacyInsightToInsights(
      direct.insight,
      direct.evidence.map((e) => ({ ref: e.ref, sourceId: e.sourceId })),
    )
  }
  return []
}

function dedupeExplorerEvidence(items: ExplorerEvidence[]): ExplorerEvidence[] {
  const byRef = new Map<string, ExplorerEvidence>()
  for (const item of items) {
    const existing = byRef.get(item.ref)
    if (!existing) {
      byRef.set(item.ref, item)
      continue
    }
    const usedByInsightIds = [
      ...new Set([...existing.usedByInsightIds, ...item.usedByInsightIds]),
    ]
    byRef.set(item.ref, {
      ...existing,
      usedByInsightIds,
      watchUrl: existing.watchUrl ?? item.watchUrl,
      timeSeconds: existing.timeSeconds ?? item.timeSeconds,
      timeLabel:
        existing.timeLabel !== '—' ? existing.timeLabel : item.timeLabel,
    })
  }
  return [...byRef.values()]
}

export function buildInsightExplorerModel(
  direct: DirectSynthesisPersisted,
  document: SynthesisDocument,
): InsightExplorerModel {
  const lang: 'ko' | 'en' = /[가-힣]/.test(direct.centralQuestion) ? 'ko' : 'en'
  const insights = resolveExplorerInsights(direct)

  const participatingBySource = new Map<string, Set<string>>()
  const usedByRef = new Map<string, Set<string>>()

  for (const insight of insights) {
    for (const sourceId of insight.sourceIds) {
      const set = participatingBySource.get(sourceId) ?? new Set<string>()
      set.add(insight.id)
      participatingBySource.set(sourceId, set)
    }
    for (const ref of insight.evidenceRefs) {
      const set = usedByRef.get(ref) ?? new Set<string>()
      set.add(insight.id)
      usedByRef.set(ref, set)
    }
    for (const sc of insight.sourceConcepts) {
      for (const ref of sc.evidenceRefs) {
        const set = usedByRef.get(ref) ?? new Set<string>()
        set.add(insight.id)
        usedByRef.set(ref, set)
      }
    }
  }

  const sources: ExplorerSource[] = document.voices.map((entry, index) => {
    const sourceId =
      entry.analysis?.sourceId ?? entry.source?.sourceId ?? `source_${entry.voice.n}`
    const youtubeId = entry.voice.youtubeId
    const url = entry.voice.url ?? `https://www.youtube.com/watch?v=${youtubeId}`
    const title = entry.voice.title
    const channel = entry.voice.channel
    const name = shortName(title, channel)
    return {
      id: sourceId,
      number: String(entry.voice.n).padStart(2, '0'),
      name,
      short: name.slice(0, 8),
      title,
      channel,
      youtubeId,
      url,
      colorClass: SOURCE_COLORS[index % SOURCE_COLORS.length],
      participatingInsightIds: [...(participatingBySource.get(sourceId) ?? [])],
    }
  })

  const evidence = dedupeExplorerEvidence(
    direct.evidence.map((ev) => {
      const timeSeconds = evidenceTimeSeconds(ev.timestamp)
      const source = sources.find((s) => s.id === ev.sourceId)
      const youtubeId = (ev.videoId || source?.youtubeId) ?? ''
      const resolvedWatch =
        timeSeconds != null && youtubeId
          ? youtubeWatchUrl(youtubeId, timeSeconds)
          : source?.url

      return {
        ref: ev.ref,
        sourceId: ev.sourceId,
        youtubeId,
        timeLabel: timeSeconds != null ? formatTimestamp(timeSeconds) : '—',
        timeSeconds,
        quote: ev.evidenceText,
        usedByInsightIds: [...(usedByRef.get(ev.ref) ?? [])],
        watchUrl: resolvedWatch,
      }
    }),
  )

  const comparedSources = direct.sourceAnswers.filter(
    (a) => a.answerability !== 'NOT_RELEVANT',
  ).length

  const evidenceByRef = new Map(evidence.map((e) => [e.ref, e]))
  const sourceById = new Map(sources.map((s) => [s.id, s]))

  return {
    centralQuestion: direct.centralQuestion,
    lang,
    totalSources: document.voices.length,
    comparedSources,
    insights,
    sources,
    evidence,
    agreements: direct.agreements,
    disagreements: direct.disagreements,
    complementaryViews: direct.complementaryViews,
    uniqueViews: direct.uniqueViews,
    evidenceByRef,
    sourceById,
  }
}

export function insightDisplayNumber(id: string, index: number): string {
  const match = id.match(/(\d+)/)
  if (match) return match[1].padStart(2, '0')
  return String(index + 1).padStart(2, '0')
}

export function countInsightEvidence(insight: DirectInsight): number {
  const refs = new Set<string>()
  for (const ref of insight.evidenceRefs) refs.add(ref)
  for (const sc of insight.sourceConcepts) {
    for (const ref of sc.evidenceRefs) refs.add(ref)
  }
  return refs.size
}
