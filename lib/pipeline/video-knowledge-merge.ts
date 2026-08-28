import type { SectionKnowledge } from '@/lib/types/video-knowledge'
import type { SourceAnalysis } from '@/lib/types/source'
import type { Evidence } from '@/lib/types/analysis'
import type { StructuredClaim } from '@/lib/types/relationship'
import { ANALYSIS_SCHEMA_VERSION, ANALYSIS_VERSION } from '@/lib/ai/config'
import { mergeChunkAnalyses } from '@/lib/pipeline/merge-chunk-claims'

const MAX_MERGED_CLAIMS = 36

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

function enrichSectionsWithDeepClaims(
  sections: SectionKnowledge[],
  deepClaims: StructuredClaim[],
): SectionKnowledge[] {
  const bySection = new Map<string, SectionKnowledge['claims']>()
  for (const section of sections) {
    bySection.set(section.sectionId, [...section.claims])
  }

  for (const claim of deepClaims) {
    const segId = claim.sourceSegmentId
    if (!segId) continue
    const list = bySection.get(segId)
    if (!list) continue
    const dup = list.some(
      (c) => normalizeStatement(c.statement) === normalizeStatement(claim.statement),
    )
    if (dup) continue
    list.push({
      id: claim.id,
      statement: claim.statement,
      topic: claim.topic,
      confidence: claim.confidence,
    })
    bySection.set(segId, list)
  }

  return sections.map((s) => ({
    ...s,
    claims: bySection.get(s.sectionId) ?? s.claims,
  }))
}

function dedupeEvidence(items: Evidence[]): Evidence[] {
  const map = new Map<string, Evidence>()
  for (const ev of items) {
    const key = `${Math.floor(ev.timestamp)}:${ev.text.slice(0, 40)}`
    if (!map.has(key)) map.set(key, ev)
  }
  return [...map.values()].sort((a, b) => a.timestamp - b.timestamp)
}

export function selectSectionsForDeepAnalysis(
  sections: SectionKnowledge[],
  maxDeep: number,
): SectionKnowledge[] {
  if (sections.length <= 3) return sections

  const scored = [...sections].sort((a, b) => {
    const scoreA =
      a.importanceScore * 0.4 +
      a.argumentDensity * 0.25 +
      a.evidenceDensity * 0.2 +
      a.noveltyScore * 0.15
    const scoreB =
      b.importanceScore * 0.4 +
      b.argumentDensity * 0.25 +
      b.evidenceDensity * 0.2 +
      b.noveltyScore * 0.15
    return scoreB - scoreA
  })

  return scored.slice(0, Math.min(maxDeep, scored.length))
}

export function mergeHierarchicalAnalysis(input: {
  base: Pick<SourceAnalysis, 'sourceId' | 'videoId' | 'voiceIndex' | 'title'>
  sections: SectionKnowledge[]
  deepPartials: SourceAnalysis[]
  coverageSectionCount: number
  failedSectionIds: string[]
  transcriptDurationSeconds: number
}): SourceAnalysis {
  const { base, sections: inputSections, deepPartials, coverageSectionCount, failedSectionIds } = input

  const sections = inputSections

  const deepMerged =
    deepPartials.length > 0
      ? deepPartials.length === 1
        ? deepPartials[0]
        : mergeChunkAnalyses(deepPartials, base)
      : null

  const enrichedSections = enrichSectionsWithDeepClaims(
    sections,
    deepMerged?.claims ?? [],
  )

  const coverageClaims: StructuredClaim[] = enrichedSections.flatMap((s) =>
    s.claims.map((c) => ({
      id: c.id,
      sourceId: base.sourceId,
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

  const claims = dedupeClaims([...(deepMerged?.claims ?? []), ...coverageClaims]).slice(
    0,
    MAX_MERGED_CLAIMS,
  )
  const sectionEvidence: Evidence[] = enrichedSections.map((s) => ({
    id: `${base.sourceId}_seg_${s.sectionId}`,
    timestamp: s.startTime,
    text: sectionTranscript(s),
    segmentId: s.sectionId,
    endTime: s.endTime,
  }))
  const evidence = dedupeEvidence([...sectionEvidence, ...(deepMerged?.evidence ?? [])]).slice(0, 48)

  const entities = deepMerged?.entities ?? enrichedSections.flatMap((s) => s.entities).slice(0, 20)

  const summaries = enrichedSections.map((s) => s.summary).filter(Boolean)
  const summary =
    deepMerged?.summary ||
    summaries.sort((a, b) => b.length - a.length)[0] ||
    sections.map((s) => `[${Math.floor(s.startTime)}s] ${s.topic}: ${s.summary}`).join(' ')

  const thesis =
    deepMerged?.thesis ||
    enrichedSections
      .filter((s) => s.importanceScore >= 0.5)
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .map((s) => s.summary)
      .slice(0, 2)
      .join(' ') ||
    summary

  const topics = [
    ...new Set([
      ...(deepMerged?.topics ?? []),
      ...enrichedSections.map((s) => s.topic).filter(Boolean),
      ...claims.map((c) => c.topic),
    ]),
  ].slice(0, 12)

  const analyzedDuration = enrichedSections.reduce(
    (acc, s) => acc + Math.max(0, s.endTime - s.startTime),
    0,
  )
  const deepAnalyzed = enrichedSections.filter((s) => s.deepAnalyzed).length
  const analyzedCharCount = enrichedSections.reduce(
    (n, s) => n + s.summary.length + s.claims.length * 40,
    0,
  )

  return {
    sourceId: base.sourceId,
    videoId: base.videoId,
    voiceIndex: base.voiceIndex,
    title: base.title,
    summary,
    thesis,
    topics,
    claims,
    entities,
    conclusions: deepMerged?.conclusions ?? [],
    implications: deepMerged?.implications ?? [],
    evidence,
    stance: deepMerged?.stance ?? null,
    coverage: {
      transcriptDurationSeconds: input.transcriptDurationSeconds,
      analyzedDurationSeconds: Math.round(analyzedDuration),
      coverageRatio:
        input.transcriptDurationSeconds > 0
          ? Math.min(1, analyzedDuration / input.transcriptDurationSeconds)
          : sections.length > 0
            ? 1
            : 0,
      sectionCount: enrichedSections.length,
      coverageSectionCount,
      deepAnalyzedSectionCount: deepAnalyzed,
      failedSectionIds: failedSectionIds.length > 0 ? failedSectionIds : undefined,
      analyzedCharCount,
    },
    videoKnowledge: {
      sections: enrichedSections,
      coverage: {
        transcriptDurationSeconds: input.transcriptDurationSeconds,
        analyzedDurationSeconds: Math.round(analyzedDuration),
        coverageRatio:
          input.transcriptDurationSeconds > 0
            ? Math.min(1, analyzedDuration / input.transcriptDurationSeconds)
            : 1,
        sectionCount: enrichedSections.length,
        coverageSectionCount,
        deepAnalyzedSectionCount: deepAnalyzed,
        failedSectionIds: failedSectionIds.length > 0 ? failedSectionIds : undefined,
      },
      analysisVersion: ANALYSIS_VERSION,
      schemaVersion: ANALYSIS_SCHEMA_VERSION,
    },
  }
}
