import { z } from 'zod'
import OpenAI from 'openai'
import { AI_CONFIG, getOpenAIApiKey } from '@/lib/ai/config'
import { getAIProvider } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import type { Source, SourceAnalysis } from '@/lib/types/source'
import type { SectionKnowledge } from '@/lib/types/video-knowledge'
import type { TranscriptSection } from '@/lib/pipeline/section-builder'
import { mapWithConcurrency } from '@/lib/utils/concurrency'

const SectionCoverageSchema = z.object({
  sectionId: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  topic: z.string(),
  summary: z.string(),
  claims: z.array(
    z.object({
      id: z.string(),
      statement: z.string(),
      topic: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  entities: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
    }),
  ),
  importanceScore: z.number().min(0).max(1),
  noveltyScore: z.number().min(0).max(1),
  argumentDensity: z.number().min(0).max(1),
  evidenceDensity: z.number().min(0).max(1),
})

const COVERAGE_SYSTEM = `You perform a FAST COVERAGE PASS on one section of a YouTube video transcript.

This is NOT the final deep analysis. Your job is to map what exists in this time range.

Extract:
- topic (short label)
- summary (2-4 sentences)
- claims (atomic statements with ids like "{sourceId}_sec{N}_claim_{K}")
- entities mentioned
- importanceScore: how central this section is to the video's argument (0-1)
- noveltyScore: how novel/surprising vs generic (0-1)
- argumentDensity: how argument-heavy vs filler (0-1)
- evidenceDensity: how much concrete evidence/examples (0-1)

Do NOT invent content not present in the transcript.
Return valid JSON.`

export async function runCoveragePass(input: {
  source: Source
  sections: TranscriptSection[]
}): Promise<{ sections: SectionKnowledge[]; failedSectionIds: string[] }> {
  const openai = new OpenAI({ apiKey: getOpenAIApiKey() })
  const failedSectionIds: string[] = []

  const results = await mapWithConcurrency(
    input.sections,
    AI_CONFIG.maxConcurrency,
    async (section, index) => {
      const user = `sourceId: ${input.source.sourceId}
sectionId: ${section.sectionId}
timeRange: ${Math.floor(section.startTime)}s – ${Math.floor(section.endTime)}s
sectionIndex: ${index + 1} of ${input.sections.length}
title: ${input.source.title}

Transcript section:
[${Math.floor(section.startTime)}s] ${section.text}`

      try {
        const parsed = await callStructured({
          openai,
          role: 'coverage',
          operation: 'VIDEO_COVERAGE',
          system: COVERAGE_SYSTEM,
          user,
          schema: SectionCoverageSchema,
          schemaName: 'section_coverage',
          youtubeVideoId: input.source.videoId,
        })

        return {
          ...parsed,
          sectionId: section.sectionId,
          startTime: section.startTime,
          endTime: section.endTime,
          deepAnalyzed: false,
        } satisfies SectionKnowledge
      } catch {
        failedSectionIds.push(section.sectionId)
        return {
          sectionId: section.sectionId,
          startTime: section.startTime,
          endTime: section.endTime,
          topic: 'unknown',
          summary: section.text.slice(0, 400),
          claims: [],
          entities: [],
          importanceScore: 0.3,
          noveltyScore: 0.2,
          argumentDensity: 0.2,
          evidenceDensity: 0.2,
          deepAnalyzed: false,
        } satisfies SectionKnowledge
      }
    },
  )

  return { sections: results, failedSectionIds }
}

export async function runDeepSectionAnalysis(input: {
  source: Source
  section: SectionKnowledge
  transcriptText: string
}): Promise<SourceAnalysis> {
  const ai = getAIProvider()

  return ai.analyzeSource({
    source: input.source,
    transcript: [{ start: input.section.startTime, text: input.transcriptText }],
    operation: 'VIDEO_DEEP_ANALYSIS',
  })
}
