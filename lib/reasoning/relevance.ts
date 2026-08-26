export type SourceRelevanceClass =
  | 'direct'
  | 'supporting'
  | 'contrasting'
  | 'contextual'
  | 'weak'
  | 'off_topic'

export type SourceRelevance = {
  sourceId: string
  classification: SourceRelevanceClass
  score: number
  reason: string
  relevantClaimIds?: string[]
}

const SYNTHESIS_CLASSES: ReadonlySet<SourceRelevanceClass> = new Set([
  'direct',
  'supporting',
  'contrasting',
  'contextual',
  'weak',
])

export function isSynthesisCandidate(classification: SourceRelevanceClass): boolean {
  return SYNTHESIS_CLASSES.has(classification)
}

export function isExcluded(classification: SourceRelevanceClass): boolean {
  return classification === 'off_topic'
}

/** Map legacy cluster relevance to new classification when per-source data is absent. */
export function legacyClusterToClassification(
  relevance: 'primary' | 'secondary' | 'off_topic',
): SourceRelevanceClass {
  if (relevance === 'off_topic') return 'off_topic'
  if (relevance === 'primary') return 'direct'
  return 'supporting'
}

export function resolveSynthesisSourceIds(input: {
  sources: Array<{ sourceId: string }>
  sourceRelevance: SourceRelevance[]
  clusters: Array<{ sourceIds: string[]; relevance: 'primary' | 'secondary' | 'off_topic' }>
}): Set<string> {
  if (input.sourceRelevance.length > 0) {
    return new Set(
      input.sourceRelevance
        .filter((r) => isSynthesisCandidate(r.classification))
        .map((r) => r.sourceId),
    )
  }

  const ids = new Set<string>()
  for (const cluster of input.clusters) {
    const cls = legacyClusterToClassification(cluster.relevance)
    if (!isExcluded(cls)) {
      for (const sid of cluster.sourceIds) ids.add(sid)
    }
  }
  return ids
}

export function buildExcludedSources(input: {
  sources: Array<{
    sourceId: string
    videoId: string
    voiceIndex: number
    title: string
  }>
  sourceRelevance: SourceRelevance[]
  synthesisSourceIds: Set<string>
  legacyExcluded: Array<{ sourceId: string; reason: string }>
  offTopicClusters: Array<{ id: string; label: string; sourceIds: string[] }>
}): Array<{
  sourceId: string
  videoId: string
  voiceIndex: number
  title: string
  reason: string
  clusterId?: string
}> {
  const excluded: Array<{
    sourceId: string
    videoId: string
    voiceIndex: number
    title: string
    reason: string
    clusterId?: string
  }> = []

  const add = (
    sourceId: string,
    reason: string,
    clusterId?: string,
  ) => {
    if (input.synthesisSourceIds.has(sourceId)) return
    const src = input.sources.find((s) => s.sourceId === sourceId)
    if (!src) return
    if (excluded.some((e) => e.sourceId === sourceId)) return
    excluded.push({
      sourceId: src.sourceId,
      videoId: src.videoId,
      voiceIndex: src.voiceIndex,
      title: src.title,
      reason,
      clusterId,
    })
  }

  if (input.sourceRelevance.length > 0) {
    for (const r of input.sourceRelevance) {
      if (isExcluded(r.classification)) {
        add(r.sourceId, r.reason)
      }
    }
  } else {
    for (const ex of input.legacyExcluded) {
      add(ex.sourceId, ex.reason)
    }
  }

  for (const cluster of input.offTopicClusters) {
    for (const sid of cluster.sourceIds) {
      add(sid, `Off-topic cluster: ${cluster.label}`, cluster.id)
    }
  }

  for (const ex of input.legacyExcluded) {
    add(ex.sourceId, ex.reason)
  }

  return excluded
}
