import { z } from 'zod'
import OpenAI from 'openai'
import { getOpenAIApiKey } from '@/lib/ai/config'
import { callStructured } from '@/lib/ai/structured-call'
import { transcriptPayloadForAi } from '@/lib/compose/build-compose-input'
import { validateAllClips } from '@/lib/compose/validate-clips'
import {
  getSynthesisHeadline,
  type Composition,
  type CompositionClip,
  type CompositionClipRole,
  type CompositionInterlude,
  type CompositionSection,
  type CompositionSectionType,
  type CompositionTimelineItem,
  type ComposeSourceContext,
  type CompositionDocument,
} from '@/lib/types/composition'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { getSynthesisTopic } from '@/lib/types/analysis'
import type { TranscriptSegment } from '@/lib/youtube/transcript'

const ComposeClipSchema = z.object({
  sourceId: z.string(),
  startSeconds: z.number(),
  endSeconds: z.number(),
  quote: z.string(),
  reason: z.string(),
  role: z.enum(['common_ground', 'counterpoint', 'evidence', 'synthesis', 'context', 'conclusion']),
})

const ComposeInterludeSchema = z.object({
  text: z.string(),
  kind: z.enum(['interlude', 'synthesis']),
  durationSeconds: z.number().min(3).max(30),
})

const ComposeSectionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'agreement',
    'disagreement',
    'evidence',
    'counterpoint',
    'insight',
    'conclusion',
    'common_ground',
    'split',
    'emerging',
  ]),
  title: z.string(),
  summary: z.string(),
  clips: z.array(ComposeClipSchema),
  interludes: z.array(ComposeInterludeSchema).optional(),
})

const ComposeResultSchema = z.object({
  title: z.string(),
  thesis: z.string(),
  sections: z.array(ComposeSectionSchema).min(1),
  conclusion: z.string(),
})

export async function runComposeEngine(input: {
  document: SynthesisDocument
  sources: ComposeSourceContext[]
  instruction?: string
}): Promise<Composition> {
  const { document, sources, instruction } = input
  const result = document.result
  if (!result) throw new Error('Synthesis result required for composition.')

  const transcripts = new Map<string, TranscriptSegment[]>(
    sources.map((s) => [s.sourceId, s.segments]),
  )

  const sourceById = new Map(sources.map((s) => [s.sourceId, s]))

  const openai = new OpenAI({ apiKey: getOpenAIApiKey() })

  const system = `You compose a narrative video thread from multiple YouTube sources.

RULES:
- Choose clip timestamps ONLY from provided transcript segments (start + duration bounds).
- Never invent timestamps outside segment ranges.
- Clips should be 8-45 seconds when possible.
- Build a editorial narrative: common ground → split → evidence → emerging idea → conclusion.
- Insert interludes only when they connect clips meaningfully — not generic AI filler.
- Use sourceId exactly as provided.
- Prefer clips with clear spoken quotes.
- Return valid JSON only.`

  const user = `Synthesis topic: ${getSynthesisTopic(result)}
Headline: ${getSynthesisHeadline(result)}
Bottom line: ${result.synthesis.bottomLine}
Emergent: ${result.synthesis.emergentStatement}

Synthesis sections:
${JSON.stringify(result.synthesis.sections.slice(0, 8), null, 2)}

Sources with transcript segments:
${JSON.stringify(transcriptPayloadForAi(sources), null, 2)}

${instruction ? `User instruction: ${instruction}` : 'Compose a 2-4 minute narrative explaining where these voices agree and disagree.'}`

  const parsed = await callStructured({
    openai,
    role: 'synthesis',
    operation: 'COMPOSE',
    system,
    user,
    schema: ComposeResultSchema,
    schemaName: 'composition',
  })

  return materializeComposition(parsed, sourceById, transcripts)
}

function materializeComposition(
  parsed: z.infer<typeof ComposeResultSchema>,
  sourceById: Map<string, ComposeSourceContext>,
  transcripts: Map<string, TranscriptSegment[]>,
): Composition {
  const sections: CompositionSection[] = []
  let totalDuration = 0

  parsed.sections.forEach((section, sectionIndex) => {
    const { clips: validated } = validateAllClips(
      section.clips.map((c) => ({
        sourceId: c.sourceId,
        startSeconds: c.startSeconds,
        endSeconds: c.endSeconds,
        quote: c.quote,
        reason: c.reason,
        role: c.role,
      })),
      transcripts,
    )

    const items: CompositionTimelineItem[] = []

    for (const clip of validated) {
      const source = sourceById.get(clip.sourceId)
      if (!source) continue

      const compositionClip: CompositionClip = {
        id: `clip_${section.id}_${items.length + 1}`,
        sourceId: clip.sourceId,
        voiceIndex: source.voiceIndex,
        youtubeId: source.youtubeId,
        title: source.title,
        channel: source.channel,
        thumbnail: source.thumbnail,
        startSeconds: clip.startSeconds,
        endSeconds: clip.endSeconds,
        quote: clip.quote,
        reason: clip.reason,
        role: clip.role as CompositionClipRole,
      }

      items.push({ kind: 'clip', clip: compositionClip })
      totalDuration += Math.max(1, compositionClip.endSeconds - compositionClip.startSeconds)
    }

    for (const interlude of section.interludes ?? []) {
      const item: CompositionInterlude = {
        id: `interlude_${section.id}_${items.length + 1}`,
        text: interlude.text,
        kind: interlude.kind,
        durationSeconds: interlude.durationSeconds,
      }
      items.push({ kind: 'interlude', interlude: item })
      totalDuration += item.durationSeconds
    }

    if (items.length === 0) return

    sections.push({
      id: section.id || `section_${sectionIndex + 1}`,
      type: section.type as CompositionSectionType,
      title: section.title,
      summary: section.summary,
      order: sectionIndex + 1,
      items,
    })
  })

  if (sections.length === 0) {
    throw new Error('No valid clips could be composed from transcripts.')
  }

  return {
    title: parsed.title,
    thesis: parsed.thesis,
    sections,
    conclusion: parsed.conclusion,
    totalDurationSeconds: Math.round(totalDuration),
  }
}

export function createCompositionDocument(
  synthesisId: string,
  document: SynthesisDocument,
): CompositionDocument {
  return {
    id: synthesisId,
    synthesisId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    synthesisTopic: document.result ? getSynthesisTopic(document.result) : document.topic,
    voiceCount: document.voices.filter((v) => v.analysis && !v.error).length,
  }
}
