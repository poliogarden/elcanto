import { parsePlaylistId } from '@/lib/youtube/playlist-url'
import { extractYouTubeId } from '@/lib/youtube/url'

export type ParsedPasteInput =
  | { kind: 'empty' }
  | { kind: 'playlist'; playlistId: string }
  | { kind: 'videos'; videoIds: string[] }

const URL_SPLIT = /[\s,;]+/

/** Detect playlist URL, single video URL, or multiple video URLs in pasted text */
export function parsePasteInput(input: string): ParsedPasteInput {
  const trimmed = input.trim()
  if (!trimmed) return { kind: 'empty' }

  const playlistId = parsePlaylistId(trimmed)
  if (playlistId && !trimmed.includes('\n') && trimmed.split(URL_SPLIT).length <= 1) {
    return { kind: 'playlist', playlistId }
  }

  const parts = trimmed.split(URL_SPLIT).map((p) => p.trim()).filter(Boolean)
  const videoIds: string[] = []

  for (const part of parts) {
    const id = extractYouTubeId(part)
    if (id && !videoIds.includes(id)) videoIds.push(id)
  }

  if (videoIds.length > 0) return { kind: 'videos', videoIds }

  const singlePlaylist = parsePlaylistId(trimmed)
  if (singlePlaylist) return { kind: 'playlist', playlistId: singlePlaylist }

  return { kind: 'empty' }
}
