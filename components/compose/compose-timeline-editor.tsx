'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { formatTimestamp } from '@/lib/youtube/timestamp'
import { moveTimelineItem, updateClipInComposition } from '@/lib/compose/reorder-composition'
import { updateClipTimestamps } from '@/lib/compose/render-manifest'
import { validateClipAgainstTranscript } from '@/lib/compose/validate-clips'
import type { Composition, CompositionTimelineItem } from '@/lib/types/composition'
import type { TranscriptSegment } from '@/lib/youtube/transcript'

type TranscriptSource = {
  sourceId: string
  segments: TranscriptSegment[]
}

type Props = {
  composition: Composition
  transcripts: Record<string, TranscriptSource>
  onUpdateComposition: (composition: Composition) => void
}

type TimelineRow = {
  sectionId: string
  sectionTitle: string
  itemIndex: number
  item: CompositionTimelineItem
  startsAt: number
  endsAt: number
}

type DragState =
  | { kind: 'reorder'; sectionId: string; itemIndex: number }
  | { kind: 'scrub-start'; clipId: string; sectionId: string }
  | { kind: 'scrub-end'; clipId: string; sectionId: string }
  | null

function segmentEnd(seg: TranscriptSegment): number {
  return seg.start + seg.duration
}

function clipTimelineLabel(voiceIndex: number): string {
  return `Source ${String(voiceIndex).padStart(2, '0')}`
}

function interludeTimelineLabel(): string {
  return 'Insight'
}

function buildRows(composition: Composition): TimelineRow[] {
  const rows: TimelineRow[] = []
  let cursor = 0

  for (const section of [...composition.sections].sort((a, b) => a.order - b.order)) {
    section.items.forEach((item, itemIndex) => {
      const duration =
        item.kind === 'clip'
          ? Math.max(1, item.clip.endSeconds - item.clip.startSeconds)
          : item.interlude.durationSeconds
      rows.push({
        sectionId: section.id,
        sectionTitle: section.title,
        itemIndex,
        item,
        startsAt: cursor,
        endsAt: cursor + duration,
      })
      cursor += duration
    })
  }

  return rows
}

