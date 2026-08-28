import { z } from 'zod'
import OpenAI from 'openai'
import { AI_CONFIG, coverageBatchSizeForAnalysis, getOpenAIApiKey } from '@/lib/ai/config'
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

const BatchSectionCoverageSchema = z.object({
  sections: z.array(SectionCoverageSchema),
})

const COVERAGE_SYSTEM = `You perform a HIGH-RECALL COVERAGE PASS on one section of a YouTube video transcript.

This is NOT a summary task. Downstream relevance and verification filters exist — your job is to preserve atomic, evidence-grounded propositions from this time range.

GOAL: extract as many faithful atomic claims as the transcript supports. Prefer recall over aggressive pruning.

For each section extract:
- topic (short label)
- summary (2-4 sentences — orientation only; NOT a substitute for claims)
- claims: atomic propositions grounded in the transcript
- entities mentioned
- importanceScore, noveltyScore, argumentDensity, evidenceDensity (0-1)

CLAIM RULES:
- Use ids: "{sourceId}_sec{N}_claim_{K}" (N = section number from sectionId)
- One proposition per claim — do NOT merge multiple ideas into one broad claim
- If the transcript contains multiple comparisons, mechanisms, or causes, output multiple claims
- Preserve comparative structure: keep A vs B, more/less, faster/slower, easier/harder, requires/avoids, compared with, unlike, instead of
- Preserve explicit causal structure when the speaker states it: because, leads to, enabled, spread because (do NOT invent causation not in transcript)
- Include definition, mechanism, comparison, cause/effect, advantage, limitation, adoption reason, technical capability, workflow change, market implication when present
- Do NOT generalize "MCP requires less expertise than API" into "MCP is useful"
- Do NOT convert section summaries into factual claims without transcript support
- Do NOT invent hype, market dominance, or adoption facts absent from transcript

If the section has meaningful comparative/mechanistic/causal content, claims[] should NOT be empty.
If the section is filler/intro with no proposition, claims[] may be empty.

Do NOT invent content not present in the transcript.
Return valid JSON.`

const BATCH_COVERAGE_SYSTEM = `You perform a HIGH-RECALL COVERAGE PASS on multiple sections of a YouTube video transcript.

This is NOT a summary task. Analyze each section independently.

For every section in the input, return one matching entry in sections[] with the same sectionId, startTime, and endTime.

Per section extract:
- topic, summary (orientation only)
- claims: atomic evidence-grounded propositions (ids like "{sourceId}_sec{N}_claim_{K}")
- entities
- importanceScore, noveltyScore, argumentDensity, evidenceDensity (0-1)

CLAIM RULES (apply to every section):
- One proposition per claim; never merge multiple ideas into one broad summary claim
- Preserve comparisons (A vs B, more/less, faster, easier, compared with, unlike, instead of)
- Preserve explicit causal statements from the speaker (because, leads to — only when stated)
- Extract definition, mechanism, comparison, cause, effect, advantage, limitation, observation, adoption reason, technical capability, workflow change, market implication when present
- High recall: if meaningful propositions exist, claims[] must not be empty
- Do NOT hallucinate; do NOT turn summaries into unsupported facts

Do NOT invent content not present in the transcript.
Return valid JSON with all sections.`

export function chunkSectionsForCoverage<T>(sections: T[], batchSize: number): T[][] {
  if (sections.length === 0) return []
  const size = Math.max(1, batchSize)
  const batches: T[][] = []
  for (let i = 0; i < sections.length; i += size) {
    batches.push(sections.slice(i, i + size))
  }
  return batches
}

function fallbackSectionKnowledge(section: TranscriptSection): SectionKnowledge {
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
  }
}

function buildSingleSectionUser(
  source: Source,
  section: TranscriptSection,
  index: number,
  total: number,
): string {
  return `sourceId: ${source.sourceId}
sectionId: ${section.sectionId}
timeRange: ${Math.floor(section.startTime)}s – ${Math.floor(section.endTime)}s
sectionIndex: ${index + 1} of ${total}
title: ${source.title}

Transcript section:
[${Math.floor(section.startTime)}s] ${section.text}`
}

