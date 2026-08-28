import type { StructuredClaim } from '@/lib/types/relationship'
import type { SourceAnalysis } from '@/lib/types/source'
import type { SectionKnowledge } from '@/lib/types/video-knowledge'
import type { Evidence } from '@/lib/types/analysis'
import { getCachedTranscript } from '@/lib/repositories/video-cache'
import { buildTranscriptSections } from '@/lib/pipeline/section-builder'
import type { TranscriptSection } from '@/lib/pipeline/section-builder'
import { runCoveragePass } from '@/lib/pipeline/hierarchical-analyze'
import {
  aggregateExtractionCoverage,
  buildExtractionCoverageDiagnostics,
  type ExtractionCoverageDiagnostics,
} from '@/lib/pipeline/extraction-diagnostics'
import { ANALYSIS_SCHEMA_VERSION, ANALYSIS_VERSION } from '@/lib/ai/config'
import type { Source } from '@/lib/types/source'

function normalizeStatement(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function dedupeClaims(claims: StructuredClaim[]): StructuredClaim[] {
  const byId = new Map<string, StructuredClaim>()
  for (const claim of claims) {
    const existing = byId.get(claim.id)
    if (!existing || claim.confidence > existing.confidence) {
      byId.set(claim.id, claim)
    }
  }
  const kept: StructuredClaim[] = []
  for (const claim of byId.values()) {
    const key = normalizeStatement(claim.statement)
    const dup = kept.find((k) => normalizeStatement(k.statement) === key)
    if (!dup) kept.push(claim)
    else if (claim.confidence > dup.confidence) {
      const idx = kept.indexOf(dup)
      kept[idx] = claim
    }
  }
  return kept
}

function sectionTranscript(s: SectionKnowledge): string {
  return (s.text?.trim() ? s.text : s.summary).trim()
}

function coverageClaimsFromSections(
  sourceId: string,
  sections: SectionKnowledge[],
): StructuredClaim[] {
  return sections.flatMap((s) =>
    s.claims.map((c) => ({
      id: c.id,
      sourceId,
      statement: c.statement,
      topic: c.topic,
      confidence: c.confidence,
      evidenceSummary: sectionTranscript(s).slice(0, 280),
      sourceSegmentId: s.sectionId,
      evidenceSegmentIds: [s.sectionId],
      segmentStartTime: s.startTime,
      segmentEndTime: s.endTime,
    })),
  )
}

function isDeepMergeClaim(claim: StructuredClaim): boolean {
  return /^source_\d+_claim_\d+$/.test(claim.id)
}

export function applyRefreshedCoverageToAnalysis(
  analysis: SourceAnalysis,
  sections: SectionKnowledge[],
): SourceAnalysis {
  const coverageClaims = coverageClaimsFromSections(analysis.sourceId, sections)
  const deepClaims = analysis.claims.filter(isDeepMergeClaim)
  const claims = dedupeClaims([...deepClaims, ...coverageClaims]).slice(0, 36)

  const sectionEvidence: Evidence[] = sections.map((s) => ({
    id: `${analysis.sourceId}_seg_${s.sectionId}`,
    timestamp: s.startTime,
    text: sectionTranscript(s),
    segmentId: s.sectionId,
    endTime: s.endTime,
  }))

  const existingEvidence = analysis.evidence ?? []
  const evidenceByKey = new Map<string, Evidence>()
  for (const ev of [...sectionEvidence, ...existingEvidence]) {
    const key = `${ev.segmentId ?? ev.id}:${Math.floor(ev.timestamp)}`
    if (!evidenceByKey.has(key)) evidenceByKey.set(key, ev)
  }

  return {
    ...analysis,
    claims,
    evidence: [...evidenceByKey.values()].sort((a, b) => a.timestamp - b.timestamp).slice(0, 48),
    videoKnowledge: analysis.videoKnowledge
      ? {
          ...analysis.videoKnowledge,
          sections,
        }
      : {
          sections,
          coverage: {
            transcriptDurationSeconds: analysis.coverage?.transcriptDurationSeconds ?? 0,
            analyzedDurationSeconds: analysis.coverage?.analyzedDurationSeconds ?? 0,
            coverageRatio: analysis.coverage?.coverageRatio ?? 1,
            sectionCount: sections.length,
            coverageSectionCount: sections.length,
            deepAnalyzedSectionCount: sections.filter((s) => s.deepAnalyzed).length,
          },
          analysisVersion: ANALYSIS_VERSION,
          schemaVersion: ANALYSIS_SCHEMA_VERSION,
        },
  }
}

export async function refreshClaimExtractionForEval(
  analyses: SourceAnalysis[],
  options?: { sourceIds?: string[] },
): Promise<{
  analyses: SourceAnalysis[]
  extractionCoverage: ExtractionCoverageDiagnostics
  perSource: ExtractionCoverageDiagnostics[]
}> {
  const refreshed: SourceAnalysis[] = []
  const perSource: ExtractionCoverageDiagnostics[] = []

  const targetIds = options?.sourceIds

  for (const analysis of analyses) {
    if (targetIds && !targetIds.includes(analysis.sourceId)) {
      refreshed.push(analysis)
      if (analysis.videoKnowledge?.sections) {
        perSource.push(
          buildExtractionCoverageDiagnostics({
            sourceId: analysis.sourceId,
            sections: analysis.videoKnowledge.sections,
            failedSectionIds: analysis.coverage?.failedSectionIds,
          }),
        )
      }
      continue
    }

    const segments = await getCachedTranscript(analysis.videoId)
    const oldSections = analysis.videoKnowledge?.sections ?? []

    const transcriptSections: TranscriptSection[] =
      segments?.length
        ? buildTranscriptSections(segments)
        : oldSections.map((s) => ({
            sectionId: s.sectionId,
            startTime: s.startTime,
            endTime: s.endTime,
            text: (s.text?.trim() ? s.text : s.summary).trim(),
          }))

    if (transcriptSections.length === 0) {
      refreshed.push(analysis)
      if (analysis.videoKnowledge?.sections) {
        perSource.push(
          buildExtractionCoverageDiagnostics({
            sourceId: analysis.sourceId,
            sections: analysis.videoKnowledge.sections,
            failedSectionIds: analysis.coverage?.failedSectionIds,
          }),
        )
      }
      continue
    }

    const source: Source = {
      sourceId: analysis.sourceId,
      videoId: analysis.videoId,
      voiceIndex: analysis.voiceIndex,
      title: analysis.title,
      channel: '',
      url: '',
    }

    const oldById = new Map(oldSections.map((s) => [s.sectionId, s]))

    const { sections: coverageSections, failedSectionIds } = await runCoveragePass({
      source,
      sections: transcriptSections,
    })

    const mergedSections: SectionKnowledge[] = coverageSections.map((s) => {
      const old = oldById.get(s.sectionId)
      const transcript = transcriptSections.find((t) => t.sectionId === s.sectionId)
      return {
        ...s,
        text: old?.text ?? transcript?.text ?? s.text,
        deepAnalyzed: old?.deepAnalyzed ?? false,
      }
    })

    perSource.push(
      buildExtractionCoverageDiagnostics({
        sourceId: analysis.sourceId,
        sections: mergedSections,
        failedSectionIds,
      }),
    )

    refreshed.push(applyRefreshedCoverageToAnalysis(analysis, mergedSections))
  }

  return {
    analyses: refreshed,
    extractionCoverage: aggregateExtractionCoverage(perSource),
    perSource,
  }
}
