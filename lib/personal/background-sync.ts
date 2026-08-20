import { buildPersonalProfileFromSignals } from '@/lib/personal/personal-insights'
import { shouldAutoSync } from '@/lib/personal/sync-policy'
import {
  getImportedPlaylists,
  getPersonalSignals,
  getYouTubeConnection,
  savePersonalProfile,
} from '@/lib/personal/signals-repository'
import { syncYouTubeSignals } from '@/lib/personal/youtube-sync'

type StorageOptions = { useSupabase?: boolean }

export async function refreshPersonalProfile(userId: string, storage: StorageOptions = {}) {
  const signals = await getPersonalSignals(userId, storage)
  const connection = await getYouTubeConnection(userId, storage)
  const importedPlaylists = await getImportedPlaylists(userId, storage)

  const profile = await buildPersonalProfileFromSignals(
    userId,
    signals,
    !!connection,
    (connection?.last_synced_at as string) ?? null,
    importedPlaylists,
  )

  await savePersonalProfile(userId, profile, storage)
  return profile
}

export function triggerBackgroundSyncIfNeeded(userId: string, storage: StorageOptions = {}): void {
  void (async () => {
    const connection = await getYouTubeConnection(userId, storage)
    if (!connection || !shouldAutoSync(connection.last_synced_at as string | null)) return

    try {
      await syncYouTubeSignals(userId, storage)
      await refreshPersonalProfile(userId, storage)
    } catch (error) {
      console.error('[personal] background sync failed', error)
    }
  })()
}
