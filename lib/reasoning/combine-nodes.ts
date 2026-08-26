import type { AnalysisResult } from '@/lib/reasoning/analysis-result'
import type { ReasoningLevel } from '@/lib/reasoning/provenance-types'

export type CombinedNodeInsight = {
  id: string
  text: string
  reasoningLevel: ReasoningLevel
  sourceIds: string[]
  claimIds: string[]
  relationshipIds: string[]
  evidenceRefs: AnalysisResult['claimProvenance'][string]['evidenceRefs']
}

/**
 * Combine selected reasoning nodes into a single composable insight.
 * Preserves source provenance — does not invent evidence or timestamps.
 */
export function combineReasoningNodes(
  analysis: AnalysisResult,
  nodeIds: string[],
): CombinedNodeInsight | null {
  if (nodeIds.length === 0) return null

  const claimIds = new Set<string>()
  const relationshipIds = new Set<string>()
  const sourceIds = new Set<string>()
  const evidenceRefs: CombinedNodeInsight['evidenceRefs'] = []

  for (const nodeId of nodeIds) {
    if (nodeId.startsWith('claim_')) {
      const claimId = nodeId.replace(/^claim_/, '')
      claimIds.add(claimId)
      const prov = analysis.claimProvenance[claimId]
      if (prov) {
        sourceIds.add(prov.sourceId)
        evidenceRefs.push(...prov.evidenceRefs)
      }
    } else if (nodeId.startsWith('pattern_')) {
      const patternId = nodeId.replace(/^pattern_/, '')
      const pattern = analysis.displayedRelationships.find((r) => r.id === patternId)
      if (pattern) relationshipIds.add(pattern.id)
    } else if (nodeId.startsWith('arg_') || nodeId.startsWith('rel_')) {
      const relId = nodeId.replace(/^(arg_|rel_)/, '')
      relationshipIds.add(relId)
      const prov = analysis.relationshipProvenance[relId]
      if (prov) {
        prov.sourceIds.forEach((s) => sourceIds.add(s))
        prov.claimIds.forEach((c) => claimIds.add(c))
        evidenceRefs.push(...prov.evidenceRefs)
      }
    }
  }

  if (claimIds.size === 0 && relationshipIds.size === 0) return null

  const texts: string[] = []
  for (const cid of claimIds) {
    const claim = analysis.claims.find((c) => c.id === cid)
    if (claim) texts.push(claim.statement)
  }
  for (const rid of relationshipIds) {
    const rel = analysis.verifiedRelationships.find((r) => r.id === rid)
    if (rel) texts.push(rel.explanation)
  }

  const reasoningLevel: ReasoningLevel =
    relationshipIds.size > 0 || claimIds.size >= 2 ? 'SYNTHESIZED' : 'SUPPORTED'

  return {
    id: `combined_${nodeIds.join('_').slice(0, 48)}`,
    text: texts.join(' · ').slice(0, 400),
    reasoningLevel,
    sourceIds: [...sourceIds],
    claimIds: [...claimIds],
    relationshipIds: [...relationshipIds],
    evidenceRefs,
  }
}
