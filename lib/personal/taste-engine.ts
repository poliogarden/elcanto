import type {
  InterestShift,
  InterestTrend,
  PersonalCluster,
  PersonalGraphEdge,
  PersonalGraphNode,
  PersonalSignal,
  TasteWindow,
  TasteWindowView,
} from '@/lib/types/personal'

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my',
  'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'whom', 'how',
  'why', 'when', 'where', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
])

const DOMAIN_TERMS = [
  'ai', 'agents', 'infrastructure', 'startup', 'startups', 'entrepreneurship', 'coding',
  'filmmaking', 'creator', 'creators', 'voice', 'compute', 'gpu', 'llm', 'llms', 'model',
  'models', 'scaling', 'productivity', 'automation', 'economics', 'investment', 'venture',
]

export function extractTopicsFromText(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))

  const topics = new Set<string>()

  for (const term of DOMAIN_TERMS) {
    if (text.toLowerCase().includes(term)) {
      topics.add(term.replace(/s$/, '').replace('startup', 'startups'))
    }
  }

  for (const word of words) {
    if (word.length >= 4) topics.add(word)
  }

  return [...topics].slice(0, 8)
}

export function enrichSignalTopics(signal: PersonalSignal): PersonalSignal {
  const combined = `${signal.title} ${signal.channel ?? ''}`
  const extracted = extractTopicsFromText(combined)
  return {
    ...signal,
    topics: [...new Set([...signal.topics, ...extracted])].slice(0, 10),
  }
}

function windowStart(window: TasteWindow): Date | null {
  const now = Date.now()
  if (window === '7d') return new Date(now - 7 * 86400000)
  if (window === '30d') return new Date(now - 30 * 86400000)
  if (window === '90d') return new Date(now - 90 * 86400000)
  return null
}

export function filterSignalsByWindow(signals: PersonalSignal[], window: TasteWindow): PersonalSignal[] {
  const start = windowStart(window)
  if (!start) return signals
  return signals.filter((s) => new Date(s.signalAt) >= start)
}

function topicWeights(signals: PersonalSignal[]): Map<string, number> {
  const weights = new Map<string, number>()
  for (const signal of signals) {
    const enriched = enrichSignalTopics(signal)
    const boost = signal.source === 'youtube_like' ? 2 : signal.source === 'elcanto_synthesis' ? 3 : 1
    for (const topic of enriched.topics) {
      weights.set(topic, (weights.get(topic) ?? 0) + boost)
    }
  }
  return weights
}

export function computeInterestTrends(
  signals: PersonalSignal[],
  window: TasteWindow,
): { emerging: InterestTrend[]; declining: InterestTrend[] } {
  const recent = filterSignalsByWindow(signals, window)
  const priorWindow = window === '7d' ? '30d' : window === '30d' ? '90d' : 'all'
  const allInPrior = filterSignalsByWindow(signals, priorWindow)
  const priorStart = windowStart(window)
  const prior = priorStart
    ? allInPrior.filter((s) => new Date(s.signalAt) < priorStart)
    : []

  if (recent.length < 3) return { emerging: [], declining: [] }

  const recentW = topicWeights(recent)
  const priorW = topicWeights(prior)
  const totalRecent = [...recentW.values()].reduce((a, b) => a + b, 0) || 1
  const totalPrior = [...priorW.values()].reduce((a, b) => a + b, 0) || 1

  const emerging: InterestTrend[] = []
  const declining: InterestTrend[] = []

  const allTopics = new Set([...recentW.keys(), ...priorW.keys()])
  for (const topic of allTopics) {
    const rPct = ((recentW.get(topic) ?? 0) / totalRecent) * 100
    const pPct = ((priorW.get(topic) ?? 0) / totalPrior) * 100
    const delta = rPct - pPct

    if (delta >= 8 && (recentW.get(topic) ?? 0) >= 2) {
      emerging.push({ label: topic, changePercent: Math.round(delta), window })
    } else if (delta <= -8 && (priorW.get(topic) ?? 0) >= 2) {
      declining.push({ label: topic, changePercent: Math.round(delta), window })
    }
  }

  return {
    emerging: emerging.sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),
    declining: declining.sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),
  }
}

export function computeInterestShift(
  signals: PersonalSignal[],
  window: TasteWindow = '30d',
): InterestShift | null {
  const { emerging, declining } = computeInterestTrends(signals, window)
  if (emerging.length === 0 && declining.length === 0) return null

  const fromTopics = declining.slice(0, 3).map((d) => d.label)
  const toTopics = emerging.slice(0, 3).map((e) => e.label)

  if (fromTopics.length === 0 || toTopics.length === 0) return null

  const statement = `Your attention appears to be shifting from ${fromTopics.join(', ')} toward ${toTopics.join(', ')}.`

  return { fromTopics, toTopics, statement }
}

