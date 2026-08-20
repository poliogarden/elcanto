import type { Composition, CompositionClip } from '@/lib/types/composition'

export type RenderManifestClip = {
  id: string
  order: number
  sourceId: string
  voiceIndex: number
  youtubeId: string
  title: string
  channel: string
  watchUrl: string
  startSeconds: number
  endSeconds: number
  durationSeconds: number
  quote: string
  role: string
  sectionTitle: string
  sectionType: string
}

export type RenderManifestInterlude = {
  id: string
  order: number
  text: string
  kind: 'interlude' | 'synthesis'
  durationSeconds: number
  audioUrl?: string
}

export type RenderManifest = {
  version: 1
  compositionId: string
  title: string
  thesis: string
  totalDurationSeconds: number
  clips: RenderManifestClip[]
  interludes: RenderManifestInterlude[]
  attribution: Array<{
    youtubeId: string
    title: string
    channel: string
    watchUrl: string
  }>
}

export function buildRenderManifest(
  compositionId: string,
  composition: Composition,
): RenderManifest {
  const clips: RenderManifestClip[] = []
  const interludes: RenderManifestInterlude[] = []
  const attributionMap = new Map<
    string,
    { youtubeId: string; title: string; channel: string; watchUrl: string }
  >()

  let order = 0
  for (const section of [...composition.sections].sort((a, b) => a.order - b.order)) {
    for (const item of section.items) {
      if (item.kind === 'clip') {
        const clip = item.clip
        const durationSeconds = Math.max(1, clip.endSeconds - clip.startSeconds)
        clips.push({
          id: clip.id,
          order,
          sourceId: clip.sourceId,
          voiceIndex: clip.voiceIndex,
          youtubeId: clip.youtubeId,
          title: clip.title,
          channel: clip.channel,
          watchUrl: `https://www.youtube.com/watch?v=${clip.youtubeId}&t=${Math.floor(clip.startSeconds)}s`,
          startSeconds: clip.startSeconds,
          endSeconds: clip.endSeconds,
          durationSeconds,
          quote: clip.quote,
          role: clip.role,
          sectionTitle: section.title,
          sectionType: section.type,
        })
        attributionMap.set(clip.youtubeId, {
          youtubeId: clip.youtubeId,
          title: clip.title,
          channel: clip.channel,
          watchUrl: `https://www.youtube.com/watch?v=${clip.youtubeId}`,
        })
      } else {
        interludes.push({
          id: item.interlude.id,
          order,
          text: item.interlude.text,
          kind: item.interlude.kind,
          durationSeconds: item.interlude.durationSeconds,
        })
      }
      order += 1
    }
  }

  return {
    version: 1,
    compositionId,
    title: composition.title,
    thesis: composition.thesis,
    totalDurationSeconds: composition.totalDurationSeconds,
    clips,
    interludes,
    attribution: [...attributionMap.values()],
  }
}

export function buildFfmpegConcatScript(manifest: RenderManifest): string {
  const lines = [
    '#!/bin/bash',
    '# elcanto composition render plan',
    '# Requires: yt-dlp (with rights to source), ffmpeg',
    '# Run on Railway worker — NOT on Vercel serverless',
    'set -euo pipefail',
    'WORKDIR="${1:-./render-out}"',
    'mkdir -p "$WORKDIR/clips" "$WORKDIR/out"',
    '',
  ]

  manifest.clips.forEach((clip, i) => {
    const idx = String(i + 1).padStart(2, '0')
    lines.push(
      `# CLIP ${idx} — SOURCE ${String(clip.voiceIndex).padStart(2, '0')} — ${clip.sectionTitle}`,
      `# ${clip.watchUrl}`,
      `# ffmpeg -ss ${clip.startSeconds} -to ${clip.endSeconds} -i "input_${idx}.mp4" -c copy "$WORKDIR/clips/clip_${idx}.mp4"`,
      '',
    )
  })

  if (manifest.interludes.length > 0) {
    lines.push('# Interludes (title cards / TTS) — implement per policy')
    for (const interlude of manifest.interludes) {
      lines.push(`# INTERLUDE ${interlude.order + 1}: "${interlude.text.slice(0, 80)}..." (${interlude.durationSeconds}s)`)
    }
    lines.push('')
  }

  lines.push(
    '# Concat',
    `# ffconcat file: $WORKDIR/concat.txt`,
    `# ffmpeg -f concat -safe 0 -i "$WORKDIR/concat.txt" -c copy "$WORKDIR/out/${manifest.compositionId}.mp4"`,
    '',
    'echo "Render plan ready. Supply licensed source files before running ffmpeg."',
  )

  return lines.join('\n')
}

export function updateClipTimestamps(
  clip: CompositionClip,
  startSeconds: number,
  endSeconds: number,
): CompositionClip {
  const start = Math.max(0, startSeconds)
  const end = Math.max(start + 1, endSeconds)
  return {
    ...clip,
    startSeconds: Math.round(start * 10) / 10,
    endSeconds: Math.round(end * 10) / 10,
  }
}
