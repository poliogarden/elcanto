import type { Composition, CompositionTimelineItem } from '@/lib/types/composition'

export type StoryboardRow = {
  sectionId: string
  itemIndex: number
  item: CompositionTimelineItem
  startsAt: number
  endsAt: number
  durationSeconds: number
}

export type StoryboardSelection = {
  sectionId: string
  itemIndex: number
}

export function selectionKey(sel: StoryboardSelection): string {
  return `${sel.sectionId}:${sel.itemIndex}`
}

export function buildStoryboardRows(composition: Composition): StoryboardRow[] {
  const rows: StoryboardRow[] = []
  let cursor = 0

  for (const section of [...composition.sections].sort((a, b) => a.order - b.order)) {
    section.items.forEach((item, itemIndex) => {
      const durationSeconds =
        item.kind === 'clip'
          ? Math.max(1, item.clip.endSeconds - item.clip.startSeconds)
          : item.interlude.durationSeconds
      rows.push({
        sectionId: section.id,
        itemIndex,
        item,
        startsAt: cursor,
        endsAt: cursor + durationSeconds,
        durationSeconds,
      })
      cursor += durationSeconds
    })
  }

  return rows
}

export function clipDurationSeconds(item: CompositionTimelineItem): number {
  if (item.kind === 'clip') {
    return Math.max(1, item.clip.endSeconds - item.clip.startSeconds)
  }
  return item.interlude.durationSeconds
}
