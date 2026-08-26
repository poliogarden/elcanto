import type { AnalysisResult } from '@/lib/reasoning/analysis-result'
import type { TimestampAvailability } from '@/lib/reasoning/provenance-types'

export type ArtifactSourceSegment = {
  sourceId: string
  videoId: string
  voiceIndex: number
  timestampStart: number | null
  timestampEnd: number | null
  timestampAvailability: TimestampAvailability
  evidenceId: string
  text: string
  reason: string
}

export type ArtifactPlan = {
  selectedNodeIds: string[]
  narrative: string[]
  sourceSegments: ArtifactSourceSegment[]
  missingTimestampRefs: string[]
  synthesisText: string
}

/**
 * Plan a future video artifact from selected nodes.
 * Never fabricates timestamps — marks unavailable explicitly.
 */
export function buildArtifactPlan(
  analysis: AnalysisResult,
  selectedNodeIds: string[],
  synthesisText?: string,
): ArtifactPlan {
  const segments: ArtifactSourceSegment[] = []
  const missingTimestampRefs: string[] = []
  const narrative: string[] = []

  for (const nodeId of selectedNodeIds) {
    if (nodeId.startsWith('claim_')) {
      const claimId = nodeId.replace(/^claim_/, '')
      const prov = analysis.claimProvenance[claimId]
      const claim = analysis.claims.find((c) => c.id === claimId)
      if (claim) narrative.push(claim.statement)
      if (prov) {
        for (const ref of prov.evidenceRefs) {
          if (ref.timestampAvailability === 'unavailable') {
            missingTimestampRefs.push(ref.evidenceId)
          }
          segments.push({
            sourceId: ref.sourceId,
            videoId: ref.videoId,
            voiceIndex: prov.voiceIndex,
            timestampStart: ref.timestampStart,
            timestampEnd: ref.timestampEnd,
            timestampAvailability: ref.timestampAvailability,
            evidenceId: ref.evidenceId,
            text: ref.text,
            reason: `Evidence for claim ${claimId}`,
          })
        }
      }
    }
  }

  return {
    selectedNodeIds,
    narrative,
    sourceSegments: segments,
    missingTimestampRefs,
    synthesisText: synthesisText ?? narrative.join('\n'),
  }
}
