import type { EvidenceSnippet } from '@/lib/direct-synthesis/evidence'
import type { DirectEvidence } from '@/lib/direct-synthesis/types'
import type { DirectInsight } from '@/lib/direct-synthesis/types'
import type { CrossSourceRelation } from '@/lib/direct-synthesis/types'

/** Collect evidence refs referenced by insights and compare relations only. */
export function collectReferencedEvidenceRefs(input: {
  insights: DirectInsight[]
  agreements: CrossSourceRelation[]
  disagreements: CrossSourceRelation[]
  complementaryViews: CrossSourceRelation[]
  uniqueViews: CrossSourceRelation[]
}): Set<string> {
  const refs = new Set<string>()
  for (const insight of input.insights) {
    for (const ref of insight.evidenceRefs) refs.add(ref)
    for (const sc of insight.sourceConcepts) {
      for (const ref of sc.evidenceRefs) refs.add(ref)
    }
  }
  for (const rel of [
    ...input.agreements,
    ...input.disagreements,
    ...input.complementaryViews,
    ...input.uniqueViews,
  ]) {
    for (const ref of rel.evidenceRefs) refs.add(ref)
  }
  return refs
}

export function buildPersistedEvidence(
  catalog: EvidenceSnippet[],
  referencedRefs: Set<string>,
): DirectEvidence[] {
  const catalogMap = new Map(catalog.map((e) => [e.ref, e]))
  const evidence: DirectEvidence[] = []
  for (const ref of referencedRefs) {
    const e = catalogMap.get(ref)
    if (!e) continue
    evidence.push({
      ref: e.ref,
      sourceId: e.sourceId,
      videoId: e.videoId,
      evidenceText: e.text,
      timestamp: e.startTime,
      endTime: e.endTime,
    })
  }
  return evidence
}
