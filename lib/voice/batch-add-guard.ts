import type { VideoSourceItem } from '@/lib/types/selected-source'
import type { Voice } from '@/lib/types/voice'

const MAX_BATCH_ADD = 20

export type BatchAddErrorCode = 'already_selected' | 'batch_max'

/** Reject batch adds that would auto-select an entire large playlist */
export function validateBatchAdd(
  items: VideoSourceItem[],
  existing: Voice[],
): { ok: true; items: VideoSourceItem[] } | { ok: false; code: BatchAddErrorCode; max?: number } {
  const newItems = items.filter((item) => !existing.some((v) => v.youtubeId === item.videoId))
  if (newItems.length === 0) {
    return { ok: false, code: 'already_selected' }
  }
  if (newItems.length > MAX_BATCH_ADD) {
    return { ok: false, code: 'batch_max', max: MAX_BATCH_ADD }
  }
  return { ok: true, items: newItems }
}

/** @deprecated Use i18n key `source.playlistSelectHint` in UI */
export const PLAYLIST_SELECT_HINT =
  'Select the videos you want — playlists are never added as a whole.'