export function ComposeTimelineEditor({ composition, transcripts, onUpdateComposition }: Props) {
  const [drag, setDrag] = useState<DragState>(null)
  const [dropTarget, setDropTarget] = useState<{ sectionId: string; itemIndex: number } | null>(
    null,
  )
  const trackRef = useRef<HTMLDivElement>(null)

  const rows = useMemo(() => buildRows(composition), [composition])
  const total = Math.max(1, composition.totalDurationSeconds)

  const applyClipScrub = useCallback(
    (clipId: string, sectionId: string, edge: 'start' | 'end', clientX: number) => {
      const track = trackRef.current
      if (!track) return

      const section = composition.sections.find((s) => s.id === sectionId)
      const item = section?.items.find((i) => i.kind === 'clip' && i.clip.id === clipId)
      if (!item || item.kind !== 'clip') return

      const segments = transcripts[item.clip.sourceId]?.segments ?? []
      if (segments.length === 0) return

      const maxSource = segments.reduce((m, s) => Math.max(m, segmentEnd(s)), 0)
      const rect = track.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      const seconds = ratio * maxSource

      const next =
        edge === 'start'
          ? updateClipTimestamps(item.clip, seconds, item.clip.endSeconds)
          : updateClipTimestamps(item.clip, item.clip.startSeconds, seconds)

      const validated = validateClipAgainstTranscript(
        {
          sourceId: next.sourceId,
          startSeconds: next.startSeconds,
          endSeconds: next.endSeconds,
          quote: next.quote,
          reason: next.reason,
          role: next.role,
        },
        segments,
      )

      if (!validated.ok) return

      onUpdateComposition(
        updateClipInComposition(composition, clipId, {
          startSeconds: validated.clip.startSeconds,
          endSeconds: validated.clip.endSeconds,
          quote: validated.clip.quote,
        }),
      )
    },
    [composition, onUpdateComposition, transcripts],
  )

  function handlePointerMove(e: React.PointerEvent) {
    if (!drag) return
    if (drag.kind === 'scrub-start') {
      applyClipScrub(drag.clipId, drag.sectionId, 'start', e.clientX)
    } else if (drag.kind === 'scrub-end') {
      applyClipScrub(drag.clipId, drag.sectionId, 'end', e.clientX)
    }
  }

  function handlePointerUp() {
    if (drag?.kind === 'reorder' && dropTarget) {
      onUpdateComposition(moveTimelineItem(composition, drag, dropTarget))
    }
    setDrag(null)
    setDropTarget(null)
  }

  return (
    <section
      className="border border-line p-5 md:p-8"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <span className="mono-label text-[10px] text-ink-soft">TIMELINE EDITOR</span>
      <p className="mt-2 max-w-2xl font-serif text-sm text-ink-soft">
        Drag blocks to reorder. Drag clip edge handles to scrub start/end within the source
        transcript.
      </p>

      <div ref={trackRef} className="relative mt-8 h-16 border border-line bg-paper-2">
        {rows.map((row) => {
          const widthPct = ((row.endsAt - row.startsAt) / total) * 100
          const leftPct = (row.startsAt / total) * 100
          const isClip = row.item.kind === 'clip'
          const clip = row.item.kind === 'clip' ? row.item.clip : null
          const segments = clip ? transcripts[clip.sourceId]?.segments ?? [] : []
          const maxSource = segments.reduce((m, s) => Math.max(m, segmentEnd(s)), 1)
          const isDrop =
            dropTarget?.sectionId === row.sectionId && dropTarget.itemIndex === row.itemIndex

          return (
            <div
              key={`${row.sectionId}-${row.itemIndex}`}
              className={`absolute top-2 flex h-12 items-center border px-1 text-[9px] uppercase ${
                isClip ? 'border-ink bg-background' : 'border-line bg-paper'
              } ${isDrop ? 'ring-2 ring-ink' : ''}`}
              style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
              draggable
              onDragStart={() =>
                setDrag({ kind: 'reorder', sectionId: row.sectionId, itemIndex: row.itemIndex })
              }
              onDragOver={(e) => {
                e.preventDefault()
                setDropTarget({ sectionId: row.sectionId, itemIndex: row.itemIndex })
              }}
            >
              {isClip && clip && segments.length > 0 && (
                <>
                  <button
                    type="button"
                    aria-label="Adjust clip start"
                    className="absolute left-0 top-0 z-10 h-full w-2 cursor-ew-resize bg-ink/20 hover:bg-ink/50"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setDrag({ kind: 'scrub-start', clipId: clip.id, sectionId: row.sectionId })
                    }}
                  />
                  <button
                    type="button"
                    aria-label="Adjust clip end"
                    className="absolute right-0 top-0 z-10 h-full w-2 cursor-ew-resize bg-ink/20 hover:bg-ink/50"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setDrag({ kind: 'scrub-end', clipId: clip.id, sectionId: row.sectionId })
                    }}
                  />
                  <span className="mx-auto truncate px-2">
                    {clipTimelineLabel(clip.voiceIndex)}
                  </span>
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 bg-line">
                    <div
                      className="h-full bg-ink"
                      style={{
                        marginLeft: `${(clip.startSeconds / maxSource) * 100}%`,
                        width: `${((clip.endSeconds - clip.startSeconds) / maxSource) * 100}%`,
                      }}
                    />
                  </div>
                </>
              )}
              {!isClip && (
                <span className="mx-auto truncate px-2">{interludeTimelineLabel()}</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 font-mono text-[12px] leading-7 text-ink">
        <p>00:00</p>
        <p>│</p>
        {rows.map((row) => (
          <div key={`list-${row.sectionId}-${row.itemIndex}`} className="mb-1">
            <p>
              ├──{' '}
              {row.item.kind === 'clip'
                ? clipTimelineLabel(row.item.clip.voiceIndex)
                : interludeTimelineLabel()}
            </p>
            <p className="pl-6 text-ink-soft">
              {formatTimestamp(row.startsAt)} → {formatTimestamp(row.endsAt)}
            </p>
            {row.item.kind === 'clip' && (
              <p className="pl-6 text-ink-soft">
                {formatTimestamp(row.item.clip.startSeconds)} →{' '}
                {formatTimestamp(row.item.clip.endSeconds)} in source
              </p>
            )}
          </div>
        ))}
        <p>│</p>
        <p>{formatTimestamp(rows.at(-1)?.endsAt ?? composition.totalDurationSeconds)}</p>
      </div>
    </section>
  )
}