function buildBatchSectionUser(
  source: Source,
  batch: Array<{ section: TranscriptSection; index: number }>,
  total: number,
): string {
  const blocks = batch.map(({ section, index }) => {
    return `--- Section ${index + 1} of ${total} ---
sectionId: ${section.sectionId}
timeRange: ${Math.floor(section.startTime)}s – ${Math.floor(section.endTime)}s

Transcript:
[${Math.floor(section.startTime)}s] ${section.text}`
  })

  return `sourceId: ${source.sourceId}
title: ${source.title}
batchSize: ${batch.length}

Analyze each section below. Return one sections[] entry per sectionId.

${blocks.join('\n\n')}`
}

function mergeParsedSection(
  parsed: z.infer<typeof SectionCoverageSchema>,
  section: TranscriptSection,
): SectionKnowledge {
  return {
    ...parsed,
    sectionId: section.sectionId,
    startTime: section.startTime,
    endTime: section.endTime,
    deepAnalyzed: false,
  }
}

async function runSingleSectionCoverage(input: {
  openai: OpenAI
  source: Source
  section: TranscriptSection
  index: number
  total: number
}): Promise<SectionKnowledge> {
  const parsed = await callStructured({
    openai: input.openai,
    role: 'coverage',
    operation: 'VIDEO_COVERAGE',
    system: COVERAGE_SYSTEM,
    user: buildSingleSectionUser(input.source, input.section, input.index, input.total),
    schema: SectionCoverageSchema,
    schemaName: 'section_coverage',
    youtubeVideoId: input.source.videoId,
  })

  return mergeParsedSection(parsed, input.section)
}

async function runBatchSectionCoverage(input: {
  openai: OpenAI
  source: Source
  batch: Array<{ section: TranscriptSection; index: number }>
  total: number
}): Promise<SectionKnowledge[]> {
  const parsed = await callStructured({
    openai: input.openai,
    role: 'coverage',
    operation: 'VIDEO_COVERAGE',
    system: BATCH_COVERAGE_SYSTEM,
    user: buildBatchSectionUser(input.source, input.batch, input.total),
    schema: BatchSectionCoverageSchema,
    schemaName: 'section_coverage_batch',
    youtubeVideoId: input.source.videoId,
    maxOutputTokens: 1800 * input.batch.length,
  })

  const byId = new Map(parsed.sections.map((section) => [section.sectionId, section]))

  return input.batch.map(({ section }) => {
    const match = byId.get(section.sectionId)
    if (!match) {
      throw new Error(`Batch coverage missing sectionId ${section.sectionId}`)
    }
    return mergeParsedSection(match, section)
  })
}

export async function runCoveragePass(input: {
  source: Source
  sections: TranscriptSection[]
}): Promise<{ sections: SectionKnowledge[]; failedSectionIds: string[] }> {
  const openai = new OpenAI({ apiKey: getOpenAIApiKey() })
  const failedSectionIds: string[] = []
  const batchSize = coverageBatchSizeForAnalysis()
  const indexed = input.sections.map((section, index) => ({ section, index }))
  const batches = chunkSectionsForCoverage(indexed, batchSize)

  const batchResults = await mapWithConcurrency(
    batches,
    AI_CONFIG.maxConcurrency,
    async (batch) => {
      if (batch.length === 1) {
        const { section, index } = batch[0]
        try {
          return [await runSingleSectionCoverage({
            openai,
            source: input.source,
            section,
            index,
            total: input.sections.length,
          })]
        } catch {
          failedSectionIds.push(section.sectionId)
          return [fallbackSectionKnowledge(section)]
        }
      }

      try {
        return await runBatchSectionCoverage({
          openai,
          source: input.source,
          batch,
          total: input.sections.length,
        })
      } catch (error) {
        console.warn(
          `[VIDEO_COVERAGE] batch failed (${batch.length} sections), falling back to single-section calls:`,
          error instanceof Error ? error.message : error,
        )

        return mapWithConcurrency(batch, 2, async ({ section, index }) => {
          try {
            return await runSingleSectionCoverage({
              openai,
              source: input.source,
              section,
              index,
              total: input.sections.length,
            })
          } catch {
            failedSectionIds.push(section.sectionId)
            return fallbackSectionKnowledge(section)
          }
        })
      }
    },
  )

  return { sections: batchResults.flat(), failedSectionIds }
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
