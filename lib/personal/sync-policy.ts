export const SYNC_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours
export const SYNC_MAX_USERS_PER_CRON = 15
export const PLAYLIST_MAX_VIDEOS = 50

export function shouldAutoSync(lastSyncedAt: string | null | undefined): boolean {
  if (!lastSyncedAt) return true
  return Date.now() - new Date(lastSyncedAt).getTime() >= SYNC_MIN_INTERVAL_MS
}
