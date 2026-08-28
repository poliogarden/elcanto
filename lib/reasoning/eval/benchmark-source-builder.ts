import type { SourceAnalysis } from '@/lib/types/source'
import type { SectionKnowledge, VideoKnowledgeMeta } from '@/lib/types/video-knowledge'
import type { Evidence } from '@/lib/types/analysis'
import type { StructuredClaim } from '@/lib/types/relationship'

type BenchmarkSegment = {
  sectionId: string
  startTime: number
  endTime: number
  topic: string
  text: string
  claimStatement: string
  claimTopic: string
}

type BenchmarkSourceConfig = {
  sourceId: string
  videoId: string
  voiceIndex: number
  title: string
  channel: string
  summary: string
  thesis: string
  topics: string[]
  stance?: string
  segments: BenchmarkSegment[]
}

export function buildBenchmarkSource(config: BenchmarkSourceConfig): SourceAnalysis {
  const claims: StructuredClaim[] = []
  const evidence: Evidence[] = []
  const sections: SectionKnowledge[] = []

  for (const seg of config.segments) {
    const evidenceId = `${config.sourceId}_seg_${seg.sectionId}`
    evidence.push({
      id: evidenceId,
      timestamp: seg.startTime,
      text: seg.text,
      segmentId: seg.sectionId,
      endTime: seg.endTime,
    })
    const claimId = `${config.sourceId}_${seg.sectionId}_claim_1`
    claims.push({
      id: claimId,
      sourceId: config.sourceId,
      statement: seg.claimStatement,
      topic: seg.claimTopic,
      confidence: 0.88,
      evidenceSummary: seg.text,
      sourceSegmentId: seg.sectionId,
      segmentStartTime: seg.startTime,
      segmentEndTime: seg.endTime,
    })
    sections.push({
      sectionId: seg.sectionId,
      startTime: seg.startTime,
      endTime: seg.endTime,
      topic: seg.topic,
      summary: seg.text.slice(0, 160),
      text: seg.text,
      claims: [
        {
          id: claimId,
          statement: seg.claimStatement,
          topic: seg.claimTopic,
          confidence: 0.88,
        },
      ],
      entities: [],
      importanceScore: 0.75,
      noveltyScore: 0.4,
      argumentDensity: 0.7,
      evidenceDensity: 0.8,
      deepAnalyzed: true,
    })
  }

  const duration = Math.max(...config.segments.map((s) => s.endTime), 600)
  const videoKnowledge: VideoKnowledgeMeta = {
    sections,
    coverage: {
      transcriptDurationSeconds: duration,
      analyzedDurationSeconds: duration,
      coverageRatio: 1,
      sectionCount: sections.length,
      coverageSectionCount: sections.length,
      deepAnalyzedSectionCount: sections.length,
    },
    analysisVersion: 'benchmark-1.0',
    schemaVersion: '1',
  }

  return {
    sourceId: config.sourceId,
    videoId: config.videoId,
    voiceIndex: config.voiceIndex,
    title: config.title,
    summary: config.summary,
    thesis: config.thesis,
    centralQuestion: config.thesis,
    topics: config.topics,
    claims,
    entities: [],
    conclusions: [config.thesis],
    implications: [],
    evidence,
    stance: config.stance ?? null,
    channel: config.channel,
    videoKnowledge,
  }
}
