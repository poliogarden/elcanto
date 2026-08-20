import type {
  Composition,
  CompositionClip,
  CompositionInterlude,
  CompositionSection,
  CompositionTimelineItem,
} from '@/lib/types/composition'

export type TimelineLocation = {
  sectionId: string
  itemIndex: number
}

function recalcTotal(composition: Composition): Composition {
  let total = 0
  for (const section of composition.sections) {
    for (const item of section.items) {
      total +=
        item.kind === 'clip'
          ? Math.max(1, item.clip.endSeconds - item.clip.startSeconds)
          : item.interlude.durationSeconds
    }
  }
  return { ...composition, totalDurationSeconds: Math.round(total) }
}

export function moveTimelineItem(
  composition: Composition,
  from: TimelineLocation,
  to: TimelineLocation,
): Composition {
  const sections = composition.sections.map((s) => ({ ...s, items: [...s.items] }))
  const fromSection = sections.find((s) => s.id === from.sectionId)
  const toSection = sections.find((s) => s.id === to.sectionId)
  if (!fromSection || !toSection) return composition

  const [item] = fromSection.items.splice(from.itemIndex, 1)
  if (!item) return composition

  let insertAt = to.itemIndex
  if (from.sectionId === to.sectionId && from.itemIndex < to.itemIndex) {
    insertAt = to.itemIndex
  }
  toSection.items.splice(insertAt, 0, item)

  return recalcTotal({ ...composition, sections })
}

export function updateClipInComposition(
  composition: Composition,
  clipId: string,
  patch: Partial<CompositionClip>,
): Composition {
  const sections = composition.sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.kind === 'clip' && item.clip.id === clipId
        ? { kind: 'clip' as const, clip: { ...item.clip, ...patch } }
        : item,
    ),
  }))
  return recalcTotal({ ...composition, sections })
}

export function updateInterludeInComposition(
  composition: Composition,
  interludeId: string,
  patch: Partial<CompositionInterlude>,
): Composition {
  const sections = composition.sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.kind === 'interlude' && item.interlude.id === interludeId
        ? { kind: 'interlude' as const, interlude: { ...item.interlude, ...patch } }
        : item,
    ),
  }))
  return recalcTotal({ ...composition, sections })
}

export function flattenTimelineItems(composition: Composition): Array<{
  section: CompositionSection
  item: CompositionTimelineItem
  itemIndex: number
}> {
  const rows: Array<{
    section: CompositionSection
    item: CompositionTimelineItem
    itemIndex: number
  }> = []

  for (const section of [...composition.sections].sort((a, b) => a.order - b.order)) {
    section.items.forEach((item, itemIndex) => {
      rows.push({ section, item, itemIndex })
    })
  }

  return rows
}
