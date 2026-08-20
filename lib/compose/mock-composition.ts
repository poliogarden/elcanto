import type {
  Composition,
  CompositionClip,
  CompositionSection,
  CompositionTimelineItem,
} from '@/lib/types/composition'
import type { ComposeSourceContext } from '@/lib/types/composition'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { getSynthesisTopic } from '@/lib/types/analysis'

/** Deterministic fallback when OpenAI is unavailable or for empty runs. */
export function buildMockComposition(
  document: SynthesisDocument,
  sources: ComposeSourceContext[],
): Composition {
  const result = document.result
  const thesis =
    result?.synthesis.bottomLine ??
    'These sources reveal a thread that none of them state alone.'

  const clips: CompositionClip[] = []

  for (const source of sources.slice(0, 6)) {
    const seg = source.segments[0]
    if (!seg) continue

    const end = Math.min(seg.start + seg.duration, seg.start + 20)
    clips.push({
      id: `mock_clip_${source.sourceId}`,
      sourceId: source.sourceId,
      voiceIndex: source.voiceIndex,
      youtubeId: source.youtubeId,
      title: source.title,
      channel: source.channel,
      thumbnail: source.thumbnail,
      startSeconds: seg.start,
      endSeconds: end,
      quote: seg.text.slice(0, 180),
      reason: 'Opening signal from this source.',
      role: clips.length === 0 ? 'common_ground' : 'evidence',
    })
  }

  const sectionItems: CompositionTimelineItem[] = clips.map((clip) => ({ kind: 'clip', clip }))

  sectionItems.splice(1, 0, {
    kind: 'interlude',
    interlude: {
      id: 'mock_interlude_1',
      text: 'But when these arguments are placed next to each other, another possibility appears.',
      kind: 'synthesis',
      durationSeconds: 6,
    },
  })

  const sections: CompositionSection[] = [
    {
      id: 'section_1',
      type: 'common_ground',
      title: 'THE COMMON GROUND',
      summary: 'Where these voices begin in shared territory.',
      order: 1,
      items: sectionItems,
    },
    {
      id: 'section_2',
      type: 'emerging',
      title: 'THE EMERGING IDEA',
      summary: result?.synthesis.emergentStatement ?? 'What becomes visible only in combination.',
      order: 2,
      items: [],
    },
  ]

  const totalDuration = sectionItems.reduce((sum, item) => {
    if (item.kind === 'clip') return sum + Math.max(1, item.clip.endSeconds - item.clip.startSeconds)
    return sum + item.interlude.durationSeconds
  }, 0)

  return {
    title: result ? getSynthesisTopic(result) : 'Composed thread',
    thesis,
    sections,
    conclusion: thesis,
    totalDurationSeconds: Math.round(totalDuration),
  }
}
