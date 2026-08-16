export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export function youtubeWatchUrl(youtubeId: string, seconds: number): string {
  return `https://www.youtube.com/watch?v=${youtubeId}&t=${Math.floor(seconds)}s`
}

export function voiceIndexFromId(voiceId: string): number | null {
  const match = voiceId.match(/^voice-(\d+)$/)
  return match ? Number(match[1]) : null
}

export function voiceIdFromIndex(index: number): string {
  return `voice-${index}`
}
