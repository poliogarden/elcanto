'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { formatTimestamp } from '@/lib/youtube/timestamp'
import type { CompositionTimelineItem } from '@/lib/types/composition'
import { flattenCompositionTimeline } from '@/lib/types/composition'

type PreviewStep =
  | {
      kind: 'clip'
      youtubeId: string
      startSeconds: number
      endSeconds: number
      label: string
    }
  | { kind: 'interlude'; text: string; durationSeconds: number }

type Props = {
  items: CompositionTimelineItem[]
  sections: Array<{ title: string; items: CompositionTimelineItem[] }>
  open: boolean
  onClose: () => void
}

type YTPlayer = {
  loadVideoById: (args: { videoId: string; startSeconds?: number }) => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  playVideo: () => void
  pauseVideo: () => void
  getCurrentTime: () => number
  destroy: () => void
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          height: string
          width: string
          videoId?: string
          playerVars?: Record<string, number | string>
          events?: { onReady?: () => void; onStateChange?: (event: { data: number }) => void }
        },
      ) => YTPlayer
      PlayerState: { PLAYING: number; ENDED: number; PAUSED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

function buildPreviewSteps(
  sections: Array<{ title: string; items: CompositionTimelineItem[] }>,
): PreviewStep[] {
  const composition = {
    title: '',
    thesis: '',
    conclusion: '',
    totalDurationSeconds: 0,
    sections: sections.map((s, i) => ({
      id: `s${i}`,
      type: 'insight' as const,
      title: s.title,
      summary: '',
      order: i + 1,
      items: s.items,
    })),
  }
  const rows = flattenCompositionTimeline(composition)
  return rows.map((row) =>
    row.item.kind === 'clip'
      ? {
          kind: 'clip' as const,
          youtubeId: row.item.clip.youtubeId,
          startSeconds: row.item.clip.startSeconds,
          endSeconds: row.item.clip.endSeconds,
          label: `SOURCE ${String(row.item.clip.voiceIndex).padStart(2, '0')}`,
        }
      : {
          kind: 'interlude' as const,
          text: row.item.interlude.text,
          durationSeconds: row.item.interlude.durationSeconds,
        },
  )
}

export function ComposePreviewPlayer({ items, sections, open, onClose }: Props) {
  const playerRef = useRef<YTPlayer | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [apiReady, setApiReady] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [interludeRemaining, setInterludeRemaining] = useState<number | null>(null)
  const [interludePlayBlocked, setInterludePlayBlocked] = useState(false)
  const interludeAudioRef = useRef<HTMLAudioElement | null>(null)
  const tickRef = useRef<number | null>(null)

  const steps = buildPreviewSteps(sections.length > 0 ? sections : [{ title: '', items }])
  const current = steps[stepIndex]

  const clearTick = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const advance = useCallback(() => {
    clearTick()
    setInterludeRemaining(null)
    setStepIndex((i) => {
      if (i + 1 >= steps.length) {
        setPlaying(false)
        return i
      }
      return i + 1
    })
  }, [clearTick, steps.length])

  const playClip = useCallback(
    (step: Extract<PreviewStep, { kind: 'clip' }>) => {
      const player = playerRef.current
      if (!player) return
      player.loadVideoById({ videoId: step.youtubeId, startSeconds: step.startSeconds })
      player.playVideo()
      clearTick()
      tickRef.current = window.setInterval(() => {
        const t = player.getCurrentTime()
        if (t >= step.endSeconds - 0.35) {
          advance()
        }
      }, 250)
    },
    [advance, clearTick],
  )

  const playInterlude = useCallback(
    (step: Extract<PreviewStep, { kind: 'interlude' }>) => {
      playerRef.current?.pauseVideo()
      clearTick()
      audioRef.current?.pause()

      const playCountdown = (durationSeconds: number) => {
        setInterludeRemaining(durationSeconds)
        let remaining = durationSeconds
        tickRef.current = window.setInterval(() => {
          remaining -= 1
          setInterludeRemaining(remaining)
          if (remaining <= 0) advance()
        }, 1000)
      }

      setInterludePlayBlocked(false)
      interludeAudioRef.current = null

      void (async () => {
        try {
          const res = await fetch('/api/compose/interlude/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: step.text }),
          })
          if (res.ok) {
            const data = (await res.json()) as {
              audioBase64?: string
              durationSeconds?: number
            }
            if (data.audioBase64) {
              const bytes = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0))
              const blob = new Blob([bytes], { type: 'audio/mpeg' })
              const url = URL.createObjectURL(blob)
              const audio = new Audio(url)
              audioRef.current = audio
              interludeAudioRef.current = audio
              audio.onended = () => {
                URL.revokeObjectURL(url)
                advance()
              }
              try {
                await audio.play()
                playCountdown(data.durationSeconds ?? step.durationSeconds)
                return
              } catch {
                setInterludePlayBlocked(true)
                playCountdown(data.durationSeconds ?? step.durationSeconds)
                return
              }
            }
          }
        } catch {
          // fallback to silent countdown
        }
        playCountdown(step.durationSeconds)
      })()
    },
    [advance, clearTick],
  )

  useEffect(() => {
    if (!open || !apiReady || !playing || !current) return
    if (current.kind === 'clip') playClip(current)
    else playInterlude(current)
    return clearTick
  }, [open, apiReady, playing, stepIndex, current, playClip, playInterlude, clearTick])

  useEffect(() => {
    if (!open) {
      setPlaying(false)
      setStepIndex(0)
      clearTick()
      playerRef.current?.pauseVideo()
    }
  }, [open, clearTick])

  useEffect(() => {
    return () => {
      clearTick()
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [clearTick])

  function initPlayer() {
    if (!window.YT || playerRef.current) return
    playerRef.current = new window.YT.Player('compose-yt-player', {
      height: '360',
      width: '640',
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: () => setApiReady(true),
      },
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4">
      <Script
        src="https://www.youtube.com/iframe_api"
        onLoad={() => {
          if (window.YT?.Player) {
            initPlayer()
            return
          }
          window.onYouTubeIframeAPIReady = initPlayer
        }}
      />
      <div className="w-full max-w-3xl border border-line bg-paper p-5 md:p-8">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-4">
          <span className="mono-label text-[10px] text-ink-soft">PREVIEW COMPOSITION</span>
          <button
            type="button"
            onClick={onClose}
            className="mono-label text-[10px] text-ink hover:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="aspect-video w-full border border-line bg-paper-2">
          <div id="compose-yt-player" className="h-full w-full" />
        </div>

        {current && (
          <div className="mt-4 border-t border-line pt-4">
            {current.kind === 'clip' ? (
              <>
                <p className="mono-label text-[10px] text-ink-soft">{current.label}</p>
                <p className="mono mt-2 text-[11px] text-ink">
                  {formatTimestamp(current.startSeconds)} → {formatTimestamp(current.endSeconds)}
                </p>
              </>
            ) : (
              <>
                <p className="mono-label text-[10px] text-ink-soft">INTERLUDE</p>
                <p className="mt-2 font-serif text-lg leading-relaxed">{current.text}</p>
                {interludeRemaining !== null && (
                  <p className="mono mt-2 text-[11px] text-ink-soft">{interludeRemaining}s</p>
                )}
                {interludePlayBlocked && interludeAudioRef.current && (
                  <button
                    type="button"
                    onClick={() => {
                      void interludeAudioRef.current?.play().then(() => setInterludePlayBlocked(false))
                    }}
                    className="mono-label mt-3 border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
                  >
                    ▶ Play narration
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {!playing ? (
            <button
              type="button"
              onClick={() => {
                setStepIndex(0)
                setPlaying(true)
              }}
              className="mono-label bg-ink px-5 py-3 text-[10px] text-background hover:opacity-90"
            >
              ▶ Preview composition
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPlaying(false)
                clearTick()
                playerRef.current?.pauseVideo()
              }}
              className="mono-label border border-line px-5 py-3 text-[10px] hover:bg-ink hover:text-background"
            >
              Pause
            </button>
          )}
          <span className="mono self-center text-[11px] text-ink-soft">
            {stepIndex + 1} / {steps.length}
          </span>
        </div>
      </div>
    </div>
  )
}
