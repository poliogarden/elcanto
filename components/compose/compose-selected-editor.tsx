'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { AsterismMark } from '@/components/brand/asterism-mark'
import { updateClipInComposition, updateInterludeInComposition } from '@/lib/compose/reorder-composition'
import { updateClipTimestamps } from '@/lib/compose/render-manifest'
import { validateClipAgainstTranscript } from '@/lib/compose/validate-clips'
import type { StoryboardRow } from '@/lib/compose/storyboard-rows'
import type { Composition } from '@/lib/types/composition'
import { formatTimestamp, youtubeWatchUrl } from '@/lib/youtube/timestamp'
import type { TranscriptSegment } from '@/lib/youtube/transcript'

type TranscriptSource = {
  sourceId: string
  segments: TranscriptSegment[]
}

type Props = {
  composition: Composition
  row: StoryboardRow | null
  transcripts: Record<string, TranscriptSource>
  onUpdateComposition: (composition: Composition) => void
}

function segmentEnd(seg: TranscriptSegment): number {
  return seg.start + seg.duration
}

function transcriptInRange(segments: TranscriptSegment[], start: number, end: number): string {
  return segments
    .filter((seg) => segmentEnd(seg) > start && seg.start < end)
    .map((seg) => seg.text)
    .join(' ')
    .trim()
}

function clipThumbnail(youtubeId: string, thumbnail?: string): string {
  return thumbnail ?? `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`
}

function applyClipPatch(
  composition: Composition,
  clipId: string,
  startSeconds: number,
  endSeconds: number,
  segments: TranscriptSegment[],
  onUpdateComposition: (c: Composition) => void,
): boolean {
  const item = composition.sections
    .flatMap((s) => s.items)
    .find((i) => i.kind === 'clip' && i.clip.id === clipId)
  if (!item || item.kind !== 'clip') return false

  const draft = updateClipTimestamps(item.clip, startSeconds, endSeconds)
  const validated = validateClipAgainstTranscript(
    {
      sourceId: draft.sourceId,
      startSeconds: draft.startSeconds,
      endSeconds: draft.endSeconds,
      quote: draft.quote,
      reason: draft.reason,
      role: draft.role,
    },
    segments,
  )
  if (!validated.ok) return false

  onUpdateComposition(
    updateClipInComposition(composition, clipId, {
      startSeconds: validated.clip.startSeconds,
      endSeconds: validated.clip.endSeconds,
      quote: validated.clip.quote,
    }),
  )
  return true
}

