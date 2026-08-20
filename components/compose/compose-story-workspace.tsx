'use client'

import { useEffect, useMemo, useState } from 'react'
import { ComposeSelectedEditor } from '@/components/compose/compose-selected-editor'
import { ComposeStoryboard } from '@/components/compose/compose-storyboard'
import { moveTimelineItem } from '@/lib/compose/reorder-composition'
import {
  buildStoryboardRows,
  type StoryboardSelection,
} from '@/lib/compose/storyboard-rows'
import { formatTimestamp } from '@/lib/youtube/timestamp'
import type { Composition } from '@/lib/types/composition'
import type { TranscriptSegment } from '@/lib/youtube/transcript'

type TranscriptSource = {
  sourceId: string
  segments: TranscriptSegment[]
}

type Props = {
  composition: Composition
  transcripts: Record<string, TranscriptSource>
  onUpdateComposition: (composition: Composition) => void
  onPreview: () => void
}

export function ComposeStoryWorkspace({
  composition,
  transcripts,
  onUpdateComposition,
  onPreview,
}: Props) {
  const rows = useMemo(() => buildStoryboardRows(composition), [composition])
  const [selected, setSelected] = useState<StoryboardSelection | null>(null)
  const [drag, setDrag] = useState<StoryboardSelection | null>(null)
  const [dropTarget, setDropTarget] = useState<StoryboardSelection | null>(null)

  useEffect(() => {
    if (rows.length === 0) {
      setSelected(null)
      return
    }
    if (
      !selected ||
      !rows.some(
        (r) => r.sectionId === selected.sectionId && r.itemIndex === selected.itemIndex,
      )
    ) {
      setSelected({ sectionId: rows[0].sectionId, itemIndex: rows[0].itemIndex })
    }
  }, [rows, selected])

  const selectedRow = useMemo(() => {
    if (!selected) return null
    return (
      rows.find(
        (r) => r.sectionId === selected.sectionId && r.itemIndex === selected.itemIndex,
      ) ?? null
    )
  }, [rows, selected])

  function handlePointerUp() {
    if (drag && dropTarget) {
      onUpdateComposition(
        moveTimelineItem(composition, drag, dropTarget),
      )
    }
    setDrag(null)
    setDropTarget(null)
  }

  const sceneCount = rows.length

  return (
    <section
      className="mx-auto max-w-[1280px]"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="mono-label text-[10px] text-ink-soft">INSIGHT STORY</span>
          <h2 className="mt-2 font-serif text-2xl font-medium md:text-3xl">Make a story</h2>
          <p className="mt-2 max-w-xl font-serif text-sm text-ink-soft">
            Arrange source scenes around what emerges — drag to reorder, click to trim.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="mono text-[11px] text-ink-soft">
            {sceneCount} scene{sceneCount === 1 ? '' : 's'} · {formatTimestamp(composition.totalDurationSeconds)}
          </p>
          <button
            type="button"
            onClick={onPreview}
            className="mono-label bg-ink px-6 py-3 text-[10px] text-background transition-opacity hover:opacity-90"
          >
            PREVIEW STORY ▶
          </button>
        </div>
      </div>

      <ComposeStoryboard
        composition={composition}
        selected={selected}
        drag={drag}
        dropTarget={dropTarget}
        onSelect={setSelected}
        onDragStart={setDrag}
        onDragOver={setDropTarget}
      />

      <div className="mt-6">
        <ComposeSelectedEditor
          composition={composition}
          row={selectedRow}
          transcripts={transcripts}
          onUpdateComposition={onUpdateComposition}
        />
      </div>
    </section>
  )
}
