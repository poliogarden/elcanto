import type { NormalizedConcept } from '@/lib/types/insight-graph'
import type { SourceAnalysis } from '@/lib/types/source'
import { normalizeSourceAnalysis } from '@/lib/types/source'
import { toSourceKnowledge } from '@/lib/types/knowledge'

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function extractNormalizedConcepts(sources: SourceAnalysis[]): Map<string, NormalizedConcept> {
  const map = new Map<string, NormalizedConcept>()

  for (const raw of sources) {
    const source = normalizeSourceAnalysis(raw)
    const knowledge = toSourceKnowledge(source)

    for (const topic of knowledge.topics) {
      const key = normalizeLabel(topic.label)
      if (!key) continue
      const existing = map.get(key)
      if (existing) {
        if (!existing.sourceIds.includes(source.sourceId)) {
          existing.sourceIds.push(source.sourceId)
        }
      } else {
        map.set(key, {
          id: `concept_${key.replace(/\s+/g, '_').slice(0, 40)}`,
          label: topic.label,
          sourceIds: [source.sourceId],
          claimIds: [],
        })
      }
    }

    for (const entity of knowledge.concepts) {
      const key = normalizeLabel(entity.label)
      if (!key) continue
      const existing = map.get(key)
      if (existing) {
        if (!existing.sourceIds.includes(source.sourceId)) {
          existing.sourceIds.push(source.sourceId)
        }
        if (entity.description && !existing.description) {
          existing.description = entity.description
        }
      } else {
        map.set(key, {
          id: entity.id || `concept_${key.replace(/\s+/g, '_').slice(0, 40)}`,
          label: entity.label,
          description: entity.description,
          sourceIds: [source.sourceId],
          claimIds: [],
        })
      }
    }

    for (const claim of knowledge.claims) {
      const topicKey = normalizeLabel(claim.topic || 'general')
      const concept = map.get(topicKey)
      if (concept && !concept.claimIds.includes(claim.id)) {
        concept.claimIds.push(claim.id)
      }
    }
  }

  return map
}

export function buildVideoAnalysisGraph(source: SourceAnalysis): import('@/lib/types/insight-graph').VideoAnalysisGraph {
  const n = normalizeSourceAnalysis(source)
  const concepts = [...extractNormalizedConcepts([source]).values()]

  return {
    videoId: n.videoId,
    sourceId: n.sourceId,
    concepts,
    claims: n.claims.map((c) => ({
      id: c.id,
      statement: c.statement,
      topic: c.topic,
      importance: c.confidence,
      conceptIds: concepts
        .filter((concept) => concept.claimIds.includes(c.id))
        .map((concept) => concept.id),
      evidence: n.evidence.filter((e) => e.text.toLowerCase().includes(c.statement.slice(0, 24).toLowerCase())).slice(0, 3),
    })),
  }
}
