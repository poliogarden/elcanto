const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/

const URL_PATTERNS: RegExp[] = [
  /(?:youtube\.com\/watch\?(?:[^&]+&)*v=)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
]

export type ParsedYouTubeUrl =
  | { ok: true; youtubeId: string; canonicalUrl: string }
  | { ok: false; error: string }

export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (YOUTUBE_ID_PATTERN.test(trimmed)) {
    return trimmed
  }

  let url: URL
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'youtube.com' && host !== 'youtu.be' && host !== 'm.youtube.com') {
    return null
  }

  const full = url.toString()
  for (const pattern of URL_PATTERNS) {
    const match = full.match(pattern)
    if (match?.[1]) return match[1]
  }

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    if (YOUTUBE_ID_PATTERN.test(id)) return id
  }

  return null
}

export function parseYouTubeUrl(input: string): ParsedYouTubeUrl {
  const youtubeId = extractYouTubeId(input)
  if (!youtubeId) {
    return { ok: false, error: 'Invalid YouTube URL. Use watch, youtu.be, or shorts links.' }
  }

  return {
    ok: true,
    youtubeId,
    canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
  }
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatTotalDuration(voices: { durationSeconds?: number }[]): string {
  const totalSeconds = voices.reduce((acc, v) => acc + (v.durationSeconds ?? 0), 0)
  if (totalSeconds === 0) return '—'

  const h = Math.floor(totalSeconds / 3600)
  const m = Math.round((totalSeconds % 3600) / 60)
  if (h === 0) return `${m}M`
  return `${h}H ${String(m).padStart(2, '0')}M`
}
