'use client'

import { useMemo, useState } from 'react'
import { updateClipTimestamps } from '@/lib/compose/render-manifest'
import { validateClipAgainstTranscript } from '@/lib/compose/validate-clips'
import { formatTimestamp } from '@/lib/youtube/timestamp'
import type { CompositionClip } from '@/lib/types/composition'
import type { TranscriptSegment } from '@/lib/youtube/transcript'

type Props = {
  clip: CompositionClip
  segments: TranscriptSegment[]
  open: boolean
  onClose: () => void
  onSave: (clip: CompositionClip) => void
}

function parseTimestampInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed)
  }

  const parts = trimmed.split(':').map((p) => Number(p))
  if (parts.some((p) => Number.isNaN(p))) return null

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }

  return null
}

function segmentEnd(seg: TranscriptSegment): number {
  return seg.start + seg.duration
}

export function ComposeClipEditor({ clip, segments, open, onClose, onSave }: Props) {
  const [startInput, setStartInput] = useState(formatTimestamp(clip.startSeconds))
  const [endInput, setEndInput] = useState(formatTimestamp(clip.endSeconds))
  const [error, setError] = useState<string | null>(null)

  const nearbySegments = useMemo(() => {
    const start = parseTimestampInput(startInput) ?? clip.startSeconds
    return segments
      .filter((seg) => Math.abs(seg.start - start) < 90 || Math.abs(segmentEnd(seg) - start) < 90)
      .slice(0, 8)
  }, [segments, startInput, clip.startSeconds])

  if (!open) return null

  function applySegment(seg: TranscriptSegment, pick: 'start' | 'end') {
    const value = pick === 'start' ? seg.start : segmentEnd(seg)
    const formatted = formatTimestamp(value)
    if (pick === 'start') setStartInput(formatted)
    else setEndInput(formatted)
  }

  function handleSave() {
    const start = parseTimestampInput(startInput)
    const end = parseTimestampInput(endInput)

    if (start === null || end === null) {
      setError('Use seconds (42) or mm:ss (1:30).')
      return
    }

    const draft = updateClipTimestamps(clip, start, end)
    const result = validateClipAgainstTranscript(
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

    if (!result.ok) {
      setError(result.error)
      return
    }

    onSave({
      ...draft,
      startSeconds: result.clip.startSeconds,
      endSeconds: result.clip.endSeconds,
      quote: result.clip.quote,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 md:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clip-editor-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-line bg-background p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <span className="mono-label text-[10px] text-ink-soft">EDIT CLIP</span>
            <h3 id="clip-editor-title" className="mt-2 font-serif text-2xl font-medium">
              {clip.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mono-label border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mono-label text-[10px] text-ink-soft">START</span>
            <input
              value={startInput}
              onChange={(e) => {
                setStartInput(e.target.value)
                setError(null)
              }}
              className="mono mt-2 w-full border border-line bg-transparent p-3 text-sm outline-none focus:border-ink"
              placeholder="0:00 or seconds"
            />
          </label>
          <label className="block">
            <span className="mono-label text-[10px] text-ink-soft">END</span>
            <input
              value={endInput}
              onChange={(e) => {
                setEndInput(e.target.value)
                setError(null)
              }}
              className="mono mt-2 w-full border border-line bg-transparent p-3 text-sm outline-none focus:border-ink"
              placeholder="1:30 or seconds"
            />
          </label>
        </div>

        {error && (
          <p className="mono mt-4 border border-line bg-paper-2 p-3 text-[11px] text-ink-soft">
            {error}
          </p>
        )}

        {nearbySegments.length > 0 && (
          <div className="mt-6">
            <span className="mono-label text-[10px] text-ink-soft">TRANSCRIPT NEAR START</span>
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {nearbySegments.map((seg) => (
                <li key={`${seg.start}-${seg.text.slice(0, 20)}`} className="border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="mono text-[10px] text-ink-soft">
                      {formatTimestamp(seg.start)} → {formatTimestamp(segmentEnd(seg))}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => applySegment(seg, 'start')}
                        className="mono-label border border-line px-2 py-1 text-[9px] hover:bg-ink hover:text-background"
                      >
                        Set start
                      </button>
                      <button
                        type="button"
                        onClick={() => applySegment(seg, 'end')}
                        className="mono-label border border-line px-2 py-1 text-[9px] hover:bg-ink hover:text-background"
                      >
                        Set end
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 font-serif text-sm leading-relaxed text-ink-soft">{seg.text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={handleSave}
            className="mono-label bg-ink px-5 py-3 text-[10px] text-background hover:opacity-90"
          >
            Save timestamps
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mono-label border border-line px-5 py-3 text-[10px] hover:bg-ink hover:text-background"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