export function clusterSignals(signals: PersonalSignal[]): PersonalCluster[] {
  const enriched = signals.map(enrichSignalTopics)
  const topicGroups = new Map<string, PersonalSignal[]>()

  for (const signal of enriched) {
    const primary = signal.topics[0] ?? 'general'
    const group = topicGroups.get(primary) ?? []
    group.push(signal)
    topicGroups.set(primary, group)
  }

  return [...topicGroups.entries()]
    .filter(([, group]) => group.length >= 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .map(([topic, group], i) => ({
      id: `cluster_${i + 1}`,
      label: topic.charAt(0).toUpperCase() + topic.slice(1),
      topic,
      signalIds: group.map((s) => s.id),
      sourceCount: group.length,
      videos: group
        .filter((s): s is PersonalSignal & { youtubeId: string } => Boolean(s.youtubeId))
        .map((s) => ({
          signalId: s.id,
          youtubeId: s.youtubeId,
          title: s.title,
          channel: s.channel,
        })),
    }))
}

export function buildKnowledgeGraph(signals: PersonalSignal[]): {
  nodes: PersonalGraphNode[]
  edges: PersonalGraphEdge[]
} {
  const enriched = signals.slice(0, 80).map(enrichSignalTopics)
  const nodes: PersonalGraphNode[] = []
  const edges: PersonalGraphEdge[] = []
  const topicNodes = new Map<string, string>()

  const recentCutoff = Date.now() - 30 * 86400000

  for (const signal of enriched) {
    const sourceId = `src_${signal.id}`
    nodes.push({
      id: sourceId,
      type: 'source',
      label: signal.title.slice(0, 48),
      weight: 1,
      recent: new Date(signal.signalAt).getTime() >= recentCutoff,
    })

    for (const topic of signal.topics.slice(0, 3)) {
      let topicId = topicNodes.get(topic)
      if (!topicId) {
        topicId = `topic_${topic}`
        topicNodes.set(topic, topicId)
        nodes.push({
          id: topicId,
          type: 'topic',
          label: topic,
          weight: 1,
          recent: new Date(signal.signalAt).getTime() >= recentCutoff,
        })
      } else {
        const node = nodes.find((n) => n.id === topicId)
        if (node) node.weight += 1
      }

      edges.push({
        id: `edge_${sourceId}_${topicId}`,
        from: sourceId,
        to: topicId,
      })
    }
  }

  // Cross-topic pattern edges for shared high-weight topics
  const topTopics = [...topicNodes.entries()]
    .map(([label, id]) => ({ label, id, node: nodes.find((n) => n.id === id)! }))
    .filter((t) => t.node.weight >= 2)
    .slice(0, 4)

  if (topTopics.length >= 2) {
    for (let i = 0; i < topTopics.length - 1; i++) {
      edges.push({
        id: `pattern_${topTopics[i].id}_${topTopics[i + 1].id}`,
        from: topTopics[i].id,
        to: topTopics[i + 1].id,
        label: 'related interest',
      })
    }
  }

  return { nodes: nodes.slice(0, 40), edges: edges.slice(0, 60) }
}

export function inferCurrentThread(
  signals: PersonalSignal[],
  clusters: PersonalCluster[],
  window: TasteWindow = '30d',
): {
  thread: string
  supporting: string[]
} {
  const recent = filterSignalsByWindow(signals, window)
  const weights = topicWeights(recent.length > 0 ? recent : signals)
  const top = [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  const supporting = top.map(([t]) => t)
  const clusterLabels = clusters.slice(0, 3).map((c) => c.label)

  if (supporting.some((t) => ['ai', 'agent', 'agents', 'coding'].includes(t))) {
    return {
      thread: 'What happens when powerful capabilities become available to much smaller teams?',
      supporting: [...new Set([...supporting, ...clusterLabels])].slice(0, 6),
    }
  }

  if (supporting.length === 0) {
    return {
      thread: 'Your signals are still forming — add more sources or sync YouTube to discover your current thread.',
      supporting: [],
    }
  }

  return {
    thread: `How do ${supporting.slice(0, 2).join(' and ')} connect in what you're exploring lately?`,
    supporting: [...new Set([...supporting, ...clusterLabels])].slice(0, 6),
  }
}

export function buildPersonalSynthesisStatement(
  signals: PersonalSignal[],
  clusters: PersonalCluster[],
): string {
  if (signals.length < 2) {
    return 'Add more signals to discover what connects your recent interests.'
  }

  if (clusters.length >= 2) {
    const labels = clusters.slice(0, 3).map((c) => c.label).join(', ')
    return `Your recent interests look diverse across ${labels}, but they may converge on how technology changes what individuals and small teams can build.`
  }

  const top = clusters[0]
  if (top) {
    return `Your recent signals cluster around ${top.label} — ${top.sourceCount} sources point in this direction.`
  }

  return 'Your recent interests are still forming a clear pattern.'
}

const TASTE_WINDOWS: TasteWindow[] = ['7d', '30d', '90d', 'all']

export function buildTasteByWindow(signals: PersonalSignal[]): Record<TasteWindow, TasteWindowView> {
  const result = {} as Record<TasteWindow, TasteWindowView>

  for (const window of TASTE_WINDOWS) {
    const windowSignals = filterSignalsByWindow(signals, window)
    const { emerging, declining } = computeInterestTrends(signals, window)
    result[window] = {
      window,
      signalCount: windowSignals.length,
      emerging,
      declining,
      interestShift: computeInterestShift(signals, window),
    }
  }

  return result
}
