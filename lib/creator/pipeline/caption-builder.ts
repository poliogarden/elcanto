import type { Scene } from '@/lib/creator/types'

export type CaptionCue = {
  startSec: number
  endSec: number
  text: string
}

export function buildCaptionsFromScenes(scenes: Scene[]): CaptionCue[] {
  let cursor = 0
  const cues: CaptionCue[] = []

  for (const scene of [...scenes].sort((a, b) => a.order - b.order)) {
    const duration = Math.max(1, scene.durationTargetSec)
    cues.push({
      startSec: cursor,
      endSec: cursor + duration,
      text: scene.captionText || scene.scriptText,
    })
    cursor += duration
  }

  return cues
}

export function captionsToSrt(cues: CaptionCue[]): string {
  return cues
    .map((cue, i) => {
      const start = formatSrtTime(cue.startSec)
      const end = formatSrtTime(cue.endSec)
      return `${i + 1}\n${start} --> ${end}\n${cue.text}\n`
    })
    .join('\n')
}

export function captionsToVtt(cues: CaptionCue[]): string {
  const body = cues
    .map((cue) => {
      const start = formatVttTime(cue.startSec)
      const end = formatVttTime(cue.endSec)
      return `${start} --> ${end}\n${cue.text}`
    })
    .join('\n\n')
  return `WEBVTT\n\n${body}\n`
}

function formatSrtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec % 1) * 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`
}

function formatVttTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = (sec % 60).toFixed(3)
  return `${pad(h)}:${pad(m)}:${s.padStart(6, '0')}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
