import OpenAI from 'openai'
import { z } from 'zod'
import { getOpenAIApiKey } from '@/lib/ai/config'
import { callStructured } from '@/lib/ai/structured-call'
import { buildStoryPlannerContext } from '@/lib/story/build-story-input'
import { computeClipBounds, estimateBlockDuration } from '@/lib/story/clip-bounds'
import {
  resolveEvidenceById,
  resolveEvidenceForClaim,
} from '@/lib/story/resolve-evidence'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { StoryBlock, StoryMode, StoryPlan } from '@/lib/types/story-plan'

const PlannerBlockSchema = z.object({
  type: z.enum([
    'hook',
    'context',
    'agreement',
    'disagreement',
    'contradiction',
    'parallel',
    'bridge',
    'question',
    'clip',
    'insight',
    'ending',
  ]),
  topText: z.string().nullable(),
  bottomText: z.string().nullable(),
  sourceId: z.string().nullable(),
  claimId: z.string().nullable(),
  evidenceId: z.string().nullable(),
})

const PlannerResultSchema = z.object({
  title: z.string(),
  durationTarget: z.number().min(30).max(90),
  qualityNote: z.string().nullable(),
  blocks: z.array(PlannerBlockSchema).min(3).max(12),
})

const MODE_GUIDANCE: Record<StoryMode, string> = {
  insight: `INSIGHT CUT: HOOK → CONTEXT → clips from multiple sources → CONTRADICTION/CONNECTION bridge → EMERGENT INSIGHT ending.
Use at least 3 different sourceIds in clip blocks. Center on fourthIdea / emergent insight.`,
  debate: `DEBATE CUT: QUESTION → POSITION A clip → VS bridge → POSITION B clip → WHY THEY DIFFER → CONCLUSION.
Use editorialDisagreements and disagreement relationships. Clips must show opposing claims.`,
  funny: `FUNNY CUT: Find irony/contradiction/unexpected agreement from REAL relationships only.
SETUP → clip → BUT THEN bridge → clip → PUNCHLINE observation.
If no genuine funny angle exists, set qualityNote to "No strong funny angle found." and return only hook + insight + ending.`,
  story: `STORY CUT: HOOK → PROBLEM → DEVELOPMENT clips → CONFLICT → RESOLUTION/QUESTION ending.
Clear narrative progression across multiple sources.`,
}

function modeSystemPrompt(mode: StoryMode): string {
  return `You are elcanto's Story Planner — NOT a video editor.

You turn an existing multi-source synthesis into a 30-60 second narrative short (~45s target).

RULES:
- Reuse ONLY provided claimIds, evidenceIds, sourceIds — never invent timestamps or quotes.
- Narrative text (topText/bottomText) must interpret meaning — NOT copy transcript verbatim.
- bottomText = WHAT IT MEANS. Do not use bottomText as subtitles.
- topText = narrative role label (e.g. THEY AGREE, BUT HERE'S THE SPLIT).
- clip blocks MUST include sourceId AND (evidenceId OR claimId).
- Use multiple sources when possible — a story using only one source is weak.
- Clip blocks should be 5-15 seconds of source material (planner picks evidence moment; system computes bounds).
- ${MODE_GUIDANCE[mode]}
- Return valid JSON only.`
}

function enrichBlocks(
  raw: z.infer<typeof PlannerResultSchema>['blocks'],
  doc: SynthesisDocument,
): StoryBlock[] {
  const blocks: StoryBlock[] = []
  let cursor = 0

  raw.forEach((rawBlock, index) => {
    let block: StoryBlock = {
      id: `block_${index + 1}`,
      type: rawBlock.type,
      order: index,
      start: cursor,
      end: cursor,
      topText: rawBlock.topText,
      bottomText: rawBlock.bottomText,
      sourceId: rawBlock.sourceId ?? undefined,
      claimId: rawBlock.claimId ?? undefined,
      evidenceId: rawBlock.evidenceId ?? undefined,
    }

    if (rawBlock.type === 'clip' && rawBlock.sourceId) {
      const resolved =
        rawBlock.evidenceId
          ? resolveEvidenceById(doc, rawBlock.sourceId, rawBlock.evidenceId)
          : rawBlock.claimId
            ? resolveEvidenceForClaim(doc, rawBlock.claimId, rawBlock.sourceId)
            : null

      if (resolved) {
        const bounds = computeClipBounds(resolved.timestamp, resolved.text)
        block = {
          ...block,
          sourceId: resolved.sourceId,
          sourceVideoId: resolved.videoId,
          sourceTitle: resolved.title,
          channelName: resolved.channel,
          originalUrl: resolved.url,
          thumbnail: resolved.thumbnail,
          evidenceId: resolved.evidenceId,
          evidenceText: resolved.text,
          sourceStart: bounds.sourceStart,
          sourceEnd: bounds.sourceEnd,
        }
        const dur = bounds.sourceEnd - bounds.sourceStart
        block.end = cursor + dur
      } else {
        block.end = cursor + estimateBlockDuration('clip', 8)
      }
    } else {
      block.end = cursor + estimateBlockDuration(rawBlock.type)
    }

    cursor = block.end
    blocks.push(block)
  })

  return blocks
}

function countUniqueSources(blocks: StoryBlock[]): number {
  return new Set(blocks.filter((b) => b.sourceId).map((b) => b.sourceId)).size
}

export async function runStoryPlanner(
  doc: SynthesisDocument,
  mode: StoryMode,
): Promise<StoryPlan> {
  if (!doc.result) throw new Error('Synthesis result required.')

  const context = buildStoryPlannerContext(doc, mode)
  const openai = new OpenAI({ apiKey: getOpenAIApiKey() })

  const parsed = await callStructured({
    openai,
    role: 'synthesis',
    operation: 'STORY',
    system: modeSystemPrompt(mode),
    user: `Plan a ${mode} story from this synthesis:\n${JSON.stringify(context, null, 2)}`,
    schema: PlannerResultSchema,
    schemaName: 'story_plan',
  })

  const blocks = enrichBlocks(parsed.blocks, doc)
  const sourceCount = countUniqueSources(blocks)

  return {
    mode,
    title: parsed.title,
    durationTarget: parsed.durationTarget,
    qualityNote: parsed.qualityNote,
    blocks,
    sourceCount,
  }
}