export function ComposeSelectedEditor({
  composition,
  row,
  transcripts,
  onUpdateComposition,
}: Props) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  const clipData = useMemo(() => {
    if (!row || row.item.kind !== 'clip') return null
    const clip = row.item.clip
    const segments = transcripts[clip.sourceId]?.segments ?? []
    const maxSource = segments.reduce((m, s) => Math.max(m, segmentEnd(s)), 0) || 1
    const quote =
      clip.quote.trim() ||
      transcriptInRange(segments, clip.startSeconds, clip.endSeconds) ||
      clip.reason
    return { clip, segments, maxSource, quote }
  }, [row, transcripts])

  if (!row) {
    return (
      <div className="border border-line bg-paper-2/30 p-6 md:p-8">
        <p className="mono text-[11px] text-ink-soft">Select a scene above to edit.</p>
      </div>
    )
  }

  if (row.item.kind === 'interlude') {
    const interlude = row.item.interlude
    return (
      <div className="border border-line p-5 md:p-8">
        <span className="mono-label text-[10px] text-mint-ink">INSIGHT</span>
        <div className="mt-6 flex flex-col items-center border border-line bg-paper-2/40 px-6 py-10 text-center">
          <AsterismMark size={36} className="text-mint-ink" />
          <p className="mono-label mt-5 text-[10px] text-mint-ink">WHAT EMERGES</p>
          <p className="mt-4 max-w-lg font-serif text-xl leading-relaxed text-ink">
            &ldquo;{interlude.text}&rdquo;
          </p>
        </div>

        <div className="mt-8">
          <p className="mono-label text-[10px] text-ink-soft">DISPLAY DURATION</p>
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                onUpdateComposition(
                  updateInterludeInComposition(composition, interlude.id, {
                    durationSeconds: Math.max(3, interlude.durationSeconds - 1),
                  }),
                )
              }}
              className="mono-label border border-line px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
            >
              −
            </button>
            <span className="mono text-sm text-ink">{interlude.durationSeconds} sec</span>
            <button
              type="button"
              onClick={() => {
                onUpdateComposition(
                  updateInterludeInComposition(composition, interlude.id, {
                    durationSeconds: Math.min(30, interlude.durationSeconds + 1),
                  }),
                )
              }}
              className="mono-label border border-line px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
            >
              +
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!clipData) return null

  const { clip, segments, maxSource, quote } = clipData
  const clipLen = Math.max(1, clip.endSeconds - clip.startSeconds)
  const startPct = (clip.startSeconds / maxSource) * 100
  const widthPct = ((clip.endSeconds - clip.startSeconds) / maxSource) * 100

  function nudgeStart(delta: number) {
    applyClipPatch(
      composition,
      clip.id,
      clip.startSeconds + delta,
      clip.endSeconds,
      segments,
      onUpdateComposition,
    )
  }

  function nudgeEnd(delta: number) {
    applyClipPatch(
      composition,
      clip.id,
      clip.startSeconds,
      clip.endSeconds + delta,
      segments,
      onUpdateComposition,
    )
  }

  function handleRangeChange(edge: 'start' | 'end', value: number) {
    if (edge === 'start') {
      applyClipPatch(composition, clip.id, value, clip.endSeconds, segments, onUpdateComposition)
    } else {
      applyClipPatch(composition, clip.id, clip.startSeconds, value, segments, onUpdateComposition)
    }
  }

  const fullTranscript = transcriptInRange(segments, clip.startSeconds, clip.endSeconds)

  return (
    <div className="border border-line p-5 md:p-8">
      <span className="mono-label text-[10px] text-ink-soft">SELECTED CLIP</span>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <a
            href={youtubeWatchUrl(clip.youtubeId, clip.startSeconds)}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block aspect-video overflow-hidden border border-line bg-paper-2"
          >
            <Image
              src={clipThumbnail(clip.youtubeId, clip.thumbnail)}
              alt=""
              fill
              className="object-cover transition-opacity group-hover:opacity-90"
              sizes="(max-width: 1024px) 100vw, 480px"
              unoptimized
            />
            <span className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors group-hover:bg-ink/10">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-background/90 text-lg text-ink opacity-90">
                ▶
              </span>
            </span>
          </a>

          <p className="mono-label mt-4 text-[10px] text-ink-soft">
            SOURCE {String(clip.voiceIndex).padStart(2, '0')}
          </p>
          <h3 className="mt-1 font-serif text-xl font-medium leading-snug">{clip.title}</h3>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="mono-label text-[10px] text-ink-soft">START</span>
            <span className="mono-label text-[10px] text-ink-soft">END</span>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <span className="mono w-12 shrink-0 text-[11px] text-ink">
              {formatTimestamp(clip.startSeconds)}
            </span>
            <div className="relative h-2 flex-1 rounded-full bg-line">
              <div
                className="absolute top-0 h-full bg-ink"
                style={{ left: `${startPct}%`, width: `${widthPct}%` }}
              />
              <input
                type="range"
                min={0}
                max={maxSource}
                step={0.5}
                value={clip.startSeconds}
                onChange={(e) => handleRangeChange('start', Number(e.target.value))}
                className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                aria-label="Adjust clip start"
              />
              <input
                type="range"
                min={0}
                max={maxSource}
                step={0.5}
                value={clip.endSeconds}
                onChange={(e) => handleRangeChange('end', Number(e.target.value))}
                className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                aria-label="Adjust clip end"
              />
            </div>
            <span className="mono w-12 shrink-0 text-right text-[11px] text-ink">
              {formatTimestamp(clip.endSeconds)}
            </span>
          </div>

          <p className="mono mt-3 text-center text-[11px] text-ink-soft">{Math.round(clipLen)} sec</p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => nudgeStart(-5)}
              className="mono-label border border-line px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
            >
              −5 sec
            </button>
            <button
              type="button"
              onClick={() => nudgeEnd(5)}
              className="mono-label border border-line px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
            >
              +5 sec
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <p className="mono-label text-[10px] text-ink-soft">TRANSCRIPT</p>
        <p className="mt-3 font-serif text-base leading-relaxed text-ink">
          &ldquo;{quote || 'No transcript in this range.'}&rdquo;
        </p>
        {fullTranscript && fullTranscript !== quote && (
          <button
            type="button"
            onClick={() => setTranscriptOpen((v) => !v)}
            className="mono-label mt-4 text-[10px] text-ink-soft hover:text-ink"
          >
            {transcriptOpen ? 'HIDE TRANSCRIPT' : 'VIEW TRANSCRIPT →'}
          </button>
        )}
        {transcriptOpen && fullTranscript && (
          <p className="mt-3 max-h-40 overflow-y-auto font-serif text-sm leading-relaxed text-ink-soft">
            {fullTranscript}
          </p>
        )}
      </div>
    </div>
  )
}
